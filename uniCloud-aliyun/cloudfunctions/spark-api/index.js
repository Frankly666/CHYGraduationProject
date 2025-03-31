'use strict';
const fetch = require('node-fetch');

exports.main = async (event, context) => {
  const SPARK_CONFIG = {
    baseUrl: 'https://spark-api-open.xf-yun.com/v1/chat/completions',
    apiPassword: 'dtYdOHqILkDntsTnfPSS:FHYYBjzLggbTmjjNjYBD'
  };

  try {
    const { question, messages = [], options = {} } = event;
    
    // 构建消息历史
    const chatMessages = messages.length > 0 ? messages : [
      { role: 'user', content: question }
    ];

    const response = await fetch(SPARK_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SPARK_CONFIG.apiPassword}`
      },
      body: JSON.stringify({
        model: 'lite',
        messages: chatMessages,
        stream: false, // 云函数中使用非流式
        ...options
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.code !== 0) {
      throw new Error(data.message || `API错误: ${data.code}`);
    }
    
    return {
      code: 0,
      data: {
        content: data.choices[0]?.message?.content || '',
        isEnd: true
      }
    };
    
  } catch (error) {
    console.error('云函数执行失败:', error);
    return { 
      code: 500, 
      message: error.message 
    };
  }
};