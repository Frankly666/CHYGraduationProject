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
    // 创建会话记录
    const chatSessionsCollection = db.collection('chat_sessions')
    const now = Date.now()
    
    // 创建一个初始会话
    const sessionResult = await chatSessionsCollection.add({
      user_id: result.id,
      title: '欢迎使用',
      type: 'chat',
      create_time: now,
      update_time: now,
      last_message: '你好！我是你的AI助手，有什么我可以帮你的吗？'
    })
    
    // 创建消息记录
    if (sessionResult.id) {
      const chatMessagesCollection = db.collection('chat_messages')
      
      // 添加欢迎消息
      await chatMessagesCollection.add({
        session_id: sessionResult.id,
        user_id: result.id,
        role: 'assistant',
        content: '你好！我是你的AI助手，有什么我可以帮你的吗？',
        create_time: now
      })
    }
    
    return {
      code: 200,
      message: '注册成功',
      data: {
        userId: result.id
      }
    }
  } else {
    return {
      code: 500,
      message: '注册失败，请稍后重试'
    }
  }
}