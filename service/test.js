import { simpleChat } from './index.js'

const test = async () => {
  console.log('🚀 开始测试API...')
  
  try {
    await simpleChat(
      "介绍一下讯飞星火大模型",
      (content, isEnd) => {
        process.stdout.write(content)
        if (isEnd) console.log('\n✅ 测试成功')
      },
      {
        temperature: 0.7,
        max_tokens: 500
      }
    )
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
  }
}

test()