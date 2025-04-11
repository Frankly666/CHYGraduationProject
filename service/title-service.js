// 标题生成服务
const MOONSHOT_API_KEY = 'sk-JWuFVaV252ndCTXc3Q8lvkVP7vMomFeySnJxx6bbT1PMoEst';
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

/**
 * 生成会话标题
 * @param {string} userMessage - 用户的第一条消息
 * @returns {Promise<string>} - 返回生成的标题
 */
export const generateTitle = async (userMessage) => {
  try {
    console.log('开始生成会话标题');
    
    // 构建消息数组
    const messages = [
      {
        role: "system",
        content: "你是一个专业的标题生成助手。请根据用户的第一条消息生成一个简短、准确的会话标题。标题应该简明扼要地概括用户的主要意图或问题，长度控制在15个字以内。"
      },
      {
        role: "user",
        content: `请根据这条用户消息生成一个标题：${userMessage}`
      }
    ];
    
    const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "moonshot-v1-32k",
        messages: messages,
        temperature: 0.3
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('生成标题错误:', errorData);
      throw new Error(errorData?.error?.message || '生成标题失败');
    }
    
    const data = await response.json();
    console.log('生成标题成功:', data);
    
    const title = data.choices[0].message.content.trim();
    return title;
  } catch (error) {
    console.error('生成标题失败:', error);
    return '新的会话'; // 发生错误时返回默认标题
  }
};