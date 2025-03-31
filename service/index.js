import { streamChat } from './sparkApi.js'

// /**
//  * 简单聊天接口
//  * @param {string} question 用户问题
//  * @param {Function} onMessage 消息回调(content: string, isEnd: boolean)
//  * @param {Object} options 额外参数
//  */
// export const simpleChat = (question, onMessage, options = {}) => {
//   return streamChat(
//     [{ role: 'user', content: question }],
//     onMessage,
//     options
//   )
// }

// /**
//  * 带上下文的聊天接口
//  * @param {Array} messages 完整消息历史
//  * @param {Function} onMessage 消息回调
//  * @param {Object} options 额外参数
//  */
// export const chatWithContext = (messages, onMessage, options = {}) => {
//   return streamChat(messages, onMessage, options)
// }


// service/index.js
export const simpleChat = async (question, messages, onMessage, options = {}) => {
  try {
    const result = await uniCloud.callFunction({
      name: 'spark-api',
      data: {
        question,
				messages,
        options
      }
    });
    
    if (result.result.code === 0) {
      // 模拟流式效果
      const content = result.result.data.content;
      const chunkSize = 3; // 每次显示的字符数
      let displayed = 0;
      
      const timer = setInterval(() => {
        if (displayed < content.length) {
          const chunk = content.slice(displayed, displayed + chunkSize);
          displayed += chunkSize;
          onMessage(chunk, false);
        } else {
          clearInterval(timer);
          onMessage('', true);
        }
      }, 50); // 50ms间隔模拟流式效果
    } else {
      throw new Error(result.result.message);
    }
  } catch (error) {
    throw error;
  }
};