// 知识图谱服务
const MOONSHOT_API_KEY = 'sk-JWuFVaV252ndCTXc3Q8lvkVP7vMomFeySnJxx6bbT1PMoEst'; // 与file.js中相同的API密钥
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

/**
 * 判断文件是否适合生成知识图谱
 * @param {Object} fileContent - 文件内容
 * @returns {Promise<Object>} - 返回判断结果，包含是否适合和原因
 */
export const checkFileForKnowledgeGraph = async (fileContent) => {
  try {
    console.log('开始判断文件是否适合生成知识图谱');
    
    // 构建消息数组
    const messages = [
      {
        role: "system",
        content: "你是一个专业的知识图谱分析助手。你需要判断给定的文档内容是否适合生成知识图谱。适合生成知识图谱的文档通常包含多个实体和它们之间的关系，例如学术论文、研究报告、教材等。请分析文档内容并给出判断结果。"
      },
      {
        role: "system",
        content: typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent)
      },
      {
        role: "user",
        content: "请分析这份文档是否适合生成知识图谱，只需回答一个JSON格式的结果，包含以下字段：{\"suitable\": true/false, \"reason\": \"原因说明\"}。不要有任何其他内容。"
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
      console.error('判断文件是否适合生成知识图谱错误:', errorData);
      throw new Error(errorData?.error?.message || '判断文件是否适合生成知识图谱失败');
    }
    
    const data = await response.json();
    console.log('判断文件是否适合生成知识图谱成功:', data);
    
    // 解析AI返回的JSON结果
    try {
      const resultText = data.choices[0].message.content;
      const result = JSON.parse(resultText);
      return result;
    } catch (parseError) {
      console.error('解析AI返回结果失败:', parseError);
      return { suitable: false, reason: '无法解析AI返回结果' };
    }
  } catch (error) {
    console.error('判断文件是否适合生成知识图谱失败:', error);
    return { suitable: false, reason: error.message || '判断失败' };
  }
};

/**
 * 生成知识图谱数据
 * @param {Object} fileContent - 文件内容
 * @returns {Promise<Object>} - 返回知识图谱数据
 */
export const generateKnowledgeGraph = async (fileContent) => {
  try {
    console.log('开始生成知识图谱数据');
    
    // 构建消息数组
    const messages = [
      {
        role: "system",
        content: "你是一个专业的知识图谱生成助手。请根据给定的文档内容生成知识图谱数据。知识图谱应包含文档中的关键实体和它们之间的关系。请确保生成的数据符合ECharts图表所需的格式。"
      },
      {
        role: "system",
        content: typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent)
      },
      {
        role: "user",
        content: `请根据文档内容生成知识图谱数据，返回格式必须是一个JSON对象，严格遵循以下格式规范：
{
  "nodes": [
    { 
      "id": "实体ID", // 必须唯一
      "name": "实体名称", // 显示的名称
      "category": 0, // 类别索引，对应categories数组
      "value": 60, // 节点大小/重要性，范围建议10-100
      "symbolSize": 50, // 可选，节点大小，如不提供则根据value自动计算
      "itemStyle": { // 可选，节点样式
        "color": "#4992ff" // 可选，节点颜色
      }
    },
    // 更多节点...
  ],
  "links": [
    { 
      "source": "源实体ID", // 必须是nodes中已定义的id
      "target": "目标实体ID", // 必须是nodes中已定义的id
      "value": 3, // 关系强度，范围建议1-10
      "name": "关系名称", // 关系描述
      "lineStyle": { // 可选，线条样式
        "width": 2, // 可选，线条宽度
        "curveness": 0.2 // 可选，曲度，0-1之间
      }
    },
    // 更多关系...
  ],
  "categories": [
    { 
      "name": "类别名称", // 类别显示名称
      "itemStyle": { // 可选，类别样式
        "color": "#4992ff" // 可选，类别颜色
      }
    },
    // 更多类别...
  ]
}

请确保生成的数据符合ECharts图表所需的格式，不要有任何其他内容。`
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
      console.error('生成知识图谱数据错误:', errorData);
      throw new Error(errorData?.error?.message || '生成知识图谱数据失败');
    }
    
    const data = await response.json();
    console.log('生成知识图谱数据成功');
    
    // 解析AI返回的JSON结果
    try {
      const resultText = data.choices[0].message.content;
      const result = JSON.parse(resultText);
      return result;
    } catch (parseError) {
      console.error('解析AI返回的知识图谱数据失败:', parseError);
      throw new Error('解析知识图谱数据失败');
    }
  } catch (error) {
    console.error('生成知识图谱数据失败:', error);
    throw error;
  }
};