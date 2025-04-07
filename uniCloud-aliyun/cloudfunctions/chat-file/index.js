"use strict";
const db = uniCloud.database();
const userFiles = db.collection("user_files");

exports.main = async (event, context) => {
  const { action, data } = event;
  const { OPENID, UNIONID } = context;

  if (!OPENID) {
    return {
      code: 403,
      msg: "未登录",
    };
  }

  switch (action) {
    case "upload":
      return await uploadFile(OPENID, data);
    case "list":
      return await listFiles(OPENID);
    case "delete":
      return await deleteFile(OPENID, data);
    case "update":
      return await updateFile(OPENID, data);
    default:
      return {
        code: 404,
        msg: "未找到对应的操作",
      };
  }
};

// 上传文件
async function uploadFile(userId, data) {
  const { name, type, size, file_id, url } = data;

  const file = {
    user_id: userId,
    name,
    type,
    size,
    create_time: Date.now(),
    status: "pending",
    file_id,
    url,
  };

  const res = await userFiles.add(file);

  return {
    code: 200,
    data: {
      _id: res.id,
      ...file,
    },
  };
}

// 获取文件列表
async function listFiles(userId) {
  const res = await userFiles
    .where({
      user_id: userId,
    })
    .orderBy("create_time", "desc")
    .get();

  return {
    code: 200,
    data: res.data,
  };
}

// 删除文件
async function deleteFile(userId, data) {
  const { file_id } = data;

  // 删除文件记录
  await userFiles.doc(file_id).remove();

  // 删除云存储中的文件
  try {
    await uniCloud.deleteFile({
      fileList: [file_id],
    });
  } catch (e) {
    console.error("删除云存储文件失败:", e);
  }

  return {
    code: 200,
    msg: "删除成功",
  };
}

// 更新文件状态
async function updateFile(userId, data) {
  const { file_id, status, url } = data;

  const updateData = {
    status,
  };

  if (url) updateData.url = url;

  await userFiles.doc(file_id).update(updateData);

  return {
    code: 200,
    msg: "更新成功",
  };
}
