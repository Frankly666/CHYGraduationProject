<template>
  <view class="research-plan-list-container">
    <view class="header">
      <view class="title">我的研究方案</view>
      <view class="subtitle">管理您生成的研究方案</view>
    </view>
    
    <view class="content">
      <!-- 空状态 -->
      <view v-if="loading" class="loading-container">
        <view class="loading-spinner"></view>
        <text class="loading-text">加载研究方案中...</text>
      </view>
      
      <view v-else-if="plans.length === 0" class="empty-state">
        <image class="empty-image" src="/static/images/empty-plans.png" mode="aspectFit"></image>
        <text class="empty-text">还没有创建研究方案</text>
        <button class="create-button" @click="navigateToCreate">创建研究方案</button>
      </view>
      
      <!-- 研究方案列表 -->
      <view v-else class="plan-list">
        <view 
          v-for="(plan, index) in plans" 
          :key="plan._id" 
          class="plan-card"
          @click="viewPlanDetail(plan._id)"
        >
          <view class="plan-card-header">
            <text class="plan-title">{{ plan.title }}</text>
            <text class="plan-type">{{ getTemplateTypeName(plan.templateType) }}</text>
          </view>
          
          <view class="plan-meta">
            <text class="plan-meta-item">
              <text class="plan-meta-label">关键词: </text>
              {{ formatKeywords(plan.keywords) }}
            </text>
          </view>
          
          <view class="plan-actions">
            <text class="plan-time">{{ formatTime(plan.createTime) }}</text>
            <view class="action-buttons">
              <button class="action-btn view-btn" @click.stop="viewPlanDetail(plan._id)">查看</button>
              <button class="action-btn export-btn" @click.stop="exportPlan(plan)">导出</button>
              <button class="action-btn delete-btn" @click.stop="deletePlan(plan._id, index)">删除</button>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 分页控制 -->
      <view v-if="totalPages > 1" class="pagination">
        <button 
          class="pagination-btn" 
          :disabled="currentPage === 1"
          @click="changePage(currentPage - 1)"
        >
          上一页
        </button>
        <text class="pagination-info">{{ currentPage }}/{{ totalPages }}</text>
        <button 
          class="pagination-btn" 
          :disabled="currentPage === totalPages"
          @click="changePage(currentPage + 1)"
        >
          下一页
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getResearchPlanList, deleteResearchPlan } from '@/controls/research-plan.js';
import { exportToPDF } from '@/service/pdf-export.js';

// 状态
const loading = ref(true);
const plans = ref([]);
const currentPage = ref(1);
const pageSize = ref(10);
const totalCount = ref(0);
const totalPages = ref(1);

// 模板类型名称映射
const templateTypeNames = {
  'experimental': '实验研究',
  'survey': '调查研究',
  'case-study': '案例研究',
  'literature-review': '文献综述',
  'action-research': '行动研究'
};

// 初始化加载
onMounted(async () => {
  await loadPlans();
});

// 加载研究方案列表
const loadPlans = async () => {
  try {
    loading.value = true;
    console.log('开始加载研究方案列表, 页码:', currentPage.value);
    
    const result = await getResearchPlanList(currentPage.value, pageSize.value);
    console.log('获取到研究方案列表数据:', result);
    
    if (!result || !result.list) {
      console.error('研究方案列表数据为空或格式不正确');
      plans.value = [];
      totalCount.value = 0;
      totalPages.value = 1;
      loading.value = false;
      return;
    }
    
    // 处理每个研究方案中的frameworkStr字段
    const processedPlans = result.list
      .filter(plan => plan && plan._id) // 确保方案有ID
      .map(plan => {
        // 确保每个方案对象都是有效的
        if (!plan) return null;
        
        try {
          // 如果有frameworkStr字段，将其解析为对象
          if (plan.frameworkStr) {
            try {
              plan.framework = JSON.parse(plan.frameworkStr);
            } catch (parseError) {
              console.error('解析frameworkStr失败:', parseError, plan);
              plan.framework = {};
            }
          } else if (!plan.framework) {
            plan.framework = {};
          }
          
          return plan;
        } catch (processError) {
          console.error('处理研究方案数据失败:', processError, plan);
          return plan; // 返回原始方案，确保不会过滤掉数据
        }
      }).filter(plan => plan !== null);
    
    plans.value = processedPlans;
    totalCount.value = result.total || 0;
    totalPages.value = result.totalPages || 1;
    
    console.log('研究方案列表加载完成, 共', plans.value.length, '条数据');
    loading.value = false;
  } catch (error) {
    console.error('加载研究方案列表失败:', error);
    plans.value = [];
    loading.value = false;
    uni.showToast({
      title: '加载失败: ' + error.message,
      icon: 'none'
    });
  }
};

// 切换页码
const changePage = async (page) => {
  if (page < 1 || page > totalPages.value) return;
  
  currentPage.value = page;
  await loadPlans();
  
  // 滚动到顶部
  uni.pageScrollTo({
    scrollTop: 0,
    duration: 300
  });
};

// 查看研究方案详情
const viewPlanDetail = (planId) => {
  if (!planId) {
    console.error('缺少方案ID，无法查看详情');
    uni.showToast({
      title: '方案数据异常',
      icon: 'none'
    });
    return;
  }
  
  console.log('跳转到方案详情页, ID:', planId);
  // 保存最近查看的方案ID
  try {
    let recentViews = uni.getStorageSync('recentViewPlans') || [];
    if (!Array.isArray(recentViews)) recentViews = [];
    
    // 移除已存在的相同ID
    const existingIndex = recentViews.findIndex(id => id === planId);
    if (existingIndex >= 0) {
      recentViews.splice(existingIndex, 1);
    }
    
    // 添加到顶部
    recentViews.unshift(planId);
    
    // 限制数量
    if (recentViews.length > 10) {
      recentViews = recentViews.slice(0, 10);
    }
    
    uni.setStorageSync('recentViewPlans', recentViews);
  } catch (error) {
    console.error('保存最近查看记录失败:', error);
  }
  
  // 跳转到详情页
  uni.navigateTo({
    url: `/pages/researchPlanDetail/researchPlanDetail?id=${planId}`
  });
};

// 导出研究方案
const exportPlan = async (plan) => {
  try {
    uni.showLoading({
      title: '准备导出...',
      mask: true
    });
    
    // 创建一个临时的div来包含内容
    const tempContainer = document.createElement('div');
    tempContainer.className = 'plan-display export-container';
    tempContainer.style.width = '100%';
    tempContainer.style.fontFamily = 'PingFang SC, Microsoft YaHei, sans-serif';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '20px';
    
    // 添加标题和元数据
    const headerDiv = document.createElement('div');
    headerDiv.style.textAlign = 'center';
    headerDiv.style.marginBottom = '30px';
    
    const titleDiv = document.createElement('div');
    titleDiv.textContent = plan.title;
    titleDiv.style.fontSize = '24px';
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.marginBottom = '15px';
    headerDiv.appendChild(titleDiv);
    
    const metaDiv = document.createElement('div');
    metaDiv.textContent = `关键词: ${formatKeywords(plan.keywords)}`;
    metaDiv.style.fontSize = '14px';
    metaDiv.style.color = '#666';
    headerDiv.appendChild(metaDiv);
    
    tempContainer.appendChild(headerDiv);
    
    // 添加内容
    const contentDiv = document.createElement('div');
    contentDiv.innerHTML = markdownToHTML(plan.content);
    tempContainer.appendChild(contentDiv);
    
    // 添加脚注
    const footerDiv = document.createElement('div');
    footerDiv.style.marginTop = '40px';
    footerDiv.style.textAlign = 'center';
    footerDiv.style.fontSize = '12px';
    footerDiv.style.color = '#999';
    footerDiv.textContent = `生成时间: ${formatTime(plan.createTime)}`;
    tempContainer.appendChild(footerDiv);
    
    document.body.appendChild(tempContainer);
    
    // 导出为PDF
    const filename = `${plan.title.substring(0, 20)}_研究方案.pdf`;
    
    try {
      await exportToPDF({
        element: tempContainer,
        filename: filename,
        title: plan.title,
        author: '教育研究助手'
      });
      
      uni.hideLoading();
      uni.showToast({
        title: '导出成功',
        icon: 'success'
      });
    } catch (exportError) {
      console.error('导出PDF失败:', exportError);
      uni.hideLoading();
      uni.showToast({
        title: '导出失败: ' + exportError.message,
        icon: 'none'
      });
    } finally {
      // 清理临时元素
      if (document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
    }
  } catch (error) {
    console.error('导出操作失败:', error);
    uni.hideLoading();
    uni.showToast({
      title: '导出失败: ' + error.message,
      icon: 'none'
    });
  }
};

// 删除研究方案
const deletePlan = (planId, index) => {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个研究方案吗？此操作不可恢复。',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({
            title: '正在删除...',
            mask: true
          });
          
          await deleteResearchPlan(planId);
          
          // 从列表中移除
          plans.value.splice(index, 1);
          
          uni.hideLoading();
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          // 如果当前页面没有数据了，且不是第一页，返回上一页
          if (plans.value.length === 0 && currentPage.value > 1) {
            await changePage(currentPage.value - 1);
          } else if (plans.value.length === 0) {
            // 刷新数据
            await loadPlans();
          }
        } catch (error) {
          console.error('删除研究方案失败:', error);
          uni.hideLoading();
          uni.showToast({
            title: '删除失败: ' + error.message,
            icon: 'none'
          });
        }
      }
    }
  });
};

// 导航到创建页面
const navigateToCreate = () => {
  uni.navigateTo({
    url: '/pages/researchPlan/researchPlan'
  });
};

// 将Markdown转换为HTML
const markdownToHTML = (markdown) => {
  if (!markdown) return '';
  
  try {
    // 预处理内容，移除可能干扰Markdown解析的标记
    let processedContent = markdown;
    
    // 移除可能的Markdown围栏格式标记
    processedContent = processedContent.replace(/^```markdown#/gm, '');
    processedContent = processedContent.replace(/^```/gm, '');
    
    // 移除文档开头的类型指示器
    processedContent = processedContent.replace(/^\s*```\s*\w*\s*$/m, '');
    
    const marked = require('marked');
    marked.setOptions({
      gfm: true,
      breaks: true,
      headerIds: true,
      mangle: false
    });
    
    return marked(processedContent);
  } catch (error) {
    console.error('Markdown转HTML失败:', error);
    return `<div style="white-space:pre-wrap;">${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;
  }
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

// 格式化关键词
const formatKeywords = (keywords) => {
  if (!keywords) return '';
  
  // 确保keywords是数组
  if (!Array.isArray(keywords)) {
    // 尝试将字符串解析为数组
    if (typeof keywords === 'string') {
      try {
        const parsedKeywords = JSON.parse(keywords);
        if (Array.isArray(parsedKeywords)) {
          return parsedKeywords.join('、');
        }
        // 如果不是数组，则将其视为单个关键词
        return keywords;
      } catch (error) {
        // 解析失败，将字符串视为单个关键词
        return keywords;
      }
    }
    // 非字符串也非数组，转为字符串返回
    return String(keywords);
  }
  
  // 过滤掉空值并连接
  return keywords.filter(k => k).join('、');
};

// 获取模板类型名称
const getTemplateTypeName = (type) => {
  return templateTypeNames[type] || type;
};
</script>

<style>
.research-plan-list-container {
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.header {
  margin-bottom: 24px;
}

.title {
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin-bottom: 8px;
}

.subtitle {
  font-size: 14px;
  color: #666;
}

.content {
  margin-bottom: 40px;
}

/* 加载状态 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #05de7d;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  font-size: 16px;
  color: #666;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.empty-image {
  width: 200px;
  height: 160px;
  margin-bottom: 24px;
}

.empty-text {
  font-size: 16px;
  color: #666;
  margin-bottom: 24px;
}

.create-button {
  background-color: #05de7d;
  color: white;
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 16px;
}

/* 研究方案卡片 */
.plan-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.plan-card {
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.plan-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.plan-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.plan-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.plan-type {
  font-size: 12px;
  color: white;
  background-color: #05de7d;
  padding: 2px 8px;
  border-radius: 12px;
}

.plan-meta {
  margin-bottom: 12px;
}

.plan-meta-item {
  font-size: 14px;
  color: #666;
  display: block;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.plan-meta-label {
  color: #888;
}

.plan-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.plan-time {
  font-size: 12px;
  color: #999;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.action-btn {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 4px;
  border: none;
}

.view-btn {
  background-color: #e3f2fd;
  color: #1976d2;
}

.export-btn {
  background-color: #e8f5e9;
  color: #4caf50;
}

.delete-btn {
  background-color: #ffebee;
  color: #f44336;
}

/* 分页控制 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 24px;
}

.pagination-btn {
  background-color: #f5f5f5;
  color: #333;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  margin: 0 8px;
}

.pagination-btn:disabled {
  background-color: #f5f5f5;
  color: #bdbdbd;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}
</style> 