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
        content: "你是一个专业的知识图谱分析助手。请仔细分析文档内容是否适合生成知识图谱。分析时请考虑以下几点：\n1. 文档中是否包含足够的实体和概念\n2. 这些实体之间是否存在明确的关系\n3. 文档的结构是否清晰，便于提取关系\n4. 如果文档暂时不适合生成知识图谱，请给出改进建议\n5. 如果文档基本适合但需要调整，请说明如何调整以优化知识图谱的生成效果"
      },
      {
        role: "system",
        content: typeof fileContent === 'string' ? fileContent : JSON.stringify(fileContent)
      },
      {
        role: "user",
        content: "请分析这份文档是否适合生成知识图谱，返回一个JSON格式的结果，包含以下字段：\n{\n  \"suitable\": true/false,  // 是否适合生成知识图谱\n  \"reason\": \"详细的分析原因\",  // 为什么适合或不适合\n  \"suggestions\": [  // 改进建议数组\n    \"建议1\",\n    \"建议2\"\n  ],\n  \"potentialEntities\": [  // 已识别的潜在实体\n    \"实体1\",\n    \"实体2\"\n  ],\n  \"potentialRelations\": [  // 已识别的潜在关系\n    \"关系1\",\n    \"关系2\"\n  ]\n}\n只返回JSON格式的结果，不要有任何其他内容。"
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
      console.log('AI返回的原始数据:', resultText);
      
      // 预处理JSON字符串，处理常见的格式问题
      let processedText = resultText;
      
      // 1. 尝试提取JSON部分（如果AI返回了额外的说明文字）
      const jsonMatch = processedText.match(/\{[\s\S]*\}/); 
      if (jsonMatch) {
        processedText = jsonMatch[0];
      }
      
      // 2. 修复未转义的引号和控制字符
      processedText = processedText
        // 修复字符串中未转义的双引号
        .replace(/(["]):([^,\}\]]*?)"([^,\}\]]*?)"([^,\}\]]*?)([,\}\]])/g, '$1:$2\\"$3\\"$4$5')
        // 修复换行符
        .replace(/(["\{\[,])([^"\{\[,]*)\n([^"\}\],]*)([",\}\]])/g, '$1$2\\n$3$4')
        // 修复制表符
        .replace(/(["\{\[,])([^"\{\[,]*)\t([^"\}\],]*)([",\}\]])/g, '$1$2\\t$3$4');
      
      console.log('预处理后的JSON数据:', processedText);
      
      // 3. 尝试解析JSON
      let result;
      try {
        // 首先尝试直接解析
        result = JSON.parse(processedText);
      } catch (initialError) {
        console.warn('标准JSON解析失败，尝试使用容错解析:', initialError);
        
        // 4. 如果标准解析失败，尝试使用更宽松的解析方法
        try {
          // 使用Function构造函数进行更宽松的解析（注意：这在某些环境中可能不安全）
          // 这里我们使用一个安全的替代方案
          
          // 修复常见的JSON格式错误
          processedText = processedText
            // 修复缺少引号的键名
            .replace(/([{,])\s*([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')
            // 修复尾随逗号
            .replace(/,\s*([\}\]])/g, '$1')
            // 修复缺少逗号的地方
            .replace(/"\s*\}\s*"\s*:/g, '",":')
            // 修复未闭合的字符串
            .replace(/"([^"]*)$/g, '"$1"');
          
          console.log('进一步修复后的JSON数据:', processedText);
          result = JSON.parse(processedText);
        } catch (fallbackError) {
          console.error('容错解析也失败:', fallbackError);
          
          // 5. 最后的尝试：构建一个基本的图谱结构
          console.warn('构建基本图谱结构作为后备方案');
          result = {
            nodes: [
              { id: 'error', name: '解析错误', category: 0, value: 60 }
            ],
            links: [],
            categories: [
              { name: '错误' }
            ]
          };
          
          // 尝试从原始文本中提取一些节点
          const nodeMatches = resultText.match(/"name"\s*:\s*"([^"]+)"/g);
          if (nodeMatches && nodeMatches.length > 0) {
            // 至少提取一些节点名称
            const extractedNodes = nodeMatches.slice(0, 10).map((match, index) => {
              const name = match.replace(/"name"\s*:\s*"([^"]+)"/, '$1');
              return {
                id: `extracted-${index}`,
                name: name,
                category: 0,
                value: 40
              };
            });
            
            if (extractedNodes.length > 0) {
              result.nodes = extractedNodes;
              // 添加一些基本连接
              for (let i = 1; i < extractedNodes.length; i++) {
                result.links.push({
                  source: extractedNodes[0].id,
                  target: extractedNodes[i].id,
                  value: 1,
                  name: '关联'
                });
              }
            }
          }
          
          // 记录错误，但返回基本结构
          console.error('使用基本图谱结构作为后备方案');
        }
      }
      
      // 6. 验证结果结构
      if (!result.nodes) result.nodes = [];
      if (!result.links) result.links = [];
      if (!result.categories) result.categories = [{ name: '默认类别' }];
      
      console.log('最终解析的知识图谱数据:', result);
      return result;
    } catch (parseError) {
      console.error('解析AI返回的知识图谱数据失败:', parseError);
      throw new Error('解析知识图谱数据失败: ' + parseError.message);
    }
  } catch (error) {
    console.error('生成知识图谱数据失败:', error);
    throw error;
  }
};