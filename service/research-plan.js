// 研究方案生成服务
const MOONSHOT_API_KEY = 'sk-JWuFVaV252ndCTXc3Q8lvkVP7vMomFeySnJxx6bbT1PMoEst'; // 使用与其他服务相同的API密钥
const MOONSHOT_BASE_URL = 'https://api.moonshot.cn/v1';

/**
 * 生成研究方案框架
 * @param {Object} params - 生成参数
 * @param {String} params.topic - 研究主题
 * @param {String} params.objective - 研究目标
 * @param {Array} params.keywords - 关键词列表
 * @param {String} params.templateType - 模板类型 (如: 'experimental', 'survey', 'case-study')
 * @returns {Promise<Object>} - 返回研究方案框架
 */
export const generateResearchPlanFramework = async (params) => {
  try {
    console.log('开始生成研究方案框架，参数:', JSON.stringify(params));
    
    if (!params.topic || !params.objective || !params.keywords || params.keywords.length === 0) {
      console.error('生成研究方案框架参数不完整:', params);
      throw new Error('参数不完整，请确保填写了研究主题、目标和至少一个关键词');
    }
    
    // 构建消息数组
    const messages = [
      {
        role: "system",
        content: `你是一个专业的教育研究方案生成助手。请基于用户提供的研究主题、目标和关键词，
生成一个科学合理的研究方案框架。框架应包括以下部分：
1. 研究背景与意义
2. 研究目标和问题
3. 文献综述概要
4. 研究方法选择
5. 数据收集方案
6. 数据分析方法
7. 预期研究成果
8. I实施计划和时间表

请确保研究方案框架符合学术规范，并具有可操作性。根据研究主题和目标的特点，调整框架内容。`
      },
      {
        role: "user",
        content: `请根据以下信息生成教育研究方案框架：
研究主题：${params.topic}
研究目标：${params.objective}
关键词：${params.keywords.join('、')}
方案类型：${params.templateType}

请仅生成框架结构，不需要详细内容。返回JSON格式，包含每个章节的标题和简短说明。`
      }
    ];
    
    console.log('准备发送API请求...');
    
    const requestBody = {
      model: "moonshot-v1-32k",
      messages: messages,
      temperature: 0.3
    };
    
    console.log('请求体:', JSON.stringify(requestBody));
    
    try {
      const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API响应错误:', {
          status: response.status,
          statusText: response.statusText,
          responseText: errorText
        });
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText || '未知错误' } };
        }
        
        throw new Error(errorData?.error?.message || `API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('生成研究方案框架成功, 状态:', response.status);
      
      // 解析AI返回的结果
      try {
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
          console.error('API返回结果格式不正确:', data);
          throw new Error('API返回结果格式不正确');
        }
        
        const resultText = data.choices[0].message.content;
        console.log('AI返回的原始数据长度:', resultText.length, '字符');
        
        // 尝试提取JSON部分
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        const processedText = jsonMatch ? jsonMatch[0] : resultText;
        
        console.log('提取的JSON文本:', processedText.substring(0, 100) + '...');
        
        try {
          const result = JSON.parse(processedText);
          console.log('解析成功，包含章节数:', Object.keys(result).length);
          return result;
        } catch (jsonError) {
          console.error('JSON解析失败，尝试包装为有效JSON格式');
          
          // 如果解析失败，尝试创建一个简单的框架对象
          return {
            error: null,
            section1: {
              title: "研究背景与意义",
              description: "描述研究的背景、意义和现实需求。"
            },
            section2: {
              title: "研究目标和问题",
              description: "明确研究目标和待解决的主要问题。"
            },
            section3: {
              title: "文献综述",
              description: "相关研究文献和理论基础的概述。"
            },
            section4: {
              title: "研究方法",
              description: "研究采用的方法和步骤。"
            },
            section5: {
              title: "数据收集方案",
              description: "数据收集的方式、工具和过程。"
            },
            section6: {
              title: "数据分析方法",
              description: "数据处理和分析的方法。"
            },
            section7: {
              title: "预期研究成果",
              description: "研究可能产生的成果和价值。"
            },
            section8: {
              title: "实施计划",
              description: "研究的具体实施计划和时间表。"
            },
            rawContent: resultText  // 保存原始内容供参考
          };
        }
      } catch (parseError) {
        console.error('解析AI返回结果失败:', parseError);
        return { 
          error: '解析返回结果失败', 
          rawContent: data.choices[0].message.content,
          section1: {
            title: "研究背景与意义",
            description: "描述研究的背景、意义和现实需求。"
          },
          section2: {
            title: "研究目标和问题",
            description: "明确研究目标和待解决的主要问题。"
          }
        };
      }
    } catch (fetchError) {
      console.error('API请求错误:', fetchError);
      // 返回默认框架避免完全失败
      return {
        error: `API请求错误: ${fetchError.message}`,
        section1: {
          title: "研究背景与意义",
          description: "描述研究的背景、意义和现实需求。"
        },
        section2: {
          title: "研究目标和问题",
          description: "明确研究目标和待解决的主要问题。"
        }
      };
    }
  } catch (error) {
    console.error('生成研究方案框架失败:', error);
    // 返回默认框架避免完全失败
    return {
      error: `生成框架失败: ${error.message}`,
      section1: {
        title: "研究背景与意义",
        description: "描述研究的背景、意义和现实需求。"
      },
      section2: {
        title: "研究目标和问题", 
        description: "明确研究目标和待解决的主要问题。"
      }
    };
  }
};

/**
 * 根据框架填充研究方案内容
 * @param {Object} framework - 研究方案框架
 * @param {Object} params - 其他参数，包括知识图谱数据等
 * @param {Object} graphData - 可选的知识图谱数据
 * @returns {Promise<Object>} - 返回完整的研究方案
 */
export const fillResearchPlanContent = async (framework, params, graphData = null) => {
  try {
    console.log('开始填充研究方案内容');
    
    // 构建消息数组
    const messages = [
      {
        role: "system",
        content: `你是一个专业的教育研究方案生成助手。现在用户提供了一个研究方案框架，请基于这个框架和相关知识，
填充生成一个完整的教育研究方案。内容应包括详细的研究方法、实施步骤、数据分析方法等。请确保内容科学合理，
符合教育研究的规范，并具有可操作性。`
      },
      {
        role: "user",
        content: `请根据以下框架和信息，生成完整的教育研究方案：
研究主题：${params.topic}
研究目标：${params.objective}
关键词：${params.keywords.join('、')}

研究方案框架：
${JSON.stringify(framework, null, 2)}

${graphData ? `相关知识图谱数据：${JSON.stringify(graphData, null, 2)}` : ''}

请为每个章节填充具体内容，内容应科学合理，详细可行。返回完整的研究方案，格式为Markdown。`
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
        temperature: 0.4
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('填充研究方案内容错误:', errorData);
      throw new Error(errorData?.error?.message || '填充研究方案内容失败');
    }
    
    const data = await response.json();
    console.log('填充研究方案内容成功');
    
    return {
      content: data.choices[0].message.content,
      framework: framework
    };
  } catch (error) {
    console.error('填充研究方案内容失败:', error);
    throw error;
  }
};

/**
 * 优化研究方案
 * @param {String} content - 研究方案内容
 * @param {Object} params - 优化参数
 * @param {String} params.focus - 优化重点，如'methodology', 'literature', 'feasibility'等
 * @returns {Promise<String>} - 返回优化后的研究方案
 */
export const optimizeResearchPlan = async (content, params) => {
  try {
    console.log('开始优化研究方案:', params);
    
    // 构建消息数组
    const messages = [
      {
        role: "system",
        content: `你是一个专业的教育研究方案优化助手。请根据用户提供的研究方案内容和优化重点，
对研究方案进行优化和改进。优化应该保持方案的整体结构，同时提升内容的科学性、可行性和创新性。`
      },
      {
        role: "user",
        content: `请优化以下研究方案，重点关注${params.focus}方面：

${content}

请在保持原方案结构的基础上，提高方案的质量。返回完整的优化后方案，格式为Markdown。`
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
      console.error('优化研究方案错误:', errorData);
      throw new Error(errorData?.error?.message || '优化研究方案失败');
    }
    
    const data = await response.json();
    console.log('优化研究方案成功');
    
    return data.choices[0].message.content;
  } catch (error) {
    console.error('优化研究方案失败:', error);
    throw error;
  }
}; 