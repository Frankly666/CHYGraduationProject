'use strict';
const OpenAI = require('openai');

exports.main = async (event, context) => {
    // 安全提示：务必通过云函数环境变量设置API密钥
    const API_KEY = 'sk-Sr99JYdMQI16eVs7e1CFlgc8QdS83Q8p1lVjBk6BPwr9zK1Y'; // 需在uniCloud控制台设置

    // 参数校验
    if (!event.prompt) {
        return { code: 400, msg: '缺少必要参数: prompt' };
    }

    try {
        // 初始化客户端
        const client = new OpenAI({
            apiKey: API_KEY,
            baseURL: "https://api.moonshot.cn/v1",
        });

        // 初始化对话历史（支持客户端传递历史记录）
        let history = event.history || [
            {
                role: "system",
                content: "你是 Kimi，由 Moonshot AI 提供的人工智能助手...（同前）"
            }
        ];

        // API调用配置
        const completion = await client.chat.completions.create({
            model: "moonshot-v1-8k",
            messages: history,
            temperature: 0.3,
            max_tokens: 1024,
        });

        // 获取助手回复
        const assistantMessage = completion.choices[0].message;
				assistantMessage.time = Date.now();
				console.log(assistantMessage)
        history.push(assistantMessage);

        // 返回结构化数据
        return {
            code: 200,
            data: {
                reply: assistantMessage.content,
                history: history, // 返回更新后的历史记录
                usage: completion.usage // 返回token消耗信息
            }
        };

    } catch (error) {
        // 错误处理
        console.error('Kimi API Error:', error);
        return {
            code: 500,
            msg: 'AI服务暂不可用',
            error: error.message
        };
    }
};