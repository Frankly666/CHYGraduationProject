// service/moonshot.js
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: "sk-JWuFVaV252ndCTXc3Q8lvkVP7vMomFeySnJxx6bbT1PMoEst",
    baseURL: "https://api.moonshot.cn/v1",
    dangerouslyAllowBrowser: true
});

// 系统提示词
const SYSTEM_PROMPT = `你是一个专业的教育研究助手，专注于帮助用户进行教育研究和方案设计。
你的主要职责包括：
1. 分析教育研究数据和文献
2. 提供研究方法和建议
3. 协助设计研究方案
4. 解答教育研究相关问题

请保持专业、客观的态度，并确保回答准确、有深度。`;

// 重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// 重试函数
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function streamChat(prompt, history = [], onData) {
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
        try {
            // 构建消息历史
            const messages = [
                { role: "system", content: SYSTEM_PROMPT },
                ...history,
                { role: "user", content: prompt }
            ];

            console.log('Sending request to AI with messages:', messages);

            // 调用API
            const stream = await client.chat.completions.create({
                model: "moonshot-v1-8k",
                messages: messages,
                stream: true,
                temperature: 0.7,
                max_tokens: 2000,
            });

            let fullContent = '';
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) {
                    // 逐字传递
                    for (const char of content) {
                        fullContent += char;
                        onData({
                            type: 'chunk',
                            content: char,
                            fullContent: fullContent
                        });
                        // 添加微小延迟使输出更自然
                        await wait(10);
                    }
                }
            }

            onData({ type: 'done', fullContent });
            return fullContent;
        } catch (error) {
            console.error(`AI对话错误 (尝试 ${retries + 1}/${MAX_RETRIES}):`, error);
            
            if (retries === MAX_RETRIES - 1) {
                // 最后一次重试失败
                onData({ 
                    type: 'error', 
                    error: error.message || '对话发生错误，请稍后重试'
                });
                throw error;
            }
            
            // 等待一段时间后重试
            await wait(RETRY_DELAY * (retries + 1));
            retries++;
        }
    }
}

// 添加对话历史管理函数
export function formatHistory(messages) {
    return messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));
}

// 添加错误处理函数
export function handleAIError(error) {
    console.error('AI Error Details:', error);
    
    if (error.response) {
        // API错误
        const status = error.response.status;
        const message = error.response.data?.error?.message || '未知错误';
        return `API错误 (${status}): ${message}`;
    } else if (error.request) {
        // 网络错误
        return '网络连接错误，请检查网络连接';
    } else if (error.message) {
        // 其他错误
        return `错误: ${error.message}`;
    } else {
        return '发生未知错误，请稍后重试';
    }
}