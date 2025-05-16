/**
 * 研究方案控制器
 * 封装与研究方案相关的云函数调用
 */

// 创建研究方案
export const createResearchPlan = async (planData) => {
  console.log('开始创建研究方案...');
  if (!planData) {
    console.error('缺少方案数据');
    throw new Error('缺少方案数据');
  }
  
  // 输出传入的数据大小，用于调试
  console.log('方案数据大小约:', JSON.stringify(planData).length, '字节');
  
  const userId = uni.getStorageSync('userId');
  if (!userId) {
    console.error('用户未登录');
    throw new Error('用户未登录');
  }
  
  try {
    console.log('调用云函数创建研究方案...');
    const result = await uniCloud.callFunction({
      name: 'research-plan-service',
      data: {
        action: 'create',
        userId,
        planData
      }
    });
    
    console.log('云函数返回原始结果:', result);
    
    if (!result || !result.result) {
      console.error('云函数返回结果无效');
      throw new Error('创建研究方案失败: 服务器返回无效');
    }
    
    if (result.result.code !== 200) {
      console.error('创建失败，错误码:', result.result.code, '错误信息:', result.result.message);
      throw new Error(result.result.message || '创建研究方案失败');
    }
    
    // 处理返回的数据
    if (!result.result.data) {
      console.error('云函数返回的结果中缺少data字段');
      
      // 如果没有返回数据，但请求成功，使用传入的数据作为备用
      // 确保至少有一个ID字段
      const fallbackData = {
        ...planData,
        _id: planData.clientId || `fallback_${Date.now()}`
      };
      
      console.log('使用备用数据:', fallbackData);
      return fallbackData;
    }
    
    // 调试输出返回的数据结构
    console.log('返回的方案数据结构:');
    Object.keys(result.result.data).forEach(key => {
      console.log(` - ${key}: ${typeof result.result.data[key]}`);
    });
    
    // 确保返回结果包含完整的方案数据，特别是ID
    if (!result.result.data._id) {
      console.warn('返回数据中缺少_id字段');
      
      // 尝试查找其他可能的ID字段
      if (result.result.data.id) {
        console.log('找到替代ID字段 "id":', result.result.data.id);
        result.result.data._id = result.result.data.id;
      } else if (planData.clientId) {
        console.log('使用客户端生成的ID:', planData.clientId);
        result.result.data._id = planData.clientId;
      } else {
        console.log('生成一个新的临时ID');
        result.result.data._id = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }
    }
    
    // 打印方案ID，用于调试
    console.log('成功创建方案，最终使用的ID:', result.result.data._id);
    
    return result.result.data;
  } catch (error) {
    console.error('创建研究方案出现错误:', error);
    
    // 创建一个带有错误信息的备用对象，包含原始数据和错误
    const errorData = {
      ...planData,
      _id: planData.clientId || `error_${Date.now()}`,
      error: error.message || '未知错误'
    };
    
    console.log('返回带错误信息的备用数据:', errorData);
    throw error;
  }
};

// 从会话创建研究方案
export const createResearchPlanFromSession = async (planData) => {
  console.log('从会话创建研究方案:', planData);
  if (!planData || !planData.sessionId) {
    throw new Error('缺少会话ID或方案数据');
  }
  
  const userId = uni.getStorageSync('userId');
  if (!userId) {
    throw new Error('用户未登录');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'research-plan-service',
      data: {
        action: 'createFromSession',
        userId,
        planData
      }
    });
    
    console.log('从会话创建研究方案结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '从会话创建研究方案失败');
    }
    
    return result.result.data;
  } catch (error) {
    console.error('从会话创建研究方案失败:', error);
    throw error;
  }
};

// 获取研究方案列表
export const getResearchPlanList = async (page = 1, pageSize = 10) => {
  console.log('获取研究方案列表, 页码:', page, '每页数量:', pageSize);
  
  const userId = uni.getStorageSync('userId');
  if (!userId) {
    console.error('用户未登录');
    throw new Error('用户未登录');
  }
  
  try {
    console.log('调用云函数获取研究方案列表...');
    const result = await uniCloud.callFunction({
      name: 'research-plan-service',
      data: {
        action: 'list',
        userId,
        page,
        pageSize
      }
    });
    
    console.log('云函数响应结果:', result);
    
    if (!result || !result.result) {
      console.error('云函数响应无效');
      throw new Error('获取研究方案列表失败: 无效的响应');
    }
    
    if (result.result.code !== 200) {
      console.error('获取研究方案列表失败, 错误码:', result.result.code, '错误信息:', result.result.message);
      throw new Error(result.result.message || '获取研究方案列表失败');
    }
    
    if (!result.result.data) {
      console.error('研究方案列表数据为空');
      // 返回空列表而不是抛出错误
      return {
        list: [],
        total: 0,
        totalPages: 1,
        page: page,
        pageSize: pageSize
      };
    }
    
    console.log('研究方案列表获取成功:', result.result.data);
    return result.result.data;
  } catch (error) {
    console.error('获取研究方案列表失败:', error);
    throw error;
  }
};

// 获取研究方案详情
export const getResearchPlan = async (planId) => {
  console.log('获取研究方案详情, ID:', planId);
  
  if (!planId) {
    console.error('缺少方案ID');
    throw new Error('缺少方案ID');
  }
  
  try {
    console.log('调用云函数获取研究方案详情...');
    const result = await uniCloud.callFunction({
      name: 'research-plan-service',
      data: {
        action: 'get',
        planId
      }
    });
    
    console.log('云函数响应结果:', result);
    
    if (!result || !result.result) {
      console.error('云函数响应无效');
      throw new Error('获取研究方案详情失败: 无效的响应');
    }
    
    if (result.result.code !== 200) {
      console.error('获取研究方案详情失败, 错误码:', result.result.code, '错误信息:', result.result.message);
      throw new Error(result.result.message || '获取研究方案详情失败');
    }
    
    if (!result.result.data) {
      console.error('研究方案数据为空');
      throw new Error('研究方案不存在或已被删除');
    }
    
    console.log('研究方案数据获取成功:', result.result.data);
    return result.result.data;
  } catch (error) {
    console.error('获取研究方案详情失败:', error);
    throw error;
  }
};

// 根据用户ID获取研究方案（不需要plan ID）
export const getResearchPlansByUser = async () => {
  console.log('根据用户ID获取研究方案');
  
  const userId = uni.getStorageSync('userId');
  if (!userId) {
    console.error('用户未登录');
    throw new Error('用户未登录');
  }
  
  try {
    console.log('调用云函数获取用户研究方案...');
    const result = await uniCloud.callFunction({
      name: 'research-plan-service',
      data: {
        action: 'getByUser',
        userId
      }
    });
    
    console.log('云函数响应结果:', result);
    
    if (!result || !result.result) {
      console.error('云函数响应无效');
      throw new Error('获取研究方案失败: 无效的响应');
    }
    
    if (result.result.code !== 200) {
      console.error('获取研究方案失败, 错误码:', result.result.code, '错误信息:', result.result.message);
      throw new Error(result.result.message || '获取研究方案失败');
    }
    
    if (!result.result.data || result.result.data.length === 0) {
      console.log('用户没有研究方案');
      return [];
    }
    
    console.log('用户研究方案获取成功:', result.result.data);
    return result.result.data;
  } catch (error) {
    console.error('获取用户研究方案失败:', error);
    throw error;
  }
};

// 更新研究方案
export const updateResearchPlan = async (planId, planData) => {
  console.log('更新研究方案:', { planId, planData });
  if (!planId || !planData) {
    throw new Error('缺少必要参数');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'research-plan-service',
      data: {
        action: 'update',
        planId,
        planData
      }
    });
    
    console.log('更新研究方案结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '更新研究方案失败');
    }
    
    return result.result.data;
  } catch (error) {
    console.error('更新研究方案失败:', error);
    throw error;
  }
};

// 删除研究方案
export const deleteResearchPlan = async (planId) => {
  console.log('删除研究方案:', planId);
  if (!planId) {
    throw new Error('缺少方案ID');
  }
  
  try {
    const result = await uniCloud.callFunction({
      name: 'research-plan-service',
      data: {
        action: 'delete',
        planId
      }
    });
    
    console.log('删除研究方案结果:', result);
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '删除研究方案失败');
    }
    
    return true;
  } catch (error) {
    console.error('删除研究方案失败:', error);
    throw error;
  }
}; 