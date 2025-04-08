/**
 * 聊天会话控制器
 * 封装与聊天会话相关的云函数调用
 */

// 创建新会话
export const createSession = async (title, type = 'chat') => {
  console.log('创建会话:', { title, type });
  if (!title) {
    throw new Error('缺少会话标题');
  }
  
  const userId = uni.getStorageSync('userId');
  if (!userId) {
    throw new Error('用户未登录');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-session',
      data: {
        action: 'create',
        userId,
        title,
        type
      }
    });
    
    console.log('创建会话结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '创建会话失败');
    }
    
    return result.result.data;
  } catch (error) {
    console.error('创建会话失败:', error);
    throw error;
  }
};

// 获取用户会话列表
export const getSessionList = async () => {
  console.log('获取会话列表');
  const userId = uni.getStorageSync('userId');
  if (!userId) {
    throw new Error('用户未登录');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-session',
      data: {
        action: 'list',
        userId
      }
    });
    
    console.log('获取会话列表结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '获取会话列表失败');
    }
    
    return result.result.data;
  } catch (error) {
    console.error('获取会话列表失败:', error);
    throw error;
  }
};

// 获取单个会话详情
export const getSession = async (sessionId) => {
  console.log('获取会话详情:', sessionId);
  if (!sessionId) {
    throw new Error('缺少会话ID');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-session',
      data: {
        action: 'get',
        sessionId
      }
    });
    
    console.log('获取会话详情结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '获取会话详情失败');
    }
    
    return result.result.data;
  } catch (error) {
    console.error('获取会话详情失败:', error);
    throw error;
  }
};

// 更新会话
export const updateSession = async (sessionId, updateData) => {
  console.log('更新会话:', { sessionId, updateData });
  if (!sessionId || !updateData) {
    throw new Error('缺少必要参数');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-session',
      data: {
        action: 'update',
        sessionId,
        updateData
      }
    });
    
    console.log('更新会话结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '更新会话失败');
    }
    
    return result.result.data;
  } catch (error) {
    console.error('更新会话失败:', error);
    throw error;
  }
};

// 删除会话
export const deleteSession = async (sessionId) => {
  console.log('删除会话:', sessionId);
  if (!sessionId) {
    throw new Error('缺少会话ID');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'chat-session',
      data: {
        action: 'delete',
        sessionId
      }
    });
    
    console.log('删除会话结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '删除会话失败');
    }
    
    return true;
  } catch (error) {
    console.error('删除会话失败:', error);
    throw error;
  }
}; 