<template>
  <scroll-view class="message-list" scroll-y :scroll-top="scrollTop">
    <view
      v-for="(msg, index) in messages"
      :key="index"
      class="message"
      :class="msg.role"
    >
      <image
        class="avatar"
        :src="msg.role === 'user' ? userAvatar : aiAvatar"
      />
      <view class="bubble">
        <view class="role-tag" v-if="msg.role === 'user'">问</view>
        <view class="role-tag answer" v-else>答</view>
        <text v-if="msg.thinking" class="typing">
          <text class="dot">●</text>
          <text class="dot">●</text>
          <text class="dot">●</text>
        </text>
        <rich-text v-else :nodes="renderMarkdown(msg.content)" class="markdown-content"></rich-text>
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
</template>

<script>
import { ref, watch, nextTick } from 'vue';
import { marked } from 'marked';
import { userAvatar, aiAvatar } from "@/static/avatars.js";

export default {
  name: 'MessageList',
  props: {
    messages: {
      type: Array,
      required: true,
      default: () => []
    }
  },
  setup(props) {
    const scrollTop = ref(0);

    // 配置marked选项
    marked.setOptions({
      breaks: true, // 支持GitHub风格的换行
      gfm: true,    // 启用GitHub风格的Markdown
      headerIds: false, // 禁用标题ID
      mangle: false,    // 禁用标题ID转义
    });

    // 渲染Markdown内容
    const renderMarkdown = (content) => {
      try {
        return marked(content);
      } catch (error) {
        console.error('Markdown渲染错误:', error);
        return content;
      }
    };

    // 格式化时间
    const formatTime = (timestamp) => {
      if (!timestamp) return '';
      
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      // 如果是今天的消息，只显示时间
      if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }
      
      // 如果是昨天的消息
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
      }
      
      // 如果是今年的消息
      if (date.getFullYear() === now.getFullYear()) {
        return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + 
               date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      }
      
      // 其他情况显示完整日期
      return date.toLocaleDateString('zh-CN') + ' ' + 
             date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    };

    // 滚动到底部
    const scrollToBottom = () => {
      const query = uni.createSelectorQuery();
      query.select('.message-list').boundingClientRect();
      query.exec((res) => {
        if (res[0]) {
          scrollTop.value = res[0].height;
        }
      });
    };

    // 监听消息变化，自动滚动到底部
    watch(() => props.messages.length, () => {
      nextTick(() => {
        scrollToBottom();
        
        // 添加延时滚动，确保在内容完全渲染后再次滚动到底部
        setTimeout(() => {
          scrollToBottom();
        }, 300);
      });
    });
    
    // 监听消息内容变化，确保在流式响应时也能滚动到底部
    watch(() => props.messages, () => {
      nextTick(() => {
        scrollToBottom();
      });
    }, { deep: true });

    return {
      scrollTop,
      renderMarkdown,
      formatTime,
      scrollToBottom,
      userAvatar,
      aiAvatar
    };
  }
};
</script>

<style lang="scss" scoped>
.message-list {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f9f9f9;

  .message {
    display: flex;
    margin-bottom: 24px;
    position: relative;

    &.user {
      flex-direction: row-reverse;

      .bubble {
        background: linear-gradient(45deg, #1890ff, #36cfc9);
        color: white;
        margin-left: 0;
        margin-right: 12px;
        border-radius: 16px 4px 16px 16px;

        .role-tag {
          background-color: rgba(255, 255, 255, 0.2);
          color: white;
        }

        .time {
          color: rgba(255, 255, 255, 0.7);
        }
      }
    }

    &.assistant {
      .bubble {
        background-color: white;
        border-radius: 4px 16px 16px 16px;

        .role-tag.answer {
          background-color: rgba(24, 144, 255, 0.1);
          color: #1890ff;
        }
      }
    }

    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .bubble {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      margin-left: 12px;
      position: relative;

      .role-tag {
        position: absolute;
        top: -8px;
        left: 12px;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 500;
        background-color: #f0f2f5;
        color: #666;
      }

      .typing {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 0;

        .dot {
          font-size: 8px;
          animation: typing 1.5s infinite ease-in-out;

          &:nth-child(1) {
            animation-delay: 0s;
          }

          &:nth-child(2) {
            animation-delay: 0.2s;
          }

          &:nth-child(3) {
            animation-delay: 0.4s;
          }
        }
      }

      .time {
        display: block;
        font-size: 12px;
        color: #999;
        margin-top: 8px;
        text-align: right;
      }

      .files {
        margin-top: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;

        .file {
          display: flex;
          align-items: center;
          padding: 4px 8px;
          background-color: rgba(0, 0, 0, 0.05);
          border-radius: 4px;

          .icon {
            margin-right: 6px;
            font-size: 14px;
          }

          .name {
            font-size: 12px;
            color: #333;
          }
        }
      }
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.6;
  }
  30% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

// 调整消息气泡样式以适应Markdown内容
.message {
  .bubble {
    max-width: 80%; // 增加最大宽度以适应Markdown内容
    
    &.user {
      .markdown-content {
        color: white;
        
        a {
          color: rgba(255, 255, 255, 0.9);
        }
        
        code {
          background: rgba(255, 255, 255, 0.1);
        }
        
        pre {
          background: rgba(255, 255, 255, 0.1);
        }
        
        blockquote {
          border-left-color: rgba(255, 255, 255, 0.3);
          color: rgba(255, 255, 255, 0.8);
        }
      }
    }
  }
}

.markdown-content {
  font-size: 14px;
  line-height: 1.6;
  
  // 标题样式
  h1, h2, h3, h4, h5, h6 {
    margin: 1em 0 0.5em;
    font-weight: 600;
    line-height: 1.25;
  }
  
  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; }
  h3 { font-size: 1.2em; }
  
  // 段落样式
  p {
    margin: 0.5em 0;
  }
  
  // 列表样式
  ul, ol {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  
  // 代码块样式
  pre {
    background: #f6f8fa;
    padding: 1em;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0.5em 0;
  }
  
  code {
    font-family: monospace;
    background: #f6f8fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-size: 0.9em;
  }
  
  // 引用样式
  blockquote {
    border-left: 4px solid #dfe2e5;
    margin: 0.5em 0;
    padding: 0 1em;
    color: #6a737d;
  }
  
  // 表格样式
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.5em 0;
    
    th, td {
      border: 1px solid #dfe2e5;
      padding: 0.5em;
    }
    
    th {
      background: #f6f8fa;
    }
  }
  
  // 链接样式
  a {
    color: #0366d6;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
  
  // 图片样式
  img {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    margin: 0.5em 0;
  }
}
</style>