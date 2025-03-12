// src/utils/auth.js

/**
 * 注册工具函数
 * @param {Object} formData - 表单数据
 * @param {string} formData.username - 用户名
 * @param {string} formData.password - 密码
 * @returns {Promise<Object>} - 返回注册结果
 */
export const enroll = async (formData) => {
  try {
    // 调用 UniCloud 云函数
    const result = await uniCloud.callFunction({
      name: 'enroll', // 云函数名称
      data: {
        username: formData.username,
        password: formData.password
      }
    })

    // 返回云函数的结果
    return result.result
  } catch (error) {
    console.error('调用云函数失败:', error)
    return {
      code: 500,
      message: '注册失败，请稍后重试'
    }
  }
}