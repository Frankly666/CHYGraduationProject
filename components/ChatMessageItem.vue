<template>
  <view class="message-item" :class="message.role">
    <image class="avatar" :src="avatarSrc" />
    <view class="bubble">
      <view class="role-tag" v-if="message.role === 'user'">问</view>
      <view class="role-tag answer" v-else>答</view>
      <text v-if="message.thinking" class="typing">
        <text class="dot">●</text>
        <text class="dot">●</text>
        <text class="dot">●</text>
      </text>
      <rich-text v-else :nodes="renderedMarkdown" class="markdown-content"></rich-text>
      <view v-if="message.files" class="files">
        <view v-for="(file, i) in message.files" :key="i" class="file">
          <text class="icon">📎</text>
          <text class="name">{{ file.name }}</text>
        </view>
      </view>
      <text class="time">{{ formattedTime }}</text>
      <view class="message-actions">
        <view class="action-btn copy-btn" @click="copyMessage">📋 复制</view>
        <view v-if="message.role === 'assistant'" class="action-btn regenerate-btn" @click="regenerateMessage">🔄 重新生成</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { marked } from 'marked';
import { userAvatar, aiAvatar } from '../static/avatars.js'; // 确保路径正确

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
});

const emit = defineEmits(['copy', 'regenerate']);

const avatarSrc = computed(() => {
  return props.message.role === 'user' ? userAvatar : aiAvatar;
});

const renderedMarkdown = computed(() => {
  try {
    return marked(props.message.content || '');
  } catch (error) {
    console.error('Markdown渲染错误:', error);
    return props.message.content || '';
  }
});

const formattedTime = computed(() => {
  if (!props.message.time) return '';
  const date = new Date(props.message.time);
  return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
});

const copyMessage = () => {
  uni.setClipboardData({
    data: props.message.content,
    success: () => {
      uni.showToast({
        title: '已复制',
        icon: 'success',
        duration: 1500
      });
    },
    fail: () => {
      uni.showToast({
        title: '复制失败',
        icon: 'none'
      });
    }
  });
  emit('copy', props.message);
};

const regenerateMessage = () => {
  emit('regenerate', props.message);
};

// 配置marked选项
marked.setOptions({
  breaks: true, // 支持GitHub风格的换行
  gfm: true,    // 启用GitHub风格的Markdown
  headerIds: false, // 禁用标题ID
  mangle: false,    // 禁用标题ID转义
});

</script>

<style scoped>
.message-item {
  display: flex;
  margin-bottom: 5px;
  margin-right: 49px;
  padding: 0 8px;
  align-items: flex-start;
}

.message-item.user {
  flex-direction: row-reverse;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  margin: 0 6px;
}

.bubble {
  max-width: 70%;
  min-width: 80px;
  padding: 4px 10px 4px 10px;
  border-radius: 10px;
  position: relative;
  background-color: #f1f1f1;
}

.message-item.user .bubble {
  background-color: #409EFF;
  color: white;
  padding: 2px 10px 2px 10px;
  margin-top: 0;
  min-height: 24px;
  min-width: 90px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.message-item.assistant .bubble {
  background-color: #FFFFFF; /* AI消息背景色 */
  border: 1px solid #E0E0E0;
}

.role-tag {
  font-size: 9px;
  font-weight: bold;
  padding: 0 2px;
  border-radius: 3px;
  margin-bottom: 2px;
  display: inline-block;
  background-color: inherit;
}

.message-item.user .role-tag {
  background-color: rgba(255, 255, 255, 0.2);
  color: white;
}

.message-item.assistant .role-tag {
  background-color: #E0E0E0;
  color: #333;
}

.markdown-content {
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.25;
  font-size: 14px;
  margin-bottom: 0;
  padding-bottom: 0;
}

.message-item.user .markdown-content {
  font-size: 13px;
  text-align: left;
  padding-left: 0;
  line-height: 1.18;
  margin: 0;
  padding-bottom: 0;
}

.files {
  margin-top: 3px;
}

.file {
  display: flex;
  align-items: center;
  font-size: 10px;
  margin-bottom: 2px;
  background-color: rgba(0,0,0,0.05);
  padding: 3px;
  border-radius: 3px;
}

.message-item.user .file {
  background-color: rgba(255,255,255,0.1);
}

.file .icon {
  margin-right: 4px;
}

.time {
  display: block;
  font-size: 8px;
  color: #999;
  margin-top: 3px;
  text-align: right;
}

.message-item.user .time {
  color: rgba(255, 255, 255, 0.7);
}

.typing .dot {
  display: inline-block;
  width: 5px;
  height: 5px;
  background-color: #999;
  border-radius: 50%;
  margin: 0 2px;
  animation: blink 1.4s infinite both;
}

.typing .dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing .dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes blink {
  0% { opacity: 0.2; }
  20% { opacity: 1; }
  100% { opacity: 0.2; }
}

.message-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 3px;
  opacity: 0; /* 默认隐藏 */
  transition: opacity 0.3s ease;
}

.message-item:hover .message-actions {
  opacity: 1; /* 悬停时显示 */
}

.action-btn {
  display: flex;
  align-items: center;
  background-color: transparent;
  border: none;
  color: #555;
  padding: 1px 4px;
  font-size: 9px;
  border-radius: 3px;
  margin-left: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease, color 0.2s ease;
}

.action-btn:hover {
  background-color: #f0f0f0;
}

.message-item.user .action-btn {
  color: rgba(255, 255, 255, 0.8);
}

.message-item.user .action-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

</style>