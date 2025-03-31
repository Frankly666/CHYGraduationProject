import { SPARK_CONFIG } from './config.js'

/**
 * 流式聊天API核心实现
 * @param {Array} messages 消息历史
 * @param {Function} onMessage 消息回调(content: string, isEnd: boolean)
 * @param {Object} options 额外参数
 */
export const streamChat = async (messages, onMessage, options = {}) => {
  const response = await fetch(SPARK_CONFIG.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SPARK_CONFIG.apiPassword}`
    },
    body: JSON.stringify({
      model: 'lite', // 默认使用lite模型
      messages,
      stream: true,
      ...options
    })
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.error?.message || `HTTP ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        // 处理结束标记
        if (trimmed === 'data:[DONE]') {
          onMessage('', true)
          return
        }

        // 处理数据行
        if (trimmed.startsWith('data:')) {
          try {
            const jsonStr = trimmed.substring(5).trim()
            const data = JSON.parse(jsonStr)
            
            if (data.code !== 0) {
              throw new Error(data.message || `API错误: ${data.code}`)
            }
            
            const content = data.choices[0]?.delta?.content || ''
            if (content) onMessage(content, false)
          } catch (e) {
            console.error('解析错误:', e.message)
            console.error('原始数据:', trimmed)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}