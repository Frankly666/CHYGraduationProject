/**
 * 聊天服务
 * 封装与聊天相关的业务逻辑，包括普通聊天和文件聊天
 */
import { streamChat } from './kimi_normal';
import { chatWithFile } from './file';
import { createMessage, getMessageList, deleteMessages } from '@/controls/chat-message';
import { getSession, createSession, updateSession, deleteSession } from '@/controls/chat-session';
import { prepareHistoryMessages } from '@/utils/chat-utils';

/**
 * 发送普通聊天消息
 * @param {string} message - 用户消息
 * @param {Array} sessionMessages - 当前会话的消息列表
 * @param {Function} onProgress - 进度回调函数
 * @param {string} sessionId - 会话ID，可选
 * @returns {Promise<Object>} - 包含响应和更新后的消息列表
 */
export const sendChatMessage = async (message, sessionMessages, onProgress, sessionId = null) => {
  try {
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: message,
      time: Date.now()
    };
    
    // 添加到消息列表
    sessionMessages.push(userMessage);
    
    // 保存用户消息到数据库
    if (sessionId) {
      await createMessage(
        sessionId,
        message,
        'user'
      );
    }
    
    // 添加助手消息占位
    const assistantMessageIndex = sessionMessages.length;
    sessionMessages.push({
      role: 'assistant',
      content: '',
      thinking: true,
      time: Date.now()
    });
    
    // 准备历史消息
    const historyMessages = prepareHistoryMessages(sessionMessages);
    
    // 调用AI接口
    const response = await streamChat(message, historyMessages, (data) => {
      if (data.type === 'chunk') {
        // 更新助手消息内容
        sessionMessages[assistantMessageIndex] = {
          role: 'assistant',
          content: data.fullContent,
          thinking: false,
          time: Date.now()
        };
        
        // 调用进度回调
        if (onProgress) {
          onProgress(sessionMessages);
        }
      } else if (data.type === 'error') {
        throw new Error(data.error);
      }
    });
    
    // 保存助手消息到数据库
    if (sessionId) {
      await createMessage(
        sessionId,
        response,
        'assistant'
      );
    }
    
    // 更新会话信息
    if (sessionId) {
      // 获取最后一条消息
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      
      // 更新会话信息
      await updateSession(sessionId, {
        lastMessage: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
        lastRole: lastMessage.role
      });
    }
    
    return {
      response,
      messages: sessionMessages
    };
  } catch (error) {
    console.error('发送消息失败:', error);
    
    // 如果已经添加了思考中的消息，更新为错误消息
    if (sessionMessages.length > 0 && sessionMessages[sessionMessages.length - 1].thinking) {
      const errorMessageIndex = sessionMessages.length - 1;
      sessionMessages[errorMessageIndex] = {
        role: 'assistant',
        content: `抱歉，处理您的请求时出现错误：${error.message}`,
        thinking: false,
        time: Date.now()
      };
      
      // 保存错误消息到数据库
      if (sessionId) {
        await createMessage(
          sessionId,
          `抱歉，处理您的请求时出现错误：${error.message}`,
          'assistant'
        );
      }
    }
    
    throw error;
  }
};

/**
 * 发送文件聊天消息
 * @param {string} message - 用户消息
 * @param {Object} fileContent - 文件内容
 * @param {Array} sessionMessages - 当前会话的消息列表
 * @param {Function} onProgress - 进度回调函数
 * @param {string} sessionId - 会话ID，可选
 * @returns {Promise<Object>} - 包含响应和更新后的消息列表
 */
export const sendFileChatMessage = async (message, fileContent, sessionMessages, onProgress, sessionId = null) => {
  try {
    // 添加用户消息
    const userMessage = {
      role: 'user',
      content: message,
      time: Date.now()
    };
    
    // 添加到消息列表
    sessionMessages.push(userMessage);
    
    // 保存用户消息到数据库
    if (sessionId) {
      await createMessage(
        sessionId,
        message,
        'user'
      );
    }
    
    // 添加助手消息占位
    const assistantMessageIndex = sessionMessages.length;
    sessionMessages.push({
      role: 'assistant',
      content: '',
      thinking: true,
      time: Date.now()
    });
    
    // 准备历史消息
    const historyMessages = prepareHistoryMessages(sessionMessages);
    
    // 确保文件信息完整
    if (!fileContent) {
      throw new Error('文件信息不完整，请重新上传文件');
    }
    
    // 调用文件问答接口
    const response = await chatWithFile(
      fileContent, 
      message,
      (chunk, fullResponse) => {
        // 更新助手消息内容
        sessionMessages[assistantMessageIndex] = {
          role: 'assistant',
          content: fullResponse,
          thinking: false,
          time: Date.now()
        };
        
        // 调用进度回调
        if (onProgress) {
          onProgress(sessionMessages);
        }
      },
      historyMessages
    );
    
    // 保存助手消息到数据库
    if (sessionId) {
      await createMessage(
        sessionId,
        response,
        'assistant'
      );
    }
    
    // 更新会话信息
    if (sessionId) {
      // 获取最后一条消息
      const lastMessage = sessionMessages[sessionMessages.length - 1];
      
      // 更新会话信息
      await updateSession(sessionId, {
        lastMessage: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
        lastRole: lastMessage.role
      });
    }
    
    return {
      response,
      messages: sessionMessages
    };
  } catch (error) {
    console.error('发送文件消息失败:', error);
    
    // 如果已经添加了思考中的消息，更新为错误消息
    if (sessionMessages.length > 0 && sessionMessages[sessionMessages.length - 1].thinking) {
      const errorMessageIndex = sessionMessages.length - 1;
      sessionMessages[errorMessageIndex] = {
        role: 'assistant',
        content: `抱歉，处理您的请求时出现错误：${error.message}`,
        thinking: false,
        time: Date.now()
      };
      
      // 保存错误消息到数据库
      if (sessionId) {
        await createMessage(
          sessionId,
          `抱歉，处理您的请求时出现错误：${error.message}`,
          'assistant'
        );
      }
    }
    
    throw error;
  }
};

/**
 * 创建新会话
 * @param {string} title - 会话标题
 * @param {string} type - 会话类型，默认为'chat'
 * @returns {Promise<Object>} - 创建的会话信息
 */
export const createNewChatSession = async (title, type = 'chat') => {
  try {
    // 创建新会话
    const sessionResult = await createSession(title, type);
    
    // 检查会话ID
    if (!sessionResult || (!sessionResult._id && !sessionResult.id)) {
      throw new Error('创建会话失败：未获取到会话ID');
    }
    
    // 获取会话ID，优先使用_id字段，兼容id字段
    const sessionId = sessionResult._id || sessionResult.id;
    
    return {
      id: sessionId,
      title,
      type,
      time: Date.now(),
      messages: []
    };
  } catch (error) {
    console.error('创建新会话失败:', error);
    throw error;
  }
};

/**
 * 加载会话消息
 * @param {string} sessionId - 会话ID
 * @returns {Promise<Array>} - 会话消息列表
 */
export const loadSessionMessages = async (sessionId) => {
  try {
    // 获取会话消息列表
    const messages = await getMessageList(sessionId);
    
    // 如果没有消息，返回空数组
    if (!messages || messages.length === 0) {
      return [];
    }
    
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      time: msg.createTime || Date.now(),
      thinking: false
    }));
  } catch (error) {
    console.error('加载会话消息失败:', error);
    throw error;
  }
};