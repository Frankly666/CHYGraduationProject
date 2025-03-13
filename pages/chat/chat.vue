<template>
  <view class="container">
    <!-- 顶部导航 -->
    <view class="header">
      <text class="title">智能教育研究助手</text>
      <view class="button-group">
        <button class="button">
          <text class="icon">&#xf093;</text>
          <text>上传文档</text>
        </button>
        <button class="button">
          <text class="icon">&#xf542;</text>
          <text>知识图谱</text>
        </button>
        <button class="button">
          <text class="icon">&#xf1da;</text>
          <text>历史管理</text>
        </button>
      </view>
    </view>

    <!-- 消息列表区域 -->
    <scroll-view class="message-container" scroll-y="true" ref="messageContainer">
      <view class="message-list">
        <!-- AI消息 -->
        <view class="message ai-message">
          <image class="avatar" :src="aiAvatar" mode="aspectFill" />
          <view class="content">
            <view class="bubble">
              <text>您好！我是您的智能教育研究助手。我可以帮助您进行文献研究、知识整理和学习规划。请问有什么我可以帮您的吗？</text>
            </view>
            <text class="time">09:30</text>
          </view>
        </view>

        <!-- 用户消息 -->
        <view class="message user-message">
          <image class="avatar" :src="userAvatar" mode="aspectFill" />
          <view class="content">
            <view class="bubble">
              <text>你好，我想研究一下人工智能在教育领域的应用，能帮我整理相关资料吗？</text>
            </view>
            <text class="time">09:31</text>
          </view>
        </view>

        <!-- AI回复 -->
        <view class="message ai-message">
          <image class="avatar" :src="aiAvatar" mode="aspectFill" />
          <view class="content">
            <view class="bubble">
              <text>当然可以帮您整理相关资料。人工智能在教育领域的应用主要包括以下几个方面：</text>
              <view class="list">
                <text>• 个性化学习和自适应教学</text>
                <text>• 智能教学系统和虚拟助教</text>
                <text>• 教育数据分析和学习评估</text>
                <text>• 智能内容生成和课程设计</text>
              </view>
              <text class="mt-2">您想了解哪个方面的具体应用呢？</text>
            </view>
            <text class="time">09:32</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部输入区域 -->
    <view class="footer">
      <view class="input-container">
        <input
          type="text"
          v-model="inputMessage"
          placeholder="请输入您的问题..."
          class="input"
          @confirm="sendMessage"
        />
        <button class="attach-button">
          <text class="icon">&#xf0c6;</text>
        </button>
      </view>
      <button class="send-button" @click="sendMessage">
        <text class="icon">&#xf1d8;</text>
        <text>发送</text>
      </button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { ref } from 'vue';

const messageContainer = ref<HTMLElement | null>(null);
const inputMessage = ref('');

// AI头像使用科技感的图片
const aiAvatar = 'https://ai-public.mastergo.com/ai/img_res/d1fffaf8973920830b48c33aceda0629.jpg';

// 用户头像使用商务风格的图片
const userAvatar = 'https://ai-public.mastergo.com/ai/img_res/e8cc2d74ac25962202e46747a9989fbb.jpg';

const sendMessage = () => {
  if (!inputMessage.value.trim()) return;

  // 这里只是清空输入框，实际项目中需要处理发送消息的逻辑
  inputMessage.value = '';

  // 滚动到底部
  setTimeout(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
    }
  }, 100);
};
</script>

<style lang="less">
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f9fafb;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  padding: 0 16px;
  background-color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  .title {
    font-size: 18px;
    font-weight: bold;
    color: #1a1a1a;
  }

  .button-group {
    display: flex;
    gap: 8px;

    .button {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 8px 12px;
      background-color: #eef2ff;
      color: #2563eb;
      border-radius: 20px;
      font-size: 14px;

      .icon {
        font-family: 'FontAwesome';
      }
    }
  }
}

.message-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;

  .message-list {
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .message {
      display: flex;
      gap: 12px;

      &.ai-message {
        flex-direction: row;
      }

      &.user-message {
        flex-direction: row-reverse;
      }

      .avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
      }

      .content {
        display: flex;
        flex-direction: column;

        .bubble {
          padding: 12px;
          border-radius: 12px;
          max-width: 70%;

          .list {
            margin-top: 8px;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
        }

        .time {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
        }
      }

      &.ai-message .bubble {
        background-color: #ffffff;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      }

      &.user-message .bubble {
        background-color: #2563eb;
        color: #ffffff;
      }
    }
  }
}

.footer {
  background-color: #ffffff;
  box-shadow: 0 -2px 4px rgba(0, 0, 0, 0.1);
  padding: 12px;

  .input-container {
    display: flex;
    align-items: center;
    gap: 8px;
    position: relative;

    .input {
      flex: 1;
      padding: 12px 16px;
      background-color: #f3f4f6;
      border-radius: 24px;
      border: none;
      outline: none;
    }

    .attach-button {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: #666;

      .icon {
        font-family: 'FontAwesome';
      }
    }
  }

  .send-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 24px;
    background-color: #2563eb;
    color: #ffffff;
    border-radius: 24px;
    border: none;

    .icon {
      font-family: 'FontAwesome';
    }
  }
}
</style>