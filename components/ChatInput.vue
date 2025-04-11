<template>
  <view class="input-area">
    <slot name="file-upload"></slot>
    <input
      class="message-input"
      v-model="inputMessage"
      placeholder="输入消息..."
      @confirm="sendMessage"
    />
    <view class="send-button" @click="sendMessage">
      <text>发送</text>
    </view>
  </view>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'ChatInput',
  emits: ['send-message'],
  setup(props, { emit }) {
    const inputMessage = ref('');
    
    // 发送消息
    const sendMessage = () => {
      if (!inputMessage.value.trim()) return;
      
      const message = inputMessage.value.trim();
      inputMessage.value = '';
      
      // 通知父组件发送消息
      emit('send-message', message);
    };
    
    return {
      inputMessage,
      sendMessage
    };
  }
};
</script>

<style lang="scss" scoped>
.input-area {
  padding: 16px;
  background-color: white;
  border-top: 1px solid #eee;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.03);
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;

  .message-input {
    flex: 1;
    min-height: 36px;
    max-height: 120px;
    padding: 8px 12px;
    font-size: 14px;
    line-height: 1.5;
    background: #f5f7fa;
    border: 1px solid #eee;
    border-radius: 8px;
    transition: all 0.3s;
    resize: none;

    &:focus {
      outline: none;
      border-color: #1890ff;
      background: #fff;
      box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
    }

    &::placeholder {
      color: #999;
    }
  }

  .send-button {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 60px;
    height: 36px;
    padding: 0 16px;
    border-radius: 8px;
    background: linear-gradient(45deg, #1890ff, #36cfc9);
    cursor: pointer;
    transition: all 0.3s;
    border: none;

    text {
      color: white;
      font-size: 14px;
      font-weight: 500;
    }

    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
    }

    &:active {
      transform: translateY(1px);
    }
  }
}
</style>