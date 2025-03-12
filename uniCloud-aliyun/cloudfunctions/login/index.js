// uniCloud/cloudfunctions/login/index.js

'use strict'
const db = uniCloud.database()
const crypto = require('crypto') // 引入 crypto

// 验证密码函数
function validatePassword(inputPassword, storedSalt, storedHash) {
  const hash = crypto
    .pbkdf2Sync(inputPassword, storedSalt, 1000, 64, 'sha256') // 使用相同的 salt 和参数加密
    .toString('hex')
  return hash === storedHash // 比较加密结果
}

exports.main = async (event, context) => {
  const { username, password } = event

  // 查询用户表
  const userCollection = db.collection('user')
  const user = await userCollection.where({
    username: username
  }).get()

  // 判断用户是否存在
  if (user.data.length === 0) {
    return {
      code: 401,
      message: '账号或密码错误'
    }
  }

  // 验证密码
  const isValidPassword = validatePassword(
    password,
    user.data[0].salt,
    user.data[0].password
  )
  if (!isValidPassword) {
    return {
      code: 401,
      message: '账号或密码错误'
    }
  }

  // 返回登录成功信息（包含加密密码）
  return {
    code: 200,
    message: '登录成功',
    data: {
      username: user.data[0].username,
      encryptedPassword: user.data[0].password, // 返回加密后的密码
      salt: user.data[0].salt // 返回 salt
    }
  }
}