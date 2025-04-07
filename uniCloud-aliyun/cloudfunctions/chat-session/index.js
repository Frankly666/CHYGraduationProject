"use strict";
const db = uniCloud.database();
const chatSessions = db.collection("chat_sessions");

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
    case "create":
      return await createSession(OPENID, data);
    case "list":
      return await listSessions(OPENID);
    case "delete":
      return await deleteSession(OPENID, data);
    case "update":
      return await updateSession(OPENID, data);
    default:
      return {
        code: 404,
        msg: "未找到对应的操作",
      };
  }
};

// 创建会话
async function createSession(userId, data) {
  const { title, type } = data;

  const session = {
    user_id: userId,
    title: title || "新对话",
    type: type || "chat",
    create_time: Date.now(),
    update_time: Date.now(),
    last_message: "",
  };

  const res = await chatSessions.add(session);

  return {
    code: 200,
    data: {
      _id: res.id,
      ...session,
    },
  };
}

// 获取会话列表
async function listSessions(userId) {
  const res = await chatSessions
    .where({
      user_id: userId,
    })
    .orderBy("update_time", "desc")
    .get();

  return {
    code: 200,
    data: res.data,
  };
}

// 删除会话
async function deleteSession(userId, data) {
  const { session_id } = data;

  // 删除会话
  await chatSessions.doc(session_id).remove();

  // 删除相关消息
  const chatMessages = db.collection("chat_messages");
  await chatMessages
    .where({
      session_id: session_id,
    })
    .remove();

  return {
    code: 200,
    msg: "删除成功",
  };
}

// 更新会话
async function updateSession(userId, data) {
  const { session_id, title, last_message } = data;

  const updateData = {
    update_time: Date.now(),
  };

  if (title) updateData.title = title;
  if (last_message) updateData.last_message = last_message;

  await chatSessions.doc(session_id).update(updateData);

  return {
    code: 200,
    msg: "更新成功",
  };
}
