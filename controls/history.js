// 获取用户历史记录
export const getUserHistory = async (userId) => {
  console.log('开始获取用户历史记录:', userId)
  try {
    const result = await uniCloud.callFunction({
      name: 'history',
      data: {
        action: 'getUserHistory',
        userId
      }
    })
    console.log('获取历史记录结果:', result)
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '获取历史记录失败')
    }
    return result.result.data
  } catch (error) {
    console.error('获取历史记录失败:', error)
    throw new Error(error.message || '获取历史记录失败')
  }
}

// 保存历史记录
export const saveHistory = async (historyData) => {
  console.log('开始保存历史记录:', historyData)
  try {
    const result = await uniCloud.callFunction({
      name: 'history',
      data: {
        action: 'saveHistory',
        ...historyData
      }
    })
    console.log('保存历史记录结果:', result)
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '保存历史记录失败')
    }
    return result.result.data
  } catch (error) {
    console.error('保存历史记录失败:', error)
    throw new Error(error.message || '保存历史记录失败')
  }
}

// 更新历史记录
export const updateHistory = async (id, updateData) => {
  console.log('开始更新历史记录:', id, updateData)
  try {
    const result = await uniCloud.callFunction({
      name: 'history',
      data: {
        action: 'updateHistory',
        id,
        updateData
      }
    })
    console.log('更新历史记录结果:', result)
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '更新历史记录失败')
    }
    return result.result.data
  } catch (error) {
    console.error('更新历史记录失败:', error)
    throw new Error(error.message || '更新历史记录失败')
  }
}

// 删除历史记录
export const deleteHistory = async (id) => {
  console.log('开始删除历史记录:', id)
  try {
    const result = await uniCloud.callFunction({
      name: 'history',
      data: {
        action: 'deleteHistory',
        id
      }
    })
    console.log('删除历史记录结果:', result)
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '删除历史记录失败')
    }
    return result.result.data
  } catch (error) {
    console.error('删除历史记录失败:', error)
    throw new Error(error.message || '删除历史记录失败')
  }
}

// 获取单个历史记录
export const getHistoryById = async (id) => {
  console.log('开始获取单个历史记录:', id)
  try {
    const result = await uniCloud.callFunction({
      name: 'history',
      data: {
        action: 'getHistoryById',
        id
      }
    })
    console.log('获取单个历史记录结果:', result)
    if (result.result.code !== 200) {
      throw new Error(result.result.message || '获取历史记录失败')
    }
    return result.result.data
  } catch (error) {
    console.error('获取单个历史记录失败:', error)
    throw new Error(error.message || '获取历史记录失败')
  }
} 