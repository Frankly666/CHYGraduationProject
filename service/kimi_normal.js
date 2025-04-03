// service/moonshot.js
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: "sk-JWuFVaV252ndCTXc3Q8lvkVP7vMomFeySnJxx6bbT1PMoEst",
    baseURL: "https://api.moonshot.cn/v1",
    dangerouslyAllowBrowser: true
});

export async function streamChat(prompt, history, onData) {
    try {
        const messages = [
            { role: "system", content: "你是 Kimi..." },
            ...history,
        ];

        const stream = await client.chat.completions.create({
            model: "moonshot-v1-8k",
            messages: messages,
            stream: true,
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
                    // 添加微小延迟（可选）
                    await new Promise(resolve => setTimeout(resolve, 10));
                }
            }
        }

        onData({ type: 'done', fullContent });
        return fullContent;
    } catch (error) {
        onData({ type: 'error', error: error.message });
        throw error;
    }
}