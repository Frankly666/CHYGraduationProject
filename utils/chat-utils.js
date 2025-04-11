/**
 * 聊天工具函数
 * 封装与聊天相关的工具函数，用于处理消息格式化、会话管理等
 */

/**
 * 格式化时间戳为可读时间
 * @param {number} timestamp - 时间戳
 * @returns {string} - 格式化后的时间字符串
 */
export const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;
  
  // 如果是今天的消息，只显示时间
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 如果是昨天的消息
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  // 如果是今年的消息
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + 
           date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  
  // 其他情况显示完整日期
  return date.toLocaleDateString('zh-CN') + ' ' + 
         date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

/**
 * 智能生成会话标题
 * @param {string} content - 消息内容
 * @returns {string} - 生成的标题
 */
export const generateTitle = (content) => {
  // 移除多余空格和换行
  const cleanContent = content.trim().replace(/\s+/g, ' ');
  
  // 如果内容很短，直接返回
  if (cleanContent.length <= 20) {
    return cleanContent;
  }
  
  // 尝试找到第一个句号、问号或感叹号
  const sentenceEnd = cleanContent.search(/[。？！.!?]/);
  if (sentenceEnd !== -1) {
    // 提取第一个句子
    let title = cleanContent.substring(0, sentenceEnd + 1);
    // 如果第一个句子还是太长，截取前20个字符
    if (title.length > 20) {
      title = title.substring(0, 20) + '...';
    }
    return title;
  }
  
  // 如果没有找到句子结束符，直接截取前20个字符
  return cleanContent.substring(0, 20) + '...';
};

/**
 * 准备历史消息用于API调用
 * @param {Array} messages - 消息数组
 * @returns {Array} - 处理后的消息数组
 */
export const prepareHistoryMessages = (messages) => {
  return messages
    .filter(msg => 
      msg.role !== 'system' && 
      msg.role !== 'thinking' && 
      msg.content && 
      msg.content.trim() !== '' &&
      !msg.thinking
    )
    .map(msg => ({
      role: msg.role,
      content: msg.content
    }));
};

/**
 * 创建欢迎消息
 * @returns {Object} - 欢迎消息对象
 */
export const createWelcomeMessage = () => {
  return {
    role: 'assistant',
    content: '你好！我是你的AI助手，有什么我可以帮你的吗？',
    time: Date.now()
  };
};

/**
 * 检查用户登录状态
 * @returns {Object} - 包含登录状态、用户名和用户ID的对象
 */
export const checkLoginStatus = () => {
  try {
    console.log('检查登录状态');
    const loginStatus = uni.getStorageSync('isLogIn');
    const username = uni.getStorageSync('username');
    const userId = uni.getStorageSync('userId');
    
    console.log('存储的登录信息:', { loginStatus, username, userId });
    
    if (loginStatus && username && userId) {
      return {
        isLoggedIn: true,
        username,
        userId
      };
    } else {
      return {
        isLoggedIn: false,
        username: '',
        userId: ''
      };
    }
  } catch (error) {
    console.error('检查登录状态时出错:', error);
    return {
      isLoggedIn: false,
      username: '',
      userId: ''
    };
  }
};