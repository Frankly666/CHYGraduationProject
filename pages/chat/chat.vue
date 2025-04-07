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
          <view class="item-icon">{{ item.type === "doc" ? "📄" : "💬" }}</view>
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
      <scroll-view class="message-list" scroll-y :scroll-top="scrollTop">
        <view
          v-for="(msg, index) in messageList"
          :key="index"
          class="message"
          :class="msg.role"
        >
          <image
            class="avatar"
            :src="msg.role === 'user' ? userAvatar : aiAvatar"
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
            <text class="status" :class="file.status">{{
              fileStatusText(file)
            }}</text>
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
            {{ isSending ? "发送中..." : "发送" }}
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
import { ref, reactive, computed, nextTick } from "vue";
import { streamChat } from "../../service/kimi_normal";
import { userAvatar, aiAvatar } from "../../static/avatars.js";

// 工具函数
const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};

// 数据部分
const historyList = reactive([
  {
    id: 1,
    title: "新对话1",
    time: Date.now(),
    type: "chat",
    messages: reactive([{ role: "system", content: "你是知识渊博的助理" }]),
  },
  {
    id: 2,
    title: "文档分析",
    time: Date.now() - 3600000,
    type: "doc",
    messages: reactive([{ role: "system", content: "你是文档分析专家" }]),
  },
]);

const currentSession = reactive({ id: 1 });
const inputText = ref("");
const files = ref([]);
const isSending = ref(false);
const scrollTop = ref(0);
const fileInput = ref(null);
const fileId = ref(null);

// 新增状态常量
const FILE_STATUS = {
  PENDING: "pending",
  UPLOADING: "uploading",
  ANALYZING: "analyzing",
  SUCCESS: "success",
  ERROR: "error",
};

// 计算属性
const canSend = computed(() => {
  return (inputText.value.trim() || files.value.length) && !isSending.value;
});

// 获取当前会话的消息列表
const messageList = computed(() => {
  const session = historyList.find((item) => item.id === currentSession.id);
  return session ? session.messages.filter((msg) => msg.role !== "system") : [];
});

// 核心方法
const createNewChat = () => {
  const newChat = {
    id: Date.now(),
    title: `新对话${historyList.length + 1}`,
    time: Date.now(),
    type: "chat",
    messages: [{ role: "system", content: "你是知识渊博的助理" }],
  };
  historyList.unshift(newChat);
  switchSession(newChat.id);
};

const switchSession = (id) => {
  const session = historyList.find((item) => item.id === id);
  if (session) {
    Object.assign(currentSession, session);
  }
};

// 页面中的send函数
const send = async () => {
  if (!canSend.value) return;

  const session = historyList.find((item) => item.id === currentSession.id);
  if (!session) {
    console.error("当前会话不存在");
    return;
  }

  // 构造用户消息
  const userMsg = {
    role: "user",
    content: inputText.value,
    files: files.value.length ? [...files.value] : null,
    time: Date.now(),
  };

  // 添加用户消息到历史
  session.messages.push(userMsg);

  // 清空输入
  inputText.value = "";
  files.value = [];

  // 添加临时思考消息
  const tempMsg = reactive({
    role: "assistant",
    content: "",
    thinking: true,
    time: Date.now(),
  });
  session.messages.push(tempMsg);
  scrollToBottom();

  try {
    // 获取有效历史记录
    const currentHistory = session.messages
      .filter((m) => ["user", "assistant"].includes(m.role) && m.content)
      .map(({ role, content }) => ({ role, content }));

    // 调用流式接口
    await streamChat(userMsg.content, currentHistory, (data) => {
      switch (data.type) {
        case "chunk":
          // 使用Vue的响应式系统更新内容
          tempMsg.content = tempMsg.content + data.content;
          console.log(data.content);
          // 强制更新视图
          nextTick(() => {
            // 强制触发视图更新
            session.messages = [...session.messages];
            scrollToBottom();
          });
          break;

        case "done":
          // 完成时移除思考状态
          tempMsg.thinking = false;
          nextTick(() => {
            scrollToBottom();
          });
          break;

        case "error":
          tempMsg.content = `请求失败: ${data.error}`;
          tempMsg.thinking = false;
          nextTick(() => {
            scrollToBottom();
          });
          break;
      }
    });
  } catch (error) {
    tempMsg.content = `请求失败: ${error.message}`;
    tempMsg.thinking = false;
    nextTick(() => {
      scrollToBottom();
    });
  }
};

// 修改文件上传部分（保持原逻辑）
const triggerFile = async () => {
  try {
    const tempFile = {
      name: "选择文件中...",
      status: FILE_STATUS.UPLOADING,
    };
    files.value.push(tempFile);

    // 这里调用你的文件上传API
    const uploadResult = await uploadFile(fileInput.value.files[0]);

    tempFile.status = FILE_STATUS.SUCCESS;
    tempFile.name = uploadResult.fileName;
    fileId.value = uploadResult.fileId;

    scrollToBottom();
  } catch (error) {
    console.error("上传失败:", error);
    files.value = [];
    uni.showToast({
      title: `上传失败: ${error.message}`,
      icon: "none",
    });
  }
};

// 新增文件状态文本显示方法
const fileStatusText = (file) => {
  const statusMap = {
    [FILE_STATUS.PENDING]: "等待中...",
    [FILE_STATUS.UPLOADING]: "上传中...",
    [FILE_STATUS.ANALYZING]: "分析中...",
    [FILE_STATUS.SUCCESS]: "✓",
    [FILE_STATUS.ERROR]: "×",
  };
  return statusMap[file.status] || "";
};

const addFiles = (e) => {
  files.value = [...files.value, ...Array.from(e.target.files)];
};

const removeFile = (index) => {
  files.value.splice(index, 1);
};

// 辅助方法
const scrollToBottom = async () => {
  await nextTick();
  const query = uni.createSelectorQuery();
  query.select(".message-list").boundingClientRect();
  query.exec((res) => {
    if (res[0]) {
      scrollTop.value = res[0].height;
    }
  });
};
</script>

<style lang="less">
.container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
  overflow: hidden;

  .sidebar {
    width: 280px;
    background: white;
    border-right: 1px solid #e8e8e8;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);

    .header {
      padding: 24px;
      border-bottom: 1px solid #eee;

      .logo {
        font-size: 24px;
        font-weight: bold;
        background: linear-gradient(45deg, #1890ff, #36cfc9);
        -webkit-background-clip: text;
        color: transparent;
        letter-spacing: 1px;
      }

      .new-chat {
        margin-top: 20px;
        width: 100%;
        background: linear-gradient(45deg, #1890ff, #36cfc9);
        color: white;
        border-radius: 8px;
        padding: 12px;
        font-weight: 500;
        transition: all 0.3s;
        border: none;
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);

        &:active {
          transform: scale(0.98);
          box-shadow: 0 1px 4px rgba(24, 144, 255, 0.2);
        }
      }
    }

    .history-list {
      height: calc(100vh - 100px);
      padding: 12px;

      .history-item {
        display: flex;
        align-items: center;
        padding: 14px;
        border-radius: 8px;
        margin: 6px 0;
        transition: all 0.3s;
        cursor: pointer;

        &:hover {
          background: #f0f7ff;
        }

        &.active {
          background: #e6f7ff;
          border-left: 3px solid #1890ff;
        }

        .item-icon {
          font-size: 20px;
          margin-right: 14px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f7ff;
          border-radius: 6px;
        }

        .item-info {
          flex: 1;

          .title {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #333;
            margin-bottom: 4px;
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
    background: #fff;

    .message-list {
      flex: 1;
      padding: 24px;
      overflow-y: auto;

      .message {
        display: flex;
        margin: 16px 0;
        animation: fadeIn 0.3s ease-out;

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        &.user {
          flex-direction: row-reverse;

          .bubble {
            background: linear-gradient(45deg, #1890ff, #36cfc9);
            color: white;
            margin-left: 60px;

            .time {
              color: rgba(255, 255, 255, 0.8);
            }
          }
        }

        .avatar {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          margin: 0 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.3s;
          background: #fff;
          padding: 2px;
          border: 2px solid transparent;

          &:hover {
            transform: scale(1.05) rotate(5deg);
            border-color: #1890ff;
          }
        }

        .bubble {
          max-width: 70%;
          padding: 14px 18px;
          border-radius: 12px;
          background: white;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          position: relative;
          margin-right: 60px;

          .typing {
            .dot {
              animation: blink 1.4s infinite;
              @keyframes blink {
                0%,
                100% {
                  opacity: 0.2;
                }
                50% {
                  opacity: 1;
                }
              }
              &:nth-child(2) {
                animation-delay: 0.2s;
              }
              &:nth-child(3) {
                animation-delay: 0.4s;
              }
            }
          }

          .files {
            margin-top: 10px;
            .file {
              display: flex;
              align-items: center;
              padding: 6px 0;
              .icon {
                margin-right: 8px;
              }
              .name {
                font-size: 13px;
                color: inherit;
              }
            }
          }

          .time {
            display: block;
            font-size: 12px;
            color: #999;
            margin-top: 6px;
          }
        }
      }
    }

    .input-area {
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #eee;
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.03);
      position: relative;

      .file-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
        min-height: 28px;

        .tag {
          display: flex;
          align-items: center;
          padding: 4px 12px;
          background: #f5f7fa;
          border-radius: 16px;
          font-size: 12px;
          transition: all 0.3s;
          border: 1px solid #eee;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);

          &:hover {
            background: #e6f7ff;
            border-color: #1890ff;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
          }

          .status {
            margin-left: 6px;
            font-size: 11px;
            display: flex;
            align-items: center;

            &.pending {
              color: #999;
              &::before {
                content: "⏳";
                margin-right: 3px;
              }
            }
            &.uploading {
              color: #1890ff;
              &::before {
                content: "📤";
                margin-right: 3px;
              }
            }
            &.analyzing {
              color: #52c41a;
              &::before {
                content: "🔍";
                margin-right: 3px;
              }
            }
            &.error {
              color: #ff4d4f;
              &::before {
                content: "❌";
                margin-right: 3px;
              }
            }
          }

          .remove {
            margin-left: 6px;
            cursor: pointer;
            color: #999;
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.3s;
            font-size: 12px;

            &:hover {
              color: #ff4d4f;
              background: rgba(255, 77, 79, 0.1);
              transform: scale(1.1);
            }
          }
        }
      }

      .input-box {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f5f7fa;
        padding: 8px 12px;
        border-radius: 12px;
        transition: all 0.3s;
        border: 1px solid transparent;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.02);

        &:focus-within {
          border-color: #1890ff;
          box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.1);
          background: #fff;
        }

        .file-btn {
          font-size: 16px;
          cursor: pointer;
          padding: 6px;
          color: #666;
          transition: all 0.3s;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;

          &:hover {
            color: #1890ff;
            background: #e6f7ff;
            transform: scale(1.05);
          }

          &:active {
            transform: scale(0.95);
          }
        }

        .input {
          flex: 1;
          border: none;
          background: transparent;
          padding: 6px 8px;
          font-size: 13px;
          line-height: 1.4;
          min-height: 20px;
          max-height: 100px;
          resize: none;

          &:focus {
            outline: none;
          }

          &::placeholder {
            color: #999;
          }
        }

        .send-btn {
          background: linear-gradient(45deg, #1890ff, #36cfc9);
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 13px;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          min-width: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;

          &::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(
              45deg,
              rgba(255, 255, 255, 0.1),
              rgba(255, 255, 255, 0)
            );
            transition: all 0.3s;
          }

          &:hover::before {
            transform: translateY(-100%);
          }

          &:disabled {
            background: #ccc;
            cursor: not-allowed;
            &::before {
              display: none;
            }
          }

          &:not(:disabled):hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
          }

          &:not(:disabled):active {
            transform: translateY(1px);
            box-shadow: 0 1px 4px rgba(24, 144, 255, 0.2);
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
