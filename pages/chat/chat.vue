<template>
  <view class="container">
    <!-- 左侧侧边栏 -->
    <view class="sidebar">
      <view class="header">
        <text class="logo">EduResearch</text>
        <button class="new-chat" @click="createNewChat">
          <text>+ 新对话</text>
        </button>
      </view>
      
      <scroll-view class="history-list" scroll-y>
        <view 
          v-for="item in historyList"
          :key="item.id"
          class="history-item"
          :class="{ active: currentSession.id === item.id }"
          @click="switchSession(item.id)"
        >
          <view class="item-icon">{{ item.type === 'doc' ? '📄' : '💬' }}</view>
          <view class="item-info">
            <text class="title">{{ item.title }}</text>
            <text class="time">{{ formatTime(item.time) }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 右侧主区域 -->
    <view class="main">
      <!-- 消息区域 -->
      <scroll-view 
        class="message-list"
        scroll-y
        :scroll-top="scrollTop"
      >
        <view 
          v-for="(msg, index) in messageList"
          :key="index"
          class="message"
          :class="msg.role"
        >
          <image 
            class="avatar"
            :src="msg.role === 'user' ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAFHSURBVHgB7ZbBDcIwDESfkQpQA6oBNdABHdABHdABJdABHdABHdABJXh5iiNZJ7vEQuojPd1JtvNjO3ECAAAAAAAAAAAAAADAiXjvH1rrO6XUjTF2j9bOuaeU8hGtKaUuY4yXGf3wJcVxH3Rwzt2klHfO8YJQ1nH3MqOfvqQ47oMOzrmblPLOOV4QyjruXmb005cUx33QwTl3k1LeOccLQlnH3cuMfvqS4rgPOjjnblLKO+d4QSjruHuZ0U9fUhz3QQfn3E1Keecch5DkXqy1NxH6M3r1bqgvTjC6a4y5i9C/0Kt3Q31xgtFdY8xdhP6FXr0b6osTjO4aY+4i9C/06t1QX5xgdNcYcxehf6FX74b64gSju8aYuwj9C716N9QXJxjdNcbcRehf6NW7ob44weiuMeYuQv9Cr94N9cUJRneNMXcR+hd69W6oL04wumuMuYvQv9Crd0N9cYLRXWPMXYT+hV69G+qLE4zuGmPuIvQv9OrdUF+cYHTXGHMXoX+hV++G+uIEo7vGmLsI/Qu9ejfUFycY3TXG3EXoX+jVu6G+OMHorjHmLkL/AiMpxmE9Vw1xAAAAAElFTkSuQmCC' : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IARs4c6QAAAARnQU1BAACxjwv8YQUAAAHSSURBVHgB7ZdBDsIgEEWn7v8C3bgx7o0X6M0L6AIv4Ma4Ny7wAnoBvUA3JtE0TQUhDAX8L5nJcCjTj58OQwEAAAAAAAAAAAAAACqklHpK6YoxXrXWx7X6KaUzxnjWWm+klF4xL0Z7eXHcBx2EEGcM5J0Y4wWhrOPuZUY/fUlx3AcdhBBnDOSdGOMFoazj7mVGP31JcdwHHYQQZwzknRjjBaGs4+5lRj99SXHcBx2EEGcM5J0Y4wWhrOPuZUY/fUlx3AcdhBBnDOSdGONFq9Wr1vomQv9Br94N9cUJRneNMXcR+hd69W6oL04wumuMuYvQv9Crd0N9cYLRXWPMXYT+hV69G+qLE4zuGmPuIvQv9OrdUF+cYHTXGHMXoX+hV++G+uIEo7vGmLsI/Qu9ejfUFycY3TXG3EXoX+jVu6G+OMHorjHmLkL/Qq/eDfXFCUZ3jTF3EfoXevVuqC9OMLprjLmL0L/Qq3dDfXGC0V1jzF2E/oVevRvqixOM7hpj7iL0L/Tq3VBfnGB01xhzF6F/oVfvhvriBKO7xpi7CP0LvXo31BcnGN01xtxF6F/o1buhvjjB6K4x5i5C/wIjjcVhOVkOcQAAAABJRU5ErkJggg=='"
          />
          <view class="bubble">
            <text v-if="msg.thinking" class="typing">
              <text class="dot">●</text>
              <text class="dot">●</text>
              <text class="dot">●</text>
            </text>
            <text v-else>{{ msg.content }}</text>
            <view v-if="msg.files" class="files">
              <view v-for="(file, i) in msg.files" :key="i" class="file">
                <text class="icon">📎</text>
                <text class="name">{{ file.name }}</text>
              </view>
            </view>
            <text class="time">{{ formatTime(msg.time) }}</text>
          </view>
        </view>
      </scroll-view>

      <!-- 输入区域 -->
      <view class="input-area">
        <view class="file-tags">
          <view v-for="(file, index) in files" :key="index" class="tag">
            <text>{{ file.name }}</text>
            <text @click="removeFile(index)" class="remove">×</text>
          </view>
        </view>
        <view class="input-box">
          <view @click="triggerFile" class="file-btn">📁</view>
          <input 
            v-model="inputText"
            placeholder="输入消息..."
            @confirm="send"
            class="input"
          />
          <button @click="send" :disabled="!canSend" class="send-btn">
            {{ isSending ? '发送中...' : '发送' }}
          </button>
        </view>
        <input 
          type="file"
          ref="fileInput"
          @change="addFiles"
          class="hidden-input"
          multiple
        />
      </view>
    </view>
  </view>
</template>


<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { simpleChat } from '@/service/index.js'

// 工具函数
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// 数据部分
const historyList = reactive([
  { 
    id: 1, 
    title: '新对话1', 
    time: Date.now(), 
    type: 'chat',
    messages: [
      { role: 'system', content: '你是知识渊博的助理' }
    ]
  },
  { 
    id: 2, 
    title: '文档分析', 
    time: Date.now()-3600000, 
    type: 'doc',
    messages: [
      { role: 'system', content: '你是文档分析专家' }
    ]
  }
])

const currentSession = reactive({ id: 1 })
const inputText = ref('')
const files = ref([])
const isSending = ref(false)
const scrollTop = ref(0)

// 计算属性
const canSend = computed(() => {
  return (inputText.value.trim() || files.value.length) && !isSending.value
})

// 获取当前会话的消息列表
const messageList = computed(() => {
  const session = historyList.find(item => item.id === currentSession.id)
  return session ? session.messages.filter(msg => msg.role !== 'system') : []
})

// 核心方法
const createNewChat = () => {
  const newChat = {
    id: Date.now(),
    title: `新对话${historyList.length+1}`,
    time: Date.now(),
    type: 'chat',
    messages: [
      { role: 'system', content: '你是知识渊博的助理' }
    ]
  }
  historyList.unshift(newChat)
  switchSession(newChat.id)
}

const switchSession = (id) => {
  const session = historyList.find(item => item.id === id)
  if (session) {
    Object.assign(currentSession, session)
  }
}

const send = async () => {
  if (!canSend.value) return

  // 获取当前会话
  const session = historyList.find(item => item.id === currentSession.id)
  if (!session) return

  // 用户消息
  const userMsg = {
    role: 'user',
    content: inputText.value,
    files: [...files.value],
    time: Date.now()
  }
  session.messages.push(userMsg)
  
  // 显示AI思考状态
  isSending.value = true
  const tempMsg = {
    role: 'assistant',
    content: '',
    thinking: true,
    time: Date.now()
  }
  session.messages.push(tempMsg)

  // 清空输入
  inputText.value = ''
  files.value = []
  scrollToBottom()
  
  try {
    await simpleChat(
      userMsg.content,
			session.messages,
      (content, isEnd) => {
        // 移除思考状态消息
        if (session.messages[session.messages.length - 1].thinking) {
          session.messages.pop()
        }
        
        // 更新或添加消息
        const lastMsg = session.messages[session.messages.length - 1]
        if (lastMsg?.role === 'assistant' && !lastMsg.thinking) {
          lastMsg.content += content
        } else {
          session.messages.push({
            role: 'assistant',
            content: content,
            time: Date.now()
          })
        }
				
        scrollToBottom()
        
        // 最终消息处理
        if (isEnd) {
          // 可以在这里添加会话结束后的逻辑
        }
      },
      {
        temperature: 0.7,
        max_tokens: 1000
      }
    )
  } catch (error) {
    // 出错时移除思考状态
    session.messages.pop()
    // 添加错误提示
    session.messages.push({
      role: 'assistant',
      content: '请求失败: ' + error.message,
      time: Date.now()
    })
  } finally {
    isSending.value = false
    scrollToBottom()
  }
}

// 文件处理（保持不变）
const triggerFile = () => {
  document.querySelector('.hidden-input').click()
}

const addFiles = (e) => {
  files.value = [...files.value, ...Array.from(e.target.files)]
}

const removeFile = (index) => {
  files.value.splice(index, 1)
}

// 辅助方法
const scrollToBottom = async () => {
  await nextTick()
  scrollTop.value = Date.now() // 触发滚动更新
}
</script>


<style lang="less">
.container {
  display: flex;
  height: 100vh;
  background: #f0f2f5;
	overflow: hidden;

  .sidebar {
    width: 260px;
    background: white;
    border-right: 1px solid #e8e8e8;

    .header {
      padding: 20px;
      border-bottom: 1px solid #eee;

      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #1890ff;
      }

      .new-chat {
        margin-top: 15px;
        width: 100%;
        background: #1890ff;
        color: white;
        border-radius: 4px;
        padding: 8px;
      }
    }

    .history-list {
      height: calc(100vh - 100px);
      padding: 10px;

      .history-item {
        display: flex;
        align-items: center;
        padding: 12px;
        border-radius: 6px;
        margin: 4px 0;
        transition: all 0.2s;

        &.active {
          background: #e6f7ff;
        }

        .item-icon {
          font-size: 20px;
          margin-right: 12px;
        }

        .item-info {
          flex: 1;

          .title {
            display: block;
            font-size: 14px;
          }

          .time {
            font-size: 12px;
            color: #999;
          }
        }
      }
    }
  }

  .main {
    flex: 1;
    display: flex;
    flex-direction: column;

    .message-list {
      flex: 1;
      padding: 20px;
      overflow-y: auto;

      .message {
        display: flex;
        margin: 12px 0;

        &.user {
          flex-direction: row-reverse;

          .bubble {
            background: #1890ff;
            color: white;

            .time {
              color: rgba(255,255,255,0.8);
            }
          }
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 4px;
          margin: 0 12px;
        }

        .bubble {
          max-width: 70%;
          padding: 12px 16px;
          border-radius: 6px;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          position: relative;

          .typing {
            .dot {
              animation: blink 1.4s infinite;
              @keyframes blink {
                0%, 100% { opacity: 0.2; }
                50% { opacity: 1; }
              }
              &:nth-child(2) { animation-delay: 0.2s; }
              &:nth-child(3) { animation-delay: 0.4s; }
            }
          }

          .files {
            margin-top: 8px;
            .file {
              display: flex;
              align-items: center;
              padding: 4px 0;
              .icon { margin-right: 6px; }
              .name {
                font-size: 12px;
                color: inherit;
              }
            }
          }

          .time {
            display: block;
            font-size: 12px;
            color: #666;
            margin-top: 4px;
          }
        }
      }
    }

    .input-area {
      padding: 16px;
      background: white;
      border-top: 1px solid #eee;

      .file-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 8px;

        .tag {
          background: #f0f2f5;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          display: flex;
          align-items: center;

          .remove {
            margin-left: 6px;
            cursor: pointer;
            &:hover { color: #ff4d4f; }
          }
        }
      }

      .input-box {
        display: flex;
        align-items: center;
        gap: 8px;

        .file-btn {
          font-size: 20px;
          cursor: pointer;
          padding: 8px;
        }

        .input {
          flex: 1;
          border: 1px solid #ddd;
          border-radius: 4px;
          padding: 8px 12px;
        }

        .send-btn {
          background: #1890ff;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          &:disabled {
            background: #ccc;
            cursor: not-allowed;
          }
        }
      }

      .hidden-input {
        display: none;
      }
    }
  }
}
</style>