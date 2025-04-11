// 文件上传和内容抽取服务
const MOONSHOT_API_KEY = 'sk-JWuFVaV252ndCTXc3Q8lvkVP7vMomFeySnJxx6bbT1PMoEst'; // 需要替换为实际的API密钥
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

// 上传文件
export const uploadFile = async (file) => {
  try {
    console.log('开始上传文件:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'file-extract');
    
    const response = await fetch(`${MOONSHOT_BASE_URL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`
      },
      body: formData
    });
    
    console.log('文件上传响应状态:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('文件上传错误:', errorData);
      throw new Error(errorData?.error?.message || '文件上传失败');
    }
    
    const data = await response.json();
    console.log('文件上传成功:', data);
    return data;
  } catch (error) {
    console.error('文件上传失败:', error);
    throw error;
  }
};

// 获取文件内容
export const getFileContent = async (fileId) => {
  try {
    console.log('获取文件内容:', fileId);
    
    const response = await fetch(`${MOONSHOT_BASE_URL}/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`
      }
    });
    
    console.log('获取文件内容响应状态:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('获取文件内容错误:', errorData);
      throw new Error(errorData?.error?.message || '获取文件内容失败');
    }
    
    const data = await response.json();
    console.log('获取文件内容成功:', data);
    return data;
  } catch (error) {
    console.error('获取文件内容失败:', error);
    throw error;
  }
};

// 文件问答
export const chatWithFile = async (fileContent, question, onProgress, history = []) => {
  try {
    console.log('开始文件问答:', question);
    console.log('历史消息:', history);
    
    // 构建消息数组，包含系统消息、文件内容、历史消息和当前问题
    const messages = [
      {
        role: "system",
        content: "你是一个专业的文档分析助手，擅长从文档中提取结构化知识和关系。在回答问题时，请注意：\n1. 尽可能从文档中提取实体、概念和它们之间的关系\n2. 使用清晰的层次结构组织信息\n3. 突出关键概念之间的联系\n4. 保持回答的逻辑性和连贯性\n这样的分析方式将有助于后续生成知识图谱。"
      },
      {
        role: "system",
        content: typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent)
      }
    ];
    
    // 添加历史消息
    if (history && history.length > 0) {
      // 过滤掉系统消息，只保留用户和助手的对话
      const filteredHistory = history.filter(msg => 
        msg.role !== 'system' && 
        msg.content && 
        msg.content.trim() !== ''
      );
      
      // 将历史消息添加到消息数组中
      messages.push(...filteredHistory);
    }
    
    // 添加当前问题
    messages.push({
      role: "user",
      content: question
    });
    
    console.log('发送的消息:', messages);
    
    const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "moonshot-v1-32k",
        messages: messages,
        temperature: 0.3,
        stream: true // 启用流式响应
      })
    });
    
    console.log('文件问答响应状态:', response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('文件问答错误:', errorData);
      throw new Error(errorData?.error?.message || '文件问答失败');
    }
    
    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // 解码二进制数据
      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;
      
      // 处理缓冲区中的完整行
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行
      
      for (const line of lines) {
        if (line.trim() === '') continue;
        if (line.trim() === 'data: [DONE]') continue;
        
        try {
          const data = JSON.parse(line.replace('data: ', ''));
          if (data.choices && data.choices[0] && data.choices[0].delta && data.choices[0].delta.content) {
            const content = data.choices[0].delta.content;
            fullResponse += content;
            
            // 调用进度回调函数
            if (onProgress) {
              onProgress(content, fullResponse);
            }
          }
        } catch (e) {
          console.error('解析流数据失败:', e, line);
        }
      }
    }
    
    console.log('文件问答成功，完整响应:', fullResponse);
    return fullResponse;
  } catch (error) {
    console.error('文件问答失败:', error);
    throw error;
  }
};