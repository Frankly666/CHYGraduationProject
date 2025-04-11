<template>
  <view class="sidebar">
    <view class="header">
      <text class="logo">EduResearch</text>
      <button class="new-chat" @click="createNewChat">
        <text>+ 新对话</text>
      </button>
    </view>

    <scroll-view class="history-list" scroll-y>
      <!-- 按日期分组显示历史记录 -->
      <view v-for="group in groupedHistoryList" :key="group.date" class="history-group">
        <view class="date-divider">{{ group.date }}</view>
        <view
          v-for="item in group.items"
          :key="item.id"
          class="history-item"
          :class="{ active: currentSessionId === item.id }"
          @click="switchSession(item)"
        >
          <view class="item-icon" :title="item.isFileChat && item.fileInfo ? item.fileInfo.name : ''">{{ item.isFileChat ? "📄" : (item.type === "doc" ? "📄" : "💬") }}</view>
          <view class="item-info">
            <!-- 如果是文件对话，在标题旁显示文件标签 -->
            <view class="title-row">
              <text class="title">{{ item.title }}</text>
              <view class="file-tag" v-if="item.isFileChat && item.fileInfo">
                <text class="file-name">{{ item.fileInfo.name }}</text>
              </view>
            </view>
            <view class="last-message" v-if="item.lastMessage">
              <text class="role-badge" :class="item.lastRole === 'user' ? 'user' : 'assistant'">{{ item.lastRole === 'user' ? '问' : '答' }}</text>
              <text class="message-preview">{{ item.lastMessage }}</text>
            </view>
            <text class="time">{{ formatTime(item.time) }}</text>
          </view>
          <view class="item-actions">
            <button class="delete-btn" @click.stop="deleteSessionRecord(item)" :disabled="isDeleting" :class="{ 'disabled': isDeleting }">
              <text class="delete-icon">×</text>
            </button>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { ref, computed } from 'vue';
import { getSessionList, deleteSession } from '@/controls/chat-session.js';
import { deleteMessages } from '@/controls/chat-message.js';

export default {
  name: 'ChatHistory',
  props: {
    currentSessionId: {
      type: String,
      default: ''
    }
  },
  emits: ['switch-session', 'create-new-chat'],
  setup(props, { emit }) {
    const historyList = ref([]);
    const isDeleting = ref(false);
    
    // 按日期分组的历史记录
    const groupedHistoryList = computed(() => {
      const groups = {};
      
      historyList.value.forEach(item => {
        const date = new Date(item.time);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        let dateKey;
        
        if (date.toDateString() === today.toDateString()) {
          dateKey = '今天';
        } else if (date.toDateString() === yesterday.toDateString()) {
          dateKey = '昨天';
        } else {
          dateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        }
        
        if (!groups[dateKey]) {
          groups[dateKey] = {
            date: dateKey,
            items: []
          };
        }
        
        groups[dateKey].items.push(item);
      });
      
      // 将分组转换为数组并按日期排序
      return Object.values(groups).sort((a, b) => {
        if (a.date === '今天') return -1;
        if (b.date === '今天') return 1;
        if (a.date === '昨天') return -1;
        if (b.date === '昨天') return 1;
        return b.date.localeCompare(a.date);
      });
    });
    
    // 加载用户历史记录
    const loadUserHistory = async () => {
      try {
        const userId = uni.getStorageSync('userId');
        if (!userId) {
          console.error('用户ID为空，无法加载历史记录');
          return;
        }
        
        console.log('开始加载用户历史记录，用户ID:', userId);
        const sessions = await getSessionList();
        
        console.log('加载到的历史记录:', sessions);
        historyList.value = sessions.map(session => {
          // 基本会话信息
          const sessionInfo = {
            id: session._id,
            title: session.title,
            type: session.type || 'chat',
            time: session.updateTime || session.createTime || Date.now(),
            lastMessage: session.lastMessage,
            lastRole: session.lastRole || 'assistant'
          };
          
          // 如果是文件对话，添加文件信息
          if (session.isFileChat && session.fileInfo) {
            console.log('加载文件对话信息:', session.fileInfo);
            sessionInfo.isFileChat = true;
            sessionInfo.fileInfo = session.fileInfo;
          }
          
          return sessionInfo;
        });
      } catch (error) {
        console.error('加载历史记录失败:', error);
        uni.showToast({
          title: error.message || '加载历史记录失败',
          icon: 'none'
        });
      }
    };
    
    // 切换会话
    const switchSession = (session) => {
      emit('switch-session', session);
    };
    
    // 创建新会话
    const createNewChat = () => {
      emit('create-new-chat');
    };
    
    // 删除会话记录
    const deleteSessionRecord = async (session) => {
      try {
        if (isDeleting.value) return;
        
        isDeleting.value = true;
        
        // 确认删除
        uni.showModal({
          title: '确认删除',
          content: '确定要删除这个对话吗？此操作不可恢复。',
          success: async (res) => {
            if (res.confirm) {
              try {
                // 删除会话及其消息
                await deleteSession(session.id);
                await deleteMessages(session.id);
                
                // 从列表中移除
                historyList.value = historyList.value.filter(item => item.id !== session.id);
                
                // 如果删除的是当前会话，通知父组件创建新会话
                if (session.id === props.currentSessionId) {
                  createNewChat();
                }
                
                uni.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
              } catch (error) {
                console.error('删除会话失败:', error);
                uni.showToast({
                  title: error.message || '删除失败',
                  icon: 'none'
                });
              }
            }
            isDeleting.value = false;
          },
          fail: () => {
            isDeleting.value = false;
          }
        });
      } catch (error) {
        console.error('删除会话操作失败:', error);
        isDeleting.value = false;
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
    
    // 初始加载历史记录
    loadUserHistory();
    
    return {
      historyList,
      groupedHistoryList,
      isDeleting,
      switchSession,
      createNewChat,
      deleteSessionRecord,
      formatTime,
      loadUserHistory
    };
  }
};
</script>

<style lang="scss" scoped>
.sidebar {
  width: 280px;
  height: 100%;
  background-color: #f5f7fa;
  border-right: 1px solid #eee;
  display: flex;
  flex-direction: column;
  
  .header {
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #eee;
    
    .logo {
      font-size: 18px;
      font-weight: 600;
      color: #1890ff;
    }
    
    .new-chat {
      background: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.3s;
      
      &:hover {
        background: #40a9ff;
        transform: translateY(-1px);
      }
      
      &:active {
        transform: translateY(1px);
      }
    }
  }
  
  .history-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    
    .history-group {
      margin-bottom: 16px;
      
      .date-divider {
        font-size: 12px;
        color: #999;
        padding: 4px 8px;
        margin-bottom: 8px;
      }
      
      .history-item {
        display: flex;
        align-items: center;
        padding: 10px 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.3s;
        position: relative;
        
        &:hover {
          background-color: #e6f7ff;
          
          .item-actions {
            opacity: 1;
          }
        }
        
        &.active {
          background-color: #e6f7ff;
          border-left: 3px solid #1890ff;
        }
        
        .item-icon {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background-color: #f0f2f5;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          margin-right: 12px;
          flex-shrink: 0;
        }
        
        .item-info {
          flex: 1;
          min-width: 0;
          
          .title-row {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            
            .title {
              font-size: 14px;
              font-weight: 500;
              color: #333;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              max-width: 150px;
            }
            
            .file-tag {
              margin-left: 8px;
              padding: 2px 6px;
              background-color: #f0f2f5;
              border-radius: 4px;
              
              .file-name {
                font-size: 12px;
                color: #666;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 80px;
              }
            }
          }
          
          .last-message {
            display: flex;
            align-items: center;
            font-size: 12px;
            color: #999;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-bottom: 4px;
            
            .role-badge {
              padding: 1px 4px;
              border-radius: 3px;
              margin-right: 4px;
              font-size: 10px;
              
              &.user {
                background-color: rgba(24, 144, 255, 0.1);
                color: #1890ff;
              }
              
              &.assistant {
                background-color: rgba(82, 196, 26, 0.1);
                color: #52c41a;
              }
            }
            
            .message-preview {
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
          
          .time {
            font-size: 11px;
            color: #bbb;
          }
        }
        
        .item-actions {
          opacity: 0;
          transition: opacity 0.3s;
          
          .delete-btn {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, 0.05);
            display: flex;
            align-items: center;
            justify-content: center;
            border: none;
            cursor: pointer;
            transition: all 0.3s;
            
            &:hover {
              background-color: rgba(245, 34, 45, 0.1);
              
              .delete-icon {
                color: #f5222d;
              }
            }
            
            &.disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
            
            .delete-icon {
              font-size: 16px;
              color: #999;
            }
          }
        }
      }
    }
  }
}

.global-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.1);
  z-index: 999;
}
</style>