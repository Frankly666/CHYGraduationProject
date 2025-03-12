// uniCloud/cloudfunctions/enroll/index.js

'use strict'
const db = uniCloud.database()
const crypto = require('crypto') // 引入 crypto

// 加密函数
function encryptPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex') // 生成随机 salt
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, 'sha256') // 使用 pbkdf2 加密
    .toString('hex')
  return { salt, hash } // 返回 salt 和加密后的密码
}

exports.main = async (event, context) => {
  const { username, password } = event

  // 检查用户名是否已存在
  const userCollection = db.collection('user')
  const user = await userCollection.where({
    username: username
  }).get()

  if (user.data.length > 0) {
    return {
      code: 400,
      message: '用户名已存在，请使用其他用户名'
    }
  }

  // 对密码进行加密
  const { salt, hash } = encryptPassword(password)

  // 插入新用户
  const result = await userCollection.add({
    username: username,
    salt: salt, // 存储 salt
    password: hash, // 存储加密后的密码
    createdAt: new Date().toISOString()
  })

  if (result.id) {
    return {
      code: 200,
      message: '注册成功'
    }
  } else {
    return {
      code: 500,
      message: '注册失败，请稍后重试'
    }
  }
}