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
						<text class="status" :class="file.status">{{ fileStatusText(file) }}</text>
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
        />
      </view>
    </view>
  </view>
</template>


<script setup>
import { ref, reactive, computed, nextTick } from 'vue'
import { askQuestion, uploadFile } from '../../controls/docChat'
import { chatWithKimi } from '../../controls/kimiControl'
import { streamChat } from '../../service/kimi_normal'

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
const fileInput = ref(null)
const fileId = ref(null);

// 新增状态常量
const FILE_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  ANALYZING: 'analyzing',
  SUCCESS: 'success',
  ERROR: 'error'
}

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

// 页面中的send函数
const send = async () => {
  if (!canSend.value) return;

  const session = historyList.find(item => item.id === currentSession.id);
  if (!session) {
    console.error('当前会话不存在');
    return;
  }

  // 构造用户消息
  const userMsg = {
    role: 'user',
    content: inputText.value,
    files: files.value.length ? [...files.value] : null,
    time: Date.now()
  };
  
  // 添加用户消息到历史
  session.messages.push(userMsg);
  
  // 清空输入
  inputText.value = '';
  files.value = [];
  
  // 添加临时思考消息（使用 reactive 确保响应式）
  const tempMsg = reactive({
    role: 'assistant',
    content: '',
    thinking: true,
    time: Date.now()
  });
  session.messages.push(tempMsg);
  scrollToBottom();

  try {
    // 获取有效历史记录（过滤系统消息和空内容）
    const currentHistory = session.messages
      .filter(m => ['user', 'assistant'].includes(m.role)&&m.content)
      .map(({ role, content }) => ({ role, content }));

    // 调用流式接口
    await streamChat(
      userMsg.content,
      currentHistory,
      (data) => {
        switch (data.type) {
          case 'chunk':
            // 逐字追加内容
            tempMsg.content += data.content;
            // 强制更新数组触发响应式（Vue 3 需要）
            session.messages[session.messages.length - 1] = { ...tempMsg };
            scrollToBottom();
            break;

          case 'done':
            // 完成时移除思考状态
            tempMsg.thinking = false;
            // 清理历史中的临时消息
            session.messages = session.messages.filter(m => !m.thinking);
            // 添加最终消息
            session.messages.push({ ...tempMsg });
            scrollToBottom();
            break;

          case 'error':
            tempMsg.content = `请求失败: ${data.error}`;
            tempMsg.thinking = false;
            session.messages[session.messages.length - 1] = { ...tempMsg };
            scrollToBottom();
            break;
        }
      }
    );
    
  } catch (error) {
    tempMsg.content = `请求失败: ${error.message}`;
    tempMsg.thinking = false;
    session.messages[session.messages.length - 1] = { ...tempMsg };
    scrollToBottom();
  }
};

// 修改文件上传部分（保持原逻辑）
const triggerFile = async () => {
  try {
    const tempFile = {
      name: '选择文件中...',
      status: FILE_STATUS.UPLOADING
    }
    files.value.push(tempFile)
    
    // 这里调用你的文件上传API
    const uploadResult = await uploadFile(fileInput.value.files[0])
    
    tempFile.status = FILE_STATUS.SUCCESS
    tempFile.name = uploadResult.fileName
    fileId.value = uploadResult.fileId
    
    scrollToBottom()
  } catch (error) {
    console.error('上传失败:', error)
    files.value = []
    uni.showToast({
      title: `上传失败: ${error.message}`,
      icon: 'none'
    })
  }
}

// 新增文件状态文本显示方法
const fileStatusText = (file) => {
  const statusMap = {
    [FILE_STATUS.PENDING]: '等待中...',
    [FILE_STATUS.UPLOADING]: '上传中...',
    [FILE_STATUS.ANALYZING]: '分析中...',
    [FILE_STATUS.SUCCESS]: '✓',
    [FILE_STATUS.ERROR]: '×'
  }
  return statusMap[file.status] || ''
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
        .tag {
          position: relative;
          .status {
            margin-left: 6px;
            font-size: 12px;
            &.pending { color: #999; }
            &.uploading { color: #1890ff; }
            &.analyzing { color: #52c41a; }
            &.error { color: #ff4d4f; }
          }
        }
      }
      
      // 在消息气泡中显示分析结果
      .bubble {
        .analysis-result {
          margin-top: 8px;
          padding: 8px;
          background: rgba(0,0,0,0.05);
          border-radius: 4px;
          font-size: 14px;
          
          .title {
            font-weight: bold;
            margin-bottom: 4px;
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