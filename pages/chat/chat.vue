<template>
  <view class="container">
    <!-- 左侧侧边栏 - 仅在用户登录时显示 -->
    <view class="sidebar" v-if="isLoggedIn">
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
            :class="{ active: currentSession.id === item.id }"
            @click="switchSession(item)"
          >
            <view class="item-icon">{{ item.type === "doc" ? "📄" : "💬" }}</view>
            <view class="item-info">
              <text class="title">{{ item.title }}</text>
              <view class="last-message" v-if="item.lastMessage">
                <text class="role-badge" :class="item.lastRole === 'user' ? 'user' : 'assistant'">{{ item.lastRole === 'user' ? '问' : '答' }}</text>
                <text class="message-preview">{{ item.lastMessage }}</text>
              </view>
              <text class="time">{{ formatTime(item.time) }}</text>
            </view>
            <view class="item-actions">
              <button class="delete-btn" @click.stop="deleteSessionRecord(item)">
                <text class="delete-icon">×</text>
              </button>
            </view>
          </view>
        </view>
      </scroll-view>
    </view>

    <!-- 右侧主区域 -->
    <view class="main" :class="{ 'full-width': !isLoggedIn }">
      <!-- 未登录提示 -->
      <view class="login-tip" v-if="!isLoggedIn">
        <text>登录后可以保存对话历史</text>
        <button class="login-btn" @click="goToLogin">去登录</button>
      </view>

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
import { ref, reactive, computed, nextTick, onMounted } from "vue";
import { streamChat, formatHistory, handleAIError } from "../../service/kimi_normal";
import { userAvatar, aiAvatar } from "../../static/avatars.js";
import { marked } from 'marked';
import { getSessionList, getSession, createSession, updateSession, deleteSession } from '@/controls/chat-session.js';
import { createMessage, getMessageList, deleteMessages } from '@/controls/chat-message.js';

// 用户登录状态
const isLoggedIn = ref(false);
const username = ref('');
const userId = ref('');

// 检查登录状态
const checkLoginStatus = () => {
  try {
    console.log('开始检查登录状态');
    const loginStatus = uni.getStorageSync('isLogIn');
    const storedUsername = uni.getStorageSync('username');
    const storedUserId = uni.getStorageSync('userId');
    
    console.log('存储的登录信息:', {
      loginStatus,
      storedUsername,
      storedUserId
    });
    
    if (loginStatus && storedUsername && storedUserId) {
      console.log('用户已登录，设置登录状态');
      isLoggedIn.value = true;
      username.value = storedUsername;
      userId.value = storedUserId;
      // 加载用户历史记录
      loadUserHistory();
    } else {
      console.log('用户未登录，清除登录状态',loginStatus);
      isLoggedIn.value = false;
      username.value = '';
      userId.value = '';
      // 清空历史记录
      historyList.value = [];
    }
  } catch (error) {
    console.error('检查登录状态时出错:', error);
    // 发生错误时，默认设置为未登录状态
    isLoggedIn.value = false;
    username.value = '';
    userId.value = '';
    historyList.value = [];
  }
};

// 加载用户历史记录
const loadUserHistory = async () => {
  if (!userId.value) {
    console.error('用户ID为空，无法加载历史记录');
    uni.showToast({
      title: '用户未登录',
      icon: 'none'
    });
    return;
  }

  try {
    console.log('开始加载用户历史记录，用户ID:', userId.value);
    const sessions = await getSessionList();
    
    console.log('加载到的历史记录:', sessions);
    historyList.value = sessions.map(session => ({
      id: session._id,
      title: session.title,
      type: session.type || 'chat',
      time: session.updateTime || session.createTime || Date.now(),
      lastMessage: session.lastMessage,
      lastRole: session.lastRole || 'assistant' // 添加最后消息的角色
    }));
    
    // 如果有历史记录且当前没有选择会话，自动选择第一个
    if (historyList.value.length > 0 && !currentSession.value.id) {
      await switchSession(historyList.value[0]);
    }
  } catch (error) {
    console.error('加载历史记录失败:', error);
    uni.showToast({
      title: error.message || '加载历史记录失败',
      icon: 'none'
    });
  }
};

// 保存聊天历史
const saveChatHistory = async () => {
  try {
    console.log('开始保存聊天历史:', currentSession.value);
    
    if (!userId.value) {
      console.error('用户未登录，无法保存历史');
      return;
    }
    
    // 准备要保存的数据
    const historyData = {
      userId: userId.value,
      title: currentSession.value.title,
      type: currentSession.value.type,
      time: currentSession.value.time,
      messages: currentSession.value.messages
    };
    
    console.log('保存历史数据:', historyData);
    const result = await saveHistory(historyData);
    console.log('保存历史结果:', result);
    
    if (result.code !== 200) {
      throw new Error(result.message || '保存失败');
    }
    
    // 更新当前会话的ID
    if (result.data && result.data._id) {
      currentSession.value.id = result.data._id;
    }
    
    // 重新加载历史记录
    await loadUserHistory();
    
  } catch (error) {
    console.error('保存历史失败:', error);
  }
};

// 跳转到登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/logIn/logIn'
  });
};

// 显示欢迎消息
const showWelcomeMessage = () => {
  const welcomeMessage = {
    role: 'assistant',
    content: '你好！我是你的AI助手，有什么我可以帮你的吗？',
    time: Date.now()
  };
  messageList.value = [welcomeMessage];
  currentSession.value.messages = [welcomeMessage];
};

// 修改 onMounted
onMounted(() => {
  console.log('组件挂载，检查登录状态');
  checkLoginStatus();
  // 初始化时检查是否需要显示欢迎消息
  if (currentSession.value.messages.length === 0) {
    showWelcomeMessage();
  }
});

// 使用uni-app的页面生命周期函数
defineExpose({
  onShow() {
    console.log('页面显示，检查登录状态');
    checkLoginStatus();
  },
  onReady() {
    console.log('页面加载完成');
    scrollToBottom();
  }
});

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

// 状态管理
const messageList = ref([]);
const inputText = ref('');
const isSending = ref(false);
const scrollTop = ref(0);
const currentSession = ref({
  id: '',
  title: '新对话',
  type: 'chat',
  time: Date.now(),
  messages: []
});
const historyList = ref([]);
const files = ref([]);
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
  return inputText.value.trim() && !isSending.value;
});

// 智能生成标题
const generateTitle = (content) => {
  // 移除多余空格和换行
  const cleanContent = content.trim().replace(/\s+/g, ' ');
  
  // 如果内容很短，直接返回
  if (cleanContent.length <= 20) {
    return cleanContent;
  }
  
  // 尝试找到第一个句号、问号或感叹号
  const sentenceEnd = cleanContent.search(/[。？！.!?]/);
  if (sentenceEnd !== -1) {
    // 提取第一个句子
    let title = cleanContent.substring(0, sentenceEnd + 1);
    // 如果第一个句子还是太长，截取前20个字符
    if (title.length > 20) {
      title = title.substring(0, 20) + '...';
    }
    return title;
  }
  
  // 如果没有找到句子结束符，直接截取前20个字符
  return cleanContent.substring(0, 20) + '...';
};

// 发送消息
const send = async () => {
  if (!canSend.value) return;
  
  // 创建用户消息
  const userMessage = {
    role: 'user',
    content: inputText.value,
    time: Date.now()
  };
  
  // 添加到消息列表
  messageList.value.push(userMessage);
  // 同时更新当前会话的消息列表
  currentSession.value.messages.push(userMessage);
  inputText.value = '';
  
  // 添加AI思考状态
  const aiMessage = {
    role: 'assistant',
    content: '',
    thinking: true,
    time: Date.now()
  };
  messageList.value.push(aiMessage);
  
  // 滚动到底部
  await nextTick();
  scrollToBottom();
  
  try {
    isSending.value = true;
    
    // 准备历史消息
    const history = formatHistory(
      messageList.value
        .filter(msg => !msg.thinking)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))
    );
    
    console.log('Sending message with history:', history);
    
    // 调用AI
    await streamChat(
      userMessage.content,
      history,
      (data) => {
        console.log('Received AI response:', data);
        
        if (data.type === 'chunk') {
          aiMessage.content += data.content;
          aiMessage.thinking = false;
          // 强制更新视图
          messageList.value = [...messageList.value];
        } else if (data.type === 'error') {
          aiMessage.content = `错误: ${data.error}`;
          aiMessage.thinking = false;
          // 显示错误提示
          uni.showToast({
            title: data.error,
            icon: 'none',
            duration: 3000
          });
        }
        
        // 每次更新后滚动到底部
        scrollToBottom();
      }
    );
    
    // 完成后，更新当前会话的消息列表
    aiMessage.thinking = false;
    const finalAiMessage = {
      role: 'assistant',
      content: aiMessage.content,
      time: aiMessage.time
    };
    
    // 替换临时消息
    const aiIndex = currentSession.value.messages.length;
    currentSession.value.messages.push(finalAiMessage);
    
    // 更新会话标题和时间
    if (messageList.value.length <= 3) {
      const now = Date.now();
      // 使用智能标题生成
      currentSession.value.title = generateTitle(userMessage.content);
      currentSession.value.time = now;
    }
    
    // 如果用户已登录，每次对话完成后都保存历史记录
    if (isLoggedIn.value) {
      // 检查当前会话是否有ID
      if (!currentSession.value.id) {
        // 如果没有ID，说明是新会话，保存为新记录
        console.log('创建新的历史记录');
        await saveChatHistory();
      } else {
        // 如果有ID，说明是现有会话，更新记录
        console.log('更新现有历史记录');
        
        // 仅保存最新的对话（包含用户消息和AI回复）
        // 这里我们将两条消息一起保存，但不会再次调用updateSessionRecord，避免重复保存
        
        // 先保存用户消息
        console.log('保存用户消息:', userMessage);
        await createMessage(
          currentSession.value.id,
          userMessage.content,
          'user' // 明确指定为用户角色
        );
        
        // 再保存AI回复
        console.log('保存AI回复:', finalAiMessage);
        await createMessage(
          currentSession.value.id,
          finalAiMessage.content,
          'assistant' // 明确指定为AI角色
        );
        
        // 直接更新会话信息，而不是调用updateSessionRecord（避免重复保存消息）
        const updateData = {
          title: currentSession.value.title,
          lastMessage: finalAiMessage.content,
          lastRole: 'assistant'
        };
        await updateSession(currentSession.value.id, updateData);
        
        // 重新加载历史记录以更新侧边栏
        await loadUserHistory();
      }
    }
    
  } catch (error) {
    console.error('Chat error:', error);
    aiMessage.content = handleAIError(error);
    aiMessage.thinking = false;
    
    // 更新到当前会话的消息列表
    const finalAiMessage = {
      role: 'assistant',
      content: aiMessage.content,
      time: aiMessage.time
    };
    currentSession.value.messages.push(finalAiMessage);
    
    // 显示错误提示
    uni.showToast({
      title: handleAIError(error),
      icon: 'none',
      duration: 3000
    });
  } finally {
    isSending.value = false;
    scrollToBottom();
  }
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

// 创建新会话
const createNewChat = () => {
  currentSession.value = {
    id: '',
    title: '新对话',
    type: 'chat',
    time: Date.now(),
    messages: []
  };
  messageList.value = [];
  showWelcomeMessage();
};

// 切换会话
const switchSession = async (session) => {
  try {
    console.log('切换到会话:', session);
    
    // 获取会话详情
    const sessionDetail = await getSession(session.id);
    console.log('会话详情:', sessionDetail);
    
    // 获取会话消息列表
    const messages = await getMessageList(session.id);
    console.log('会话消息:', messages);
    
    // 检查是否有消息
    if (!messages || messages.length === 0) {
      console.warn('该会话没有消息记录');
      
      // 如果没有消息，创建一个欢迎消息
      const welcomeMessage = {
        role: 'assistant',
        content: '欢迎回来！您可以继续之前的对话或者开始新的话题。',
        time: Date.now()
      };
      
      // 更新当前会话
      currentSession.value = {
        id: session.id,
        title: sessionDetail.title,
        type: sessionDetail.type || 'chat',
        time: sessionDetail.updateTime || sessionDetail.createTime,
        messages: [welcomeMessage]
      };
      
      // 更新消息列表
      messageList.value = [welcomeMessage];
    } else {
      // 更新当前会话
      currentSession.value = {
        id: session.id,
        title: sessionDetail.title,
        type: sessionDetail.type || 'chat',
        time: sessionDetail.updateTime || sessionDetail.createTime,
        messages: messages.map(msg => ({
          role: msg.role || 'assistant', // 使用消息的角色或默认为assistant
          content: msg.content,
          time: msg.createTime || msg.create_time
        }))
      };
      
      // 输出消息的角色分布情况，用于调试
      const roleCounts = messages.reduce((acc, msg) => {
        const role = msg.role || 'unknown';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
      console.log('消息角色分布:', roleCounts);
      
      // 更新消息列表
      messageList.value = [...currentSession.value.messages];
    }
    
    console.log('会话切换成功');
    
    // 滚动到底部
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error('切换会话失败:', error);
    uni.showToast({
      title: error.message || '切换会话失败',
      icon: 'none'
    });
  }
};

// 删除会话
const deleteSessionRecord = async (session) => {
  try {
    console.log('删除会话:', session);
    
    // 显示确认对话框
    uni.showModal({
      title: '删除会话',
      content: '确定要删除该会话吗？所有相关消息将被永久删除。',
      success: async (res) => {
        if (res.confirm) {
          // 先删除所有关联的消息
          console.log('删除会话关联的消息');
          await deleteMessages(session.id);
          
          // 然后删除会话
          console.log('删除会话');
          await deleteSession(session.id);
          
          // 重新加载历史记录
          await loadUserHistory();
          
          // 如果删除的是当前会话，创建新会话
          if (currentSession.value.id === session.id) {
            createNewChat();
          }
          
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  } catch (error) {
    console.error('删除会话失败:', error);
    uni.showToast({
      title: error.message || '删除会话失败',
      icon: 'none'
    });
  }
};

// 更新会话
const updateSessionRecord = async (session) => {
  try {
    console.log('更新会话:', session);
    
    // 获取最后一条消息
    const lastMessage = session.messages[session.messages.length - 1];
    
    // 准备更新数据，注意字段命名
    const updateData = {
      title: session.title,
      lastMessage: lastMessage?.content || '',
      lastRole: lastMessage?.role || '' // 保存最后消息的角色
    };
    
    // 更新会话信息
    await updateSession(session.id, updateData);
    
    // 如果有新消息，保存消息
    if (lastMessage) {
      console.log('保存新消息:', lastMessage);
      await createMessage(
        session.id, 
        lastMessage.content, 
        lastMessage.role || 'assistant' // 确保消息有角色
      );
    }
    
    console.log('会话更新成功');
    
    // 重新加载历史记录
    await loadUserHistory();
  } catch (error) {
    console.error('更新会话失败:', error);
    uni.showToast({
      title: error.message || '更新会话失败',
      icon: 'none'
    });
  }
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) {
    return '--:--:--'; // 处理无效时间戳
  }
  try {
    const date = new Date(timestamp);
    // 检查是否为有效日期
    if (isNaN(date.getTime())) {
      return '--:--:--';
    }
    // 完整格式: 年-月-日 时:分
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (error) {
    console.error('时间格式化错误:', error, timestamp);
    return '--:--:--';
  }
};

// 新增文件状态文本显示方法
const fileStatusText = (file) => {
  switch (file.status) {
    case FILE_STATUS.PENDING:
      return "待处理";
    case FILE_STATUS.UPLOADING:
      return "上传中...";
    case FILE_STATUS.ANALYZING:
      return "分析中...";
    case FILE_STATUS.SUCCESS:
      return "已就绪";
    case FILE_STATUS.ERROR:
      return "错误";
    default:
      return "未知状态";
  }
};

// 移除文件
const removeFile = (index) => {
  files.value.splice(index, 1);
};

// 触发文件选择
const triggerFile = () => {
  fileInput.value.click();
};

// 添加文件
const addFiles = (event) => {
  const fileList = event.target.files;
  if (!fileList || fileList.length === 0) return;

  Array.from(fileList).forEach(file => {
    files.value.push({
      name: file.name,
      status: FILE_STATUS.PENDING
    });
  });

  // 清空文件输入框，以便可以再次选择相同的文件
  event.target.value = '';
};

// 格式化完整日期
const formatFullDate = (timestamp) => {
  if (!timestamp) {
    return '未知日期';
  }
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return '未知日期';
    }
    // 获取当前日期
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 判断是否为今天、昨天或更早
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    }
  } catch (error) {
    console.error('日期格式化错误:', error, timestamp);
    return '未知日期';
  }
};

// 计算属性：按日期分组的历史列表
const groupedHistoryList = computed(() => {
  const groups = {};
  
  historyList.value.forEach(item => {
    const date = formatFullDate(item.time);
    if (!groups[date]) {
      groups[date] = [];
    }
    // 处理消息预览，限制为10个字符
    const processedItem = {
      ...item,
      lastMessage: item.lastMessage ? item.lastMessage.slice(0, 10) + (item.lastMessage.length > 10 ? '...' : '') : ''
    };
    groups[date].push(processedItem);
  });
  
  // 转换为数组格式，按日期排序
  return Object.keys(groups).map(date => ({
    date,
    items: groups[date]
  })).sort((a, b) => {
    // 日期排序：今天 > 昨天 > 其他日期（降序）
    if (a.date === '今天') return -1;
    if (b.date === '今天') return 1;
    if (a.date === '昨天') return -1;
    if (b.date === '昨天') return 1;
    return new Date(b.date) - new Date(a.date);
  });
});
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
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .header {
      padding: 24px;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;

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
      overflow-y: auto;
      overflow-x: hidden;
      flex: 1;

      .date-divider {
        font-size: 12px;
        color: #999;
        margin: 12px 0 8px 8px;
        padding-left: 8px;
        position: relative;
        
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 3px;
          height: 12px;
          background: #1890ff;
          transform: translateY(-50%);
          border-radius: 3px;
        }
      }

      .history-item {
        display: flex;
        align-items: center;
        padding: 12px 10px;
        border-radius: 8px;
        margin: 6px 0;
        transition: all 0.3s;
        cursor: pointer;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;

        &:hover {
          background: #f0f7ff;
          
          .item-actions {
            opacity: 1;
            right: 8px;
          }
        }

        &.active {
          background: #e6f7ff;
          border-left: 3px solid #1890ff;
          
          .item-actions {
            opacity: 1;
          }
        }

        .item-icon {
          font-size: 20px;
          margin-right: 10px;
          min-width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f7ff;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .item-info {
          flex: 1;
          overflow: hidden;
          min-width: 0;
          padding-right: 24px; // 为删除按钮留出空间

          .title {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: #333;
            margin-bottom: 4px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .last-message {
            display: flex;
            align-items: center;
            margin-bottom: 4px;
            gap: 4px;
            overflow: hidden;
            
            .role-badge {
              font-size: 10px;
              padding: 1px 4px;
              border-radius: 3px;
              font-weight: bold;
              flex-shrink: 0;
              
              &.user {
                background: #f0f7ff;
                color: #1890ff;
              }
              
              &.assistant {
                background: #f6fffb;
                color: #52c41a;
              }
            }
            
            .message-preview {
              font-size: 12px;
              color: #666;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              flex: 1;
              min-width: 0;
              max-width: 120px; // 限制最大宽度
            }
          }

          .time {
            font-size: 12px;
            color: #999;
            display: block;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        }

        .item-actions {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0;
          transition: all 0.2s ease;
          flex-shrink: 0;
          
          .delete-btn {
            background: none;
            border: none;
            padding: 0;
            margin: 0;
            cursor: pointer;
            color: #999;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            transition: all 0.2s;
            
            &:hover {
              background: rgba(0, 0, 0, 0.05);
              color: #ff4d4f;
            }
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

    &.full-width {
      width: 100%;
    }

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
          max-width: 80%;
          padding: 14px 18px;
          border-radius: 12px;
          background: white;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          position: relative;
          margin-right: 60px;

          .role-tag {
            position: absolute;
            top: -6px;
            left: -6px;
            width: 20px;
            height: 20px;
            background: #f0f7ff;
            color: #1890ff;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            border: 2px solid #fff;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
            
            &.answer {
              background: #f6fffb;
              color: #52c41a;
            }
          }

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

    .login-tip {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: #f0f7ff;
      border-bottom: 1px solid #e6f7ff;
      
      text {
        color: #1890ff;
        font-size: 14px;
        margin-right: 16px;
      }
      
      .login-btn {
        background: #1890ff;
        color: white;
        border: none;
        padding: 6px 16px;
        border-radius: 4px;
        font-size: 14px;
        transition: all 0.3s;
        
        &:hover {
          background: #40a9ff;
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
</style>
