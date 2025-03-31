// 封装云函数调用
const cloudStreamChat = async (params, onProgress) => {
  let receivedData = '';
  
  // 模拟流式效果
  const timer = setInterval(async () => {
    if (receivedData) {
      onProgress({ content: receivedData, isEnd: false });
      receivedData = ''; // 清空已接收数据
    }
  }, 100);

  try {
    const result = await uniCloud.callFunction({
      name: 'spark-api',
      data: params
    });
		console.log("结果:", result)
    
    clearInterval(timer);
		
    onProgress({ content: result.result.data?.content, isEnd: true });
    
  } catch (error) {
    clearInterval(timer);
    throw error;
  }
};

// 简单聊天接口
export const simpleChat = (question, onMessage, options = {}) => {
  return cloudStreamChat({
    type: 'simple',
    question,
    options
  }, onMessage);
};

// 带上下文的聊天接口 
export const chatWithContext = (messages, onMessage, options = {}) => {
  return cloudStreamChat({
    type: 'context',
    messages,
    options
  }, onMessage);
};