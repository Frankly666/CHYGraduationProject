/**
 * 聊天消息控制器
 * 封装与聊天消息相关的云函数调用
 */

// 验证消息角色是否有效
const validateRole = (role) => {
  // 标准化角色值
  if (role === 'user' || role === 'human') {
    return 'user';
  } else if (role === 'assistant' || role === 'ai' || role === 'bot') {
    return 'assistant';
  } else {
    console.warn(`未知的角色类型: ${role}，使用默认值 'assistant'`);
    return 'assistant';
  }
};

// 创建新消息
export const createMessage = async (sessionId, content, role) => {
  console.log('创建消息:', { sessionId, content, role });
  if (!sessionId || !content) {
    throw new Error('缺少必要参数');
  }
  
  // 验证角色
  const validRole = validateRole(role);
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-message',
      data: {
        action: 'create',
        sessionId,
        message: content,
        role: validRole,
        userId: uni.getStorageSync('userId')
      }
    });
    
    console.log('创建消息结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '创建消息失败');
    }
    
    return result.result.data;
  } catch (error) {
    console.error('创建消息失败:', error);
    throw error;
  }
};

// 获取会话消息列表
export const getMessageList = async (sessionId) => {
  console.log('获取消息列表:', sessionId);
  if (!sessionId) {
    throw new Error('缺少会话ID');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-message',
      data: {
        action: 'list',
        sessionId
      }
    });
    
    console.log('获取消息列表结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '获取消息列表失败');
    }
    
    // 确保每条消息都有role属性，并且是有效的角色
    const messages = result.result.data.map(msg => ({
      ...msg,
      role: validateRole(msg.role)
    }));
    
    return messages;
  } catch (error) {
    console.error('获取消息列表失败:', error);
    throw error;
  }
};

// 删除会话消息
export const deleteMessages = async (sessionId) => {
  console.log('删除消息:', sessionId);
  if (!sessionId) {
    throw new Error('缺少会话ID');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-message',
      data: {
        action: 'delete',
        sessionId
      }
    });
    
    console.log('删除消息结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '删除消息失败');
    }
    
    return true;
  } catch (error) {
    console.error('删除消息失败:', error);
    throw error;
  }
}; 