'use strict';
const db = uniCloud.database()
const chatMessagesCollection = db.collection('chat_messages')
const chatSessionsCollection = db.collection('chat_sessions')

// 验证角色是否有效
const validateRole = (role) => {
  if (role === 'user' || role === 'human') {
    return 'user';
  } else if (role === 'assistant' || role === 'ai' || role === 'bot') {
    return 'assistant';
  } else {
    console.warn(`未知的角色类型: ${role}，使用默认值 'assistant'`);
    return 'assistant';
  }
};

exports.main = async (event, context) => {
  const { action, sessionId, message, role, userId } = event
  
  try {
    switch (action) {
      case 'create':
        if (!sessionId || !message || !userId) {
          return {
            code: 400,
            message: 'Missing required parameters'
          }
        }
        
        // 验证并标准化角色
        const validRole = validateRole(role);
        
        // 创建新消息，确保保存role字段
        const messageResult = await chatMessagesCollection.add({
          sessionId,
          userId,
          content: message,
          role: validRole, // 使用验证后的角色
          createTime: Date.now()
        })
        
        // 更新会话的最后一条消息
        await chatSessionsCollection.doc(sessionId).update({
          lastMessage: message,
          lastRole: validRole, // 添加保存最后消息的角色
          updateTime: Date.now()
        })
        
        return {
          code: 200,
          message: 'Message created successfully',
          data: { 
            ...messageResult,
            role: validRole, // 返回验证后的角色
            content: message
          }
        }
        
      case 'list':
        if (!sessionId) {
          return {
            code: 400,
            message: 'Missing sessionId'
          }
        }
        
        // 获取会话的所有消息
        const messages = await chatMessagesCollection
          .where({
            sessionId
          })
          .orderBy('createTime', 'asc')
          .get()
        
        // 确保每条消息都有正确的角色
        const validatedMessages = messages.data.map(msg => ({
          ...msg,
          role: validateRole(msg.role)
        }));
        
        return {
          code: 200,
          message: 'Messages retrieved successfully',
          data: validatedMessages
        }
        
      case 'delete':
        if (!sessionId) {
          return {
            code: 400,
            message: 'Missing sessionId'
          }
        }
        
        // 删除会话的所有消息
        await chatMessagesCollection
          .where({
            sessionId
          })
          .remove()
        
        // 重置会话的最后一条消息
        await chatSessionsCollection.doc(sessionId).update({
          lastMessage: '',
          lastRole: '', // 清空最后消息角色
          updateTime: Date.now()
        })
        
        return {
          code: 200,
          message: 'Messages deleted successfully'
        }
        
      default:
        return {
          code: 400,
          message: 'Invalid action'
        }
    }
  } catch (error) {
    console.error('Chat message operation error:', error)
    return {
      code: 500,
      message: error.message || 'Internal server error'
    }
  }
} 