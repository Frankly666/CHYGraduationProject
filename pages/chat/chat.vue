<template>
  <view class="container">
    <!-- 全局遮罩层，在删除操作进行时显示 -->
    <view class="global-mask" v-if="isDeleting"></view>
    
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

    <!-- 右侧主区域 -->
    <view class="main" :class="{ 'full-width': !isLoggedIn }">
      <!-- 未登录提示 -->
      <view class="login-tip" v-if="!isLoggedIn">
        <text>登录后可以保存对话历史</text>
        <button class="login-btn" @click="goToLogin">去登录</button>
      </view>

      <!-- 知识图谱展示区域 -->
      <view class="knowledge-graph-container" v-if="showKnowledgeGraph && graphData">
        <KnowledgeGraph :graph-data="graphData" />
        <button class="close-graph-btn" @click="showKnowledgeGraph = false">关闭图谱</button>
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
        <view class="file-upload" @click="triggerFileInput" v-if="!isFileChat">
          <text class="icon">📁</text>
        </view>
        <view class="file-controls" v-if="isFileChat">
          <view class="current-file">
            <text class="icon">📄</text>
            <text class="file-name">{{ currentFile?.name }}</text>
          </view>
          <button 
            v-if="analysisResult && analysisResult.suitable" 
            class="generate-graph-btn" 
            @click="handleGenerateGraph"
            :disabled="isAnalyzing"
          >
            {{ isAnalyzing ? '生成中...' : '生成知识图谱' }}
          </button>
        </view>
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
import { uploadFile, getFileContent, chatWithFile } from '@/service/file.js';
import { checkFileForKnowledgeGraph, generateKnowledgeGraph } from '@/service/knowledge-graph.js';
import KnowledgeGraph from '@/components/KnowledgeGraph.vue';
import { getUserHistory, saveHistory, updateHistory, deleteHistory, getHistoryById } from '@/controls/history.js';

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
    console.log('开始保存聊天历史...');
    if (!currentSession.value || !currentSession.value.messages || currentSession.value.messages.length === 0) {
      console.log('没有消息需要保存');
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

    // 如果是文件对话，添加文件信息
    if (currentSession.value.type === 'file' && currentFile.value) {
      console.log('保存文件对话信息:', currentFile.value);
      
      // 添加文件信息
      historyData.fileInfo = {
        id: currentFile.value.id,
        name: currentFile.value.name,
        size: currentFile.value.size,
        type: currentFile.value.type,
        uploadTime: currentFile.value.uploadTime || Date.now()
      };
      
      // 添加文件问答标识
      historyData.isFileChat = true;
      
      // 保存最后一条消息作为预览
      const lastMessage = currentSession.value.messages[currentSession.value.messages.length - 1];
      if (lastMessage) {
        historyData.lastMessage = lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : '');
        historyData.lastRole = lastMessage.role;
      }
    }

    console.log('准备保存的历史数据:', historyData);
    
    // 调用保存历史记录的函数
    const result = await saveHistory(historyData);
    console.log('保存历史记录结果:', result);
    
    // 更新当前会话ID
    if (result && result.id) {
      currentSession.value.id = result.id;
    }
    
    // 更新历史列表
    await loadUserHistory();
  } catch (error) {
    console.error('保存聊天历史失败:', error);
    uni.showToast({
      title: error.message || '保存失败',
      icon: 'none'
    });
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
const inputMessage = ref('');
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
const currentFile = ref(null);

// 知识图谱相关状态
const showKnowledgeGraph = ref(false);
const graphData = ref(null);
const isAnalyzing = ref(false);
const analysisResult = ref(null);
// currentFile已在状态管理部分定义
const isFileChat = ref(false);

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
  return inputMessage.value.trim() && !isSending.value;
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
const sendMessage = async () => {
  if (!inputMessage.value.trim()) return;
  
  const userMessage = inputMessage.value.trim();
  inputMessage.value = '';
  
  // 添加用户消息
  currentSession.value.messages.push({
    role: 'user',
    content: userMessage,
    time: Date.now()
  });
  
  // 检查当前会话是否有ID，如果没有则创建新会话
  if (!currentSession.value.id && isLoggedIn.value) {
    try {
      console.log('首次发送消息，创建新会话');
      // 创建新会话
      const sessionResult = await createSession(currentSession.value.title, currentSession.value.type);
      console.log('创建会话结果:', sessionResult);
      
      // 检查会话ID，云函数返回的ID在_id字段中
      if (!sessionResult || (!sessionResult._id && !sessionResult.id)) {
        throw new Error('创建会话失败：未获取到会话ID');
      }
      
      // 获取会话ID，优先使用_id字段，兼容id字段
      const sessionId = sessionResult._id || sessionResult.id;
      currentSession.value.id = sessionId;
      console.log('成功创建会话，ID:', sessionId);
    } catch (error) {
      console.error('创建会话失败:', error);
      uni.showToast({
        title: error.message || '创建会话失败',
        icon: 'none'
      });
      // 即使创建会话失败，也继续处理消息，只是不会保存到数据库
    }
  }
  
  // 保存用户消息到数据库
  if (currentSession.value.id) {
    await createMessage(
      currentSession.value.id,
      userMessage,
      'user'
    );
  }
  
  // 添加助手消息占位
  const assistantMessageIndex = currentSession.value.messages.length;
  currentSession.value.messages.push({
    role: 'assistant',
    content: '',
    thinking: true,
    time: Date.now()
  });
  
  // 更新消息列表以显示思考状态
  messageList.value = [...currentSession.value.messages];
  
  try {
    let response;
    if (isFileChat.value && currentFile.value) {
      console.log('开始文件问答:', {
        question: userMessage,
        fileContent: currentFile.value.content
      });
      
      // 准备历史消息，过滤掉空内容和系统消息
      const historyMessages = currentSession.value.messages
        .filter(msg => 
          msg.role !== 'system' && 
          msg.role !== 'thinking' && 
          msg.content && 
          msg.content.trim() !== '' &&
          !msg.thinking
        )
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      console.log('文件问答历史消息:', historyMessages);
      
      // 确保文件信息完整
      if (!currentFile.value || !currentFile.value.content) {
        throw new Error('文件信息不完整，请重新上传文件');
      }
      
      // 调用文件问答接口，传入进度回调函数和历史消息
      response = await chatWithFile(
        currentFile.value.content, 
        userMessage,
        (chunk, fullResponse) => {
          // 更新助手消息内容
          currentSession.value.messages[assistantMessageIndex] = {
            role: 'assistant',
            content: fullResponse,
            thinking: false,
            time: Date.now()
          };
          
          // 更新消息列表
          messageList.value = [...currentSession.value.messages];
          
          // 滚动到底部
          nextTick(() => {
            scrollToBottom();
          });
        },
        historyMessages
      );
      
      console.log('文件问答完成');
      
      // 保存助手消息到数据库
      if (currentSession.value.id) {
        await createMessage(
          currentSession.value.id,
          response,
          'assistant'
        );
      }
    } else {
      // 普通对话
      console.log('开始普通对话:', userMessage);
      
      // 准备历史消息，过滤掉空内容和系统消息
      const historyMessages = currentSession.value.messages
        .filter(msg => 
          msg.role !== 'system' && 
          msg.role !== 'thinking' && 
          msg.content && 
          msg.content.trim() !== ''
        )
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));
      
      console.log('历史消息:', historyMessages);
      
      // 使用 streamChat 替代 chatWithAI，传入历史消息
      response = await streamChat(userMessage, historyMessages, (data) => {
        if (data.type === 'chunk') {
          // 更新助手消息内容
          currentSession.value.messages[assistantMessageIndex] = {
            role: 'assistant',
            content: data.fullContent,
            thinking: false,
            time: Date.now()
          };
          
          // 更新消息列表
          messageList.value = [...currentSession.value.messages];
          
          // 滚动到底部
          nextTick(() => {
            scrollToBottom();
          });
        } else if (data.type === 'error') {
          throw new Error(data.error);
        }
      });
      
      // 保存助手消息到数据库
      if (currentSession.value.id) {
        await createMessage(
          currentSession.value.id,
          response,
          'assistant'
        );
      }
    }
    
    // 更新会话信息
    if (currentSession.value.id) {
      // 获取最后一条消息
      const lastMessage = currentSession.value.messages[currentSession.value.messages.length - 1];
      
      // 更新会话信息
      await updateSession(currentSession.value.id, {
        lastMessage: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
        lastRole: lastMessage.role
      });
      
      // 更新左侧历史记录列表，确保只有在实际发送消息后才会显示在历史记录中
      await loadUserHistory();
    }
    
    // 滚动到底部
    await nextTick();
    scrollToBottom();
    
  } catch (error) {
    console.error('发送消息失败:', error);
    // 更新错误消息
    currentSession.value.messages[assistantMessageIndex] = {
      role: 'assistant',
      content: `抱歉，处理您的请求时出现错误：${error.message}`,
      thinking: false,
      time: Date.now()
    };
    // 更新消息列表
    messageList.value = [...currentSession.value.messages];
    
    // 保存错误消息到数据库
    if (currentSession.value.id) {
      await createMessage(
        currentSession.value.id,
        `抱歉，处理您的请求时出现错误：${error.message}`,
        'assistant'
      );
    }
  }
};

// 滚动到底部
// 处理文件上传
const handleFileUpload = async (file) => {
  try {
    isAnalyzing.value = true;
    
    // 上传文件
    const uploadResult = await uploadFile(file);
    if (!uploadResult || !uploadResult.id) {
      throw new Error('文件上传失败');
    }
    
    // 获取文件内容
    const fileContent = await getFileContent(uploadResult.id);
    
    // 检查文件是否适合生成知识图谱
    const checkResult = await checkFileForKnowledgeGraph(fileContent);
    analysisResult.value = checkResult;
    
    // 更新当前文件信息
    currentFile.value = {
      id: uploadResult.id,
      name: file.name,
      content: fileContent
    };
    isFileChat.value = true;
    
    if (!checkResult.suitable) {
      uni.showToast({
        title: '当前文件不适合生成知识图谱',
        icon: 'none'
      });
    }
  } catch (error) {
    console.error('处理文件失败:', error);
    uni.showToast({
      title: error.message || '处理文件失败',
      icon: 'none'
    });
    currentFile.value = null;
    analysisResult.value = null;
  } finally {
    isAnalyzing.value = false;
  }
};

// 生成知识图谱
const handleGenerateGraph = async () => {
  try {
    isAnalyzing.value = true;
    
    const graphResult = await generateKnowledgeGraph(currentFile.value.content);
    graphData.value = graphResult;
    showKnowledgeGraph.value = true;
  } catch (error) {
    console.error('生成知识图谱失败:', error);
    uni.showToast({
      title: error.message || '生成知识图谱失败',
      icon: 'none'
    });
  } finally {
    isAnalyzing.value = false;
  }
};

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
const createNewChat = async () => {
  try {
    console.log('创建新会话');
    
    // 不再立即创建会话记录，而是只在内存中创建临时会话
    // 只有在用户实际发送消息时才会创建真正的会话记录
    
    // 更新当前会话（仅在内存中）
    currentSession.value = {
      id: '', // 空ID表示这是一个临时会话，尚未保存到数据库
      title: '新对话',
      type: 'chat',
      time: Date.now(),
      messages: []
    };
    
    // 重置文件状态
    isFileChat.value = false;
    currentFile.value = null;
    
    // 显示欢迎消息
    showWelcomeMessage();
    
    // 更新消息列表（仅在内存中，不保存到数据库）
    // 欢迎消息已经在showWelcomeMessage函数中添加到currentSession.value.messages
    messageList.value = [...currentSession.value.messages];
    
    // 不再保存欢迎消息到数据库，只有用户实际发送消息时才会创建会话记录
    
    // 不再立即更新左侧历史记录列表，等待用户实际发送消息后再更新
    
  } catch (error) {
    console.error('创建新会话失败:', error);
    uni.showToast({
      title: error.message || '创建新会话失败',
      icon: 'none'
    });
  }
};

// 添加加载状态变量
const isLoading = ref(false);

// 切换会话
const switchSession = async (session) => {
  try {
    console.log('切换到会话:', session);
    
    // 设置加载状态为true
    isLoading.value = true;
    
    // 显示加载提示
    uni.showLoading({
      title: '加载历史记录中...',
      mask: true // 显示透明蒙层，防止触摸穿透
    });
    
    // 检查是否为文件对话
    if (session.isFileChat && session.fileInfo) {
      console.log('切换到文件对话，文件信息:', session.fileInfo);
      try {
        // 获取文件内容
        const fileContent = await getFileContent(session.fileInfo.id);
        
        if (fileContent) {
          isFileChat.value = true;
          currentFile.value = {
            id: session.fileInfo.id,
            name: session.fileInfo.name,
            size: session.fileInfo.size,
            type: session.fileInfo.type,
            uploadTime: session.fileInfo.uploadTime || Date.now(),
            content: fileContent
          };
        } else {
          console.warn('文件内容为空，重置文件状态');
          isFileChat.value = false;
          currentFile.value = null;
        }
      } catch (error) {
        console.error('获取文件内容失败:', error);
        isFileChat.value = false;
        currentFile.value = null;
        // 不抛出错误，而是显示提示并继续加载会话
        uni.showToast({
          title: '文件内容加载失败，仅显示对话记录',
          icon: 'none',
          duration: 2000
        });
      }
    } else {
      // 非文件对话，重置文件相关状态
      isFileChat.value = false;
      currentFile.value = null;
    }
    
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
      
      // 保存欢迎消息到数据库
      await createMessage(
        session.id,
        welcomeMessage.content,
        welcomeMessage.role
      );
      
      // 更新会话消息列表
      currentSession.value = {
        ...session,
        messages: [welcomeMessage]
      };
    } else {
      // 更新会话消息列表
      currentSession.value = {
        ...session,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          time: msg.createTime || Date.now()
        }))
      };
    }
    
    // 更新消息列表
    messageList.value = [...currentSession.value.messages];
    
    // 如果是文件对话，设置文件状态和分析结果
    if (session.isFileChat && session.fileInfo) {
      console.log('加载文件对话信息:', session.fileInfo);
      isFileChat.value = true;
      currentFile.value = session.fileInfo;
      
      // 恢复文件内容和分析结果
      if (session.fileInfo.content) {
        currentFile.value.content = session.fileInfo.content;
      }
      if (session.fileInfo.analysisResult) {
        analysisResult.value = session.fileInfo.analysisResult;
      }
    } else {
      isFileChat.value = false;
      currentFile.value = null;
      analysisResult.value = null;
    }
    
    // 滚动到底部
    await nextTick();
    scrollToBottom();
    
  } catch (error) {
    console.error('切换会话失败:', error);
    uni.showToast({
      title: error.message || '切换会话失败',
      icon: 'none'
    });
  } finally {
    // 无论成功或失败，都隐藏加载提示并重置加载状态
    uni.hideLoading();
    isLoading.value = false;
  }
};

// 添加删除加载状态变量
const isDeleting = ref(false);

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
          // 设置删除状态为true
          isDeleting.value = true;
          
          // 显示加载提示
          uni.showLoading({
            title: '正在删除...',
            mask: true // 显示透明蒙层，防止触摸穿透
          });
          
          try {
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
          } catch (error) {
            console.error('删除会话失败:', error);
            uni.showToast({
              title: error.message || '删除会话失败',
              icon: 'none'
            });
          } finally {
            // 无论成功或失败，都隐藏加载提示并重置删除状态
            uni.hideLoading();
            isDeleting.value = false;
          }
        }
      }
    });
  } catch (error) {
    console.error('删除会话失败:', error);
    uni.showToast({
      title: error.message || '删除会话失败',
      icon: 'none'
    });
    // 确保删除状态被重置
    isDeleting.value = false;
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

// 修改触发文件选择的函数
const triggerFileInput = () => {
  console.log('触发文件选择');
  try {
    // 使用 uni.chooseFile API
    uni.chooseFile({
      count: 1,
      type: 'all',
      extension: ['.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.md', 
                 '.jpeg', '.png', '.bmp', '.gif', '.svg', '.svgz', '.webp', '.ico', '.xbm', 
                 '.dib', '.pjp', '.tif', '.pjpeg', '.avif', '.dot', '.apng', '.epub', '.tiff', 
                 '.jfif', '.html', '.json', '.mobi', '.log', '.go', '.h', '.c', '.cpp', '.cxx', 
                 '.cc', '.cs', '.java', '.js', '.css', '.jsp', '.php', '.py', '.py3', '.asp', 
                 '.yaml', '.yml', '.ini', '.conf', '.ts', '.tsx'],
      success: (res) => {
        console.log('文件选择成功:', res);
        if (res.tempFiles && res.tempFiles.length > 0) {
          handleFileSelected(res.tempFiles[0]);
        }
      },
      fail: (err) => {
        console.error('文件选择失败:', err);
        uni.showToast({
          title: '选择文件失败',
          icon: 'none'
        });
      }
    });
  } catch (error) {
    console.error('触发文件选择失败:', error);
  }
};

// 修改文件处理函数
const handleFileSelected = async (file) => {
  console.log('处理选择的文件:', file);
  try {
    // 检查用户是否已登录
    if (!isLoggedIn.value || !userId.value) {
      console.error('用户未登录，无法处理文件');
      uni.showToast({
        title: '请先登录后再上传文件',
        icon: 'none'
      });
      return;
    }
    
    console.log('文件信息:', {
      name: file.name || file.path.split('/').pop(),
      size: file.size,
      type: file.type
    });
    
    // 检查文件大小
    if (file.size > 100 * 1024 * 1024) { // 100MB
      console.error('文件大小超过限制:', file.size);
      uni.showToast({
        title: '文件大小不能超过100MB',
        icon: 'none'
      });
      return;
    }
    
    // 显示上传中提示
    uni.showLoading({
      title: '正在上传文件...',
      mask: true
    });
    
    let sessionId = currentSession.value.id;
    
    // 如果当前没有会话，则创建一个新会话
    if (!sessionId) {
      console.log('当前没有会话，创建文件问答会话');
      try {
        // 创建会话记录
        console.log('创建会话记录');
        const fileName = file.name || file.path.split('/').pop();
        const sessionResult = await createSession(fileName, 'file');
        console.log('创建会话结果:', sessionResult);
        
        if (!sessionResult || !sessionResult._id) {
          throw new Error('创建会话失败：未获取到会话ID');
        }
        
        sessionId = sessionResult._id;
        console.log('成功创建会话，ID:', sessionId);
      } catch (error) {
        console.error('创建会话失败:', error);
        throw new Error('创建会话失败：' + (error.message || '未知错误'));
      }
    } else {
      console.log('在当前会话中继续对话，会话ID:', sessionId);
    }
    
    // 上传文件
    console.log('开始上传文件到服务器');
    const uploadResult = await uploadFile(file);
    console.log('文件上传结果:', uploadResult);
    
    if (!uploadResult || !uploadResult.id) {
      throw new Error('文件上传失败：未获取到文件ID');
    }
    
    // 获取文件内容
    console.log('开始获取文件内容');
    const fileContent = await getFileContent(uploadResult.id);
    console.log('文件内容获取成功');
    
    // 更新当前文件状态
    currentFile.value = {
      name: file.name || file.path.split('/').pop(),
      size: file.size,
      type: file.type,
      id: uploadResult.id,
      content: fileContent,
      uploadTime: Date.now()
    };
    
    // 更新会话信息，包括文件分析结果
    try {
      await updateSession(sessionId, {
        userId: userId.value,
        isFileChat: true,
        fileInfo: {
          id: currentFile.value.id,
          name: currentFile.value.name,
          size: currentFile.value.size,
          type: currentFile.value.type,
          uploadTime: currentFile.value.uploadTime,
          content: fileContent,
          analysisResult: analysisResult.value
        }
      });
      console.log('会话信息更新成功');
    } catch (error) {
      console.error('更新会话信息失败:', error);
      // 继续执行，不影响主要功能
    }
    
    // 更新会话状态
    isFileChat.value = true;
    
    // 如果是新会话，则初始化消息列表
    if (!currentSession.value.id) {
      currentSession.value = {
        id: sessionId,
        title: currentFile.value.name,
        type: 'file',
        time: Date.now(),
        messages: []
      };
      
      // 添加系统消息
      const systemMessage = {
        role: 'system',
        content: `文件 ${currentFile.value.name} 已上传并处理完成，您可以开始提问关于文件内容的问题。`,
        time: Date.now()
      };
      
      // 保存系统消息到数据库
      try {
        await createMessage(
          sessionId,
          systemMessage.content,
          systemMessage.role
        );
      } catch (error) {
        console.error('保存系统消息失败:', error);
        // 继续执行，不影响主要功能
      }
      
      // 更新当前会话的消息列表
      currentSession.value.messages.push(systemMessage);
    } else {
      // 如果是在现有会话中上传文件，添加文件上传通知消息
      const fileUploadMessage = {
        role: 'system',
        content: `文件 ${currentFile.value.name} 已上传并处理完成，您可以继续提问关于文件内容的问题。`,
        time: Date.now()
      };
      
      // 保存文件上传通知消息到数据库
      try {
        await createMessage(
          sessionId,
          fileUploadMessage.content,
          fileUploadMessage.role
        );
      } catch (error) {
        console.error('保存文件上传通知消息失败:', error);
        // 继续执行，不影响主要功能
      }
      
      // 更新当前会话的消息列表
      currentSession.value.messages.push(fileUploadMessage);
    }
    
    // 更新消息列表
    messageList.value = [...currentSession.value.messages];
    
    // 更新历史记录列表
    await loadUserHistory();
    
    uni.hideLoading();
    uni.showToast({
      title: '文件处理完成',
      icon: 'success'
    });
    
  } catch (error) {
    console.error('处理文件失败:', error);
    uni.hideLoading();
    uni.showToast({
      title: error.message || '处理文件失败',
      icon: 'none'
    });
    
    // 重置文件聊天状态
    isFileChat.value = false;
    currentFile.value = null;
  }
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

// 在 setup 中添加
const fileInputRef = ref(null);
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
        }
        
        .title-row {
          display: flex;
          align-items: center;
          width: 100%;
          
          .title {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          
          .file-tag {
            background: rgba(24, 144, 255, 0.1);
            border-radius: 4px;
            padding: 2px 6px;
            margin-left: 5px;
            max-width: 80px;
            
            .file-name {
              font-size: 10px;
              color: #1890ff;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          }
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
      display: flex;
      align-items: center;
      gap: 12px;

      .file-upload {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: #f5f7fa;
        cursor: pointer;
        transition: all 0.3s;
        border: 1px solid #eee;

        &:hover {
          background: #e6f7ff;
          border-color: #1890ff;
          transform: translateY(-1px);
        }

        .icon {
          font-size: 20px;
          color: #666;
        }
      }

      .current-file {
        display: flex;
        align-items: center;
        padding: 6px 12px;
        background: #f5f7fa;
        border-radius: 8px;
        border: 1px solid #eee;
        margin-right: 8px;
        max-width: 200px;
        overflow: hidden;

        .icon {
          font-size: 16px;
          color: #666;
          margin-right: 8px;
        }

        .file-name {
          font-size: 13px;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

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

// 知识图谱相关样式
.knowledge-graph-container {
  position: relative;
  width: 100%;
  height: 400px;
  margin: 10px 0;
  border: 1px solid #eee;
  border-radius: 8px;
  overflow: hidden;
}

.close-graph-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 5px 10px;
  background-color: rgba(0, 0, 0, 0.5);
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.file-controls {
  display: flex;
  align-items: center;
  gap: 10px;
}

.generate-graph-btn {
  padding: 5px 10px;
  background-color: #4992ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
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

.hidden-file-input {
  display: none;
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

.delete-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
