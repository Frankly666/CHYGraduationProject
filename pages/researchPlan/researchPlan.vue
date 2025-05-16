<template>
  <view class="research-plan-page">
    <!-- 顶部导航栏 -->
    <view class="header">
      <view class="back-button" @click="goBack">
        <text class="back-icon">&#8592;</text>
        <text class="back-text">返回</text>
      </view>
      <text class="logo">EduResearch</text>
      <view class="nav-btns" v-if="!isLoggedIn">
        <text class="nav-btn" @tap="navTo('logIn')">登录</text>
        <text class="nav-btn primary" @tap="navTo('enroll')">注册</text>
      </view>
      <view class="user-info" v-else>
        <text>{{ username }}</text>
      </view>
    </view>
    
    <!-- 主要内容区域 -->
    <view class="main-content">
      <view class="page-title">
        <text class="title-text">研究方案生成</text>
        <text class="subtitle-text">基于领域结构化知识驱动的教学研究方案生成系统</text>
      </view>
      
      <!-- 描述区域 -->
      <view class="feature-description">
        <view class="feature-card">
          <view class="feature-icon">📝</view>
          <view class="feature-info">
            <text class="feature-title">自动生成研究框架</text>
            <text class="feature-desc">根据研究主题和目标，自动生成符合学术规范的研究方案框架</text>
          </view>
        </view>
        <view class="feature-card">
          <view class="feature-icon">🔍</view>
          <view class="feature-info">
            <text class="feature-title">智能填充研究内容</text>
            <text class="feature-desc">基于框架结构，智能生成研究方法、数据收集和分析方案</text>
          </view>
        </view>
        <view class="feature-card">
          <view class="feature-icon">📊</view>
          <view class="feature-info">
            <text class="feature-title">结合知识图谱数据</text>
            <text class="feature-desc">利用知识图谱数据，增强研究方案的科学性和系统性</text>
          </view>
        </view>
      </view>
      
      <!-- 研究方案生成器组件 -->
      <ResearchPlanGenerator 
        :graph-data="graphData" 
        :embedded="false"
        @complete="handlePlanComplete"
        @cancel="handlePlanCancel"
      />
    </view>
    
    <!-- 底部 -->
    <view class="footer">
      <text>让教育研究更高效 © 2024</text>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import ResearchPlanGenerator from '@/components/ResearchPlanGenerator.vue';

// 用户登录状态
const isLoggedIn = ref(false);
const username = ref('');

// 知识图谱数据
const graphData = ref(null);

// 检查用户登录状态
const checkLoginStatus = () => {
  try {
    const loginStatus = uni.getStorageSync('isLogIn');
    const storedUsername = uni.getStorageSync('username');
    
    if (loginStatus && storedUsername) {
      isLoggedIn.value = true;
      username.value = storedUsername;
    } else {
      isLoggedIn.value = false;
      username.value = '';
    }
  } catch (error) {
    console.error('检查登录状态时出错:', error);
    isLoggedIn.value = false;
    username.value = '';
  }
};

// 加载知识图谱数据
const loadGraphData = () => {
  try {
    // 尝试从本地存储加载最近生成的知识图谱数据
    const storedGraphData = uni.getStorageSync('lastGraphData');
    if (storedGraphData) {
      graphData.value = JSON.parse(storedGraphData);
    }
  } catch (error) {
    console.error('加载知识图谱数据时出错:', error);
    graphData.value = null;
  }
};

// 返回上一页
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 导航到指定页面
const navTo = (path) => {
  uni.navigateTo({
    url: `/pages/${path}/${path}`
  });
};

// 处理方案完成事件
const handlePlanComplete = (planData) => {
  console.log('方案生成完成:', planData);
  // 可以在这里添加完成后的逻辑，如显示提示信息等
};

// 处理方案取消事件
const handlePlanCancel = () => {
  console.log('方案生成已取消');
};

// 组件初始化
onMounted(() => {
  // 检查登录状态
  checkLoginStatus();
  
  // 加载知识图谱数据
  loadGraphData();
});
</script>

<style>
.research-plan-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fa;
}

/* 顶部导航栏 */
.header {
  padding: 24px 5%;
  display: flex;
  align-items: center;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-button {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.back-icon {
  font-size: 18px;
  margin-right: 4px;
}

.back-text {
  font-size: 14px;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  color: #05de7d;
  margin-left: 20px;
}

.nav-btns {
  margin-left: auto;
  display: flex;
  gap: 16px;
}

.nav-btn {
  padding: 8px 20px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-btn:hover {
  background-color: #f5f5f5;
}

.nav-btn.primary {
  background-color: #05de7d;
  color: white;
}

.nav-btn.primary:hover {
  background-color: #04c76f;
}

.user-info {
  margin-left: auto;
  font-size: 14px;
  color: #05de7d;
  font-weight: 500;
}

/* 主要内容区域 */
.main-content {
  flex: 1;
  padding: 32px 5%;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.page-title {
  margin-bottom: 24px;
  text-align: center;
}

.title-text {
  font-size: 28px;
  font-weight: 700;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

.subtitle-text {
  font-size: 16px;
  color: #666;
  display: block;
}

/* 功能特点描述区域 */
.feature-description {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 32px;
  justify-content: center;
}

.feature-card {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  width: calc(33.33% - 14px);
  min-width: 280px;
}

.feature-icon {
  font-size: 28px;
  margin-right: 16px;
}

.feature-info {
  flex: 1;
}

.feature-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

.feature-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

/* 底部 */
.footer {
  padding: 24px;
  text-align: center;
  background-color: white;
  color: #666;
  font-size: 14px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .feature-description {
    flex-direction: column;
  }
  
  .feature-card {
    width: 100%;
  }
}
</style> 