<template>
  <view class="research-plan-detail-container">
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载研究方案中...</text>
    </view>
    
    <view v-else-if="!plan" class="error-container">
      <text class="error-text">加载失败，研究方案不存在或已被删除</text>
      <button class="back-button" @click="goBack">返回列表</button>
    </view>
    
    <view v-else class="plan-content">
      <view class="plan-header">
        <view class="plan-title">{{ plan.title }}</view>
        <view class="plan-meta">
          <text class="plan-type">{{ getTemplateTypeName(plan.templateType) }}</text>
          <text class="plan-date">创建时间: {{ formatTime(plan.createTime) }}</text>
        </view>
        <view class="plan-keywords">
          <text class="keywords-label">关键词:</text>
          <view class="keywords-list">
            <text 
              v-for="(keyword, index) in plan.keywords" 
              :key="index" 
              class="keyword-tag"
            >
              {{ keyword }}
            </text>
          </view>
        </view>
        <view class="plan-objective">
          <text class="objective-label">研究目标:</text>
          <text class="objective-content">{{ plan.objective }}</text>
        </view>
      </view>
      
      <view class="plan-body">
        <rich-text class="markdown-content" :nodes="renderedContent"></rich-text>
      </view>
      
      <view class="plan-actions">
        <button class="action-button export-button" @click="exportPlan">
          导出为PDF
        </button>
        <button class="action-button edit-button" @click="editPlan">
          编辑方案
        </button>
        <button class="action-button delete-button" @click="deletePlan">
          删除方案
        </button>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { getResearchPlan, getResearchPlansByUser, deleteResearchPlan } from '@/controls/research-plan.js';
import { exportToPDF } from '@/service/pdf-export.js';

// 状态
const loading = ref(true);
const plan = ref(null);

// 获取页面参数
const planId = ref('');

// 模板类型名称映射
const templateTypeNames = {
  'experimental': '实验研究',
  'survey': '调查研究',
  'case-study': '案例研究',
  'literature-review': '文献综述',
  'action-research': '行动研究'
};

// 初始化
onMounted(async () => {
  // 获取路由参数
  const params = uni.getLaunchOptionsSync().query || {};
  const pageParams = uni.getEnterOptionsSync ? uni.getEnterOptionsSync().query : {};
  
  // 合并参数，优先使用页面参数
  const id = pageParams.id || params.id;
  planId.value = id;
  
  if (id) {
    console.log('从路由参数获取方案ID:', id);
    await loadPlanDetail(id);
  } else {
    // 尝试从本地存储中获取最近保存的方案ID
    try {
      const planHistory = uni.getStorageSync('researchPlanHistory');
      if (planHistory && Array.isArray(planHistory) && planHistory.length > 0) {
        const latestPlanId = planHistory[0].id;
        console.log('从本地存储获取最近的方案ID:', latestPlanId);
        if (latestPlanId) {
          planId.value = latestPlanId;
          await loadPlanDetail(latestPlanId);
          return;
        }
      }
    } catch (error) {
      console.error('获取本地存储的方案历史记录失败:', error);
    }
    
    // 如果没有从本地存储获取到ID，则尝试获取最新方案
    console.log('未找到方案ID，尝试加载最新方案');
    await loadLatestPlan();
  }
});

// 加载研究方案详情
const loadPlanDetail = async (id) => {
  try {
    loading.value = true;
    console.log('开始加载研究方案详情, ID:', id);
    
    const planData = await getResearchPlan(id);
    console.log('获取到研究方案数据:', planData);
    
    if (!planData) {
      console.error('研究方案数据为空');
      loading.value = false;
      plan.value = null;
      return;
    }
    
    // 处理frameworkStr字段，将JSON字符串解析为对象
    if (planData.frameworkStr) {
      try {
        console.log('尝试解析frameworkStr:', planData.frameworkStr);
        planData.framework = JSON.parse(planData.frameworkStr);
      } catch (parseError) {
        console.error('解析frameworkStr失败:', parseError);
        planData.framework = {};
      }
    } else if (!planData.framework) {
      planData.framework = {};
    }
    
    plan.value = planData;
    console.log('研究方案数据处理完成:', plan.value);
    
    loading.value = false;
  } catch (error) {
    console.error('加载研究方案详情失败:', error);
    loading.value = false;
    plan.value = null;
    uni.showToast({
      title: '加载失败: ' + error.message,
      icon: 'none'
    });
  }
};

// 加载最新的研究方案
const loadLatestPlan = async () => {
  try {
    loading.value = true;
    console.log('尝试加载用户最新研究方案');
    
    const plans = await getResearchPlansByUser();
    console.log('获取到用户研究方案列表:', plans);
    
    if (!plans || plans.length === 0) {
      console.log('用户没有研究方案');
      loading.value = false;
      plan.value = null;
      return;
    }
    
    // 获取最新的一条研究方案
    const latestPlan = plans[0];
    console.log('获取到最新研究方案:', latestPlan);
    
    // 确保方案有ID
    if (!latestPlan._id) {
      console.error('最新方案缺少ID');
      loading.value = false;
      plan.value = null;
      uni.showToast({
        title: '方案数据异常',
        icon: 'none'
      });
      return;
    }
    
    // 更新planId
    planId.value = latestPlan._id;
    
    // 处理frameworkStr字段，将JSON字符串解析为对象
    if (latestPlan.frameworkStr) {
      try {
        console.log('尝试解析frameworkStr:', latestPlan.frameworkStr);
        latestPlan.framework = JSON.parse(latestPlan.frameworkStr);
      } catch (parseError) {
        console.error('解析frameworkStr失败:', parseError);
        latestPlan.framework = {};
      }
    } else if (!latestPlan.framework) {
      latestPlan.framework = {};
    }
    
    plan.value = latestPlan;
    console.log('最新研究方案数据处理完成:', plan.value);
    
    // 保存这个方案ID到本地存储，便于下次查询
    try {
      let planHistory = uni.getStorageSync('researchPlanHistory') || [];
      // 确保它是数组
      if (!Array.isArray(planHistory)) planHistory = [];
      
      // 检查是否已存在此ID
      const existingIndex = planHistory.findIndex(item => item.id === latestPlan._id);
      if (existingIndex >= 0) {
        // 如果已存在，移到顶部
        planHistory.splice(existingIndex, 1);
      }
      
      // 添加到历史记录头部
      planHistory.unshift({
        id: latestPlan._id,
        title: latestPlan.title || '未命名方案',
        time: Date.now()
      });
      
      // 只保留最近10条记录
      if (planHistory.length > 10) {
        planHistory = planHistory.slice(0, 10);
      }
      
      // 保存到本地存储
      uni.setStorageSync('researchPlanHistory', planHistory);
      console.log('更新方案历史记录成功');
    } catch (storageError) {
      console.error('保存方案历史记录失败:', storageError);
    }
    
    loading.value = false;
  } catch (error) {
    console.error('加载最新研究方案失败:', error);
    loading.value = false;
    plan.value = null;
    uni.showToast({
      title: '加载失败: ' + error.message,
      icon: 'none'
    });
  }
};

// 渲染Markdown内容
const renderedContent = computed(() => {
  if (!plan.value || !plan.value.content) return '';
  
  try {
    // 深度预处理内容
    let processedContent = plan.value.content;
    
    // 检查内容类型并记录，用于调试
    console.log('原始内容类型:', typeof processedContent);
    console.log('原始内容长度:', processedContent.length);
    console.log('原始内容前100个字符:', processedContent.substring(0, 100));
    
    // 1. 移除所有Markdown围栏标记和类型指示器
    processedContent = processedContent.replace(/```markdown#?/gi, '');
    processedContent = processedContent.replace(/```\s*\w*/gi, '');
    processedContent = processedContent.replace(/```/g, '');
    
    // 2. 确保标题格式正确 (# 后面有空格)
    processedContent = processedContent.replace(/^(#{1,6})([^\s])/gm, '$1 $2');
    
    // 3. 确保列表项格式正确
    processedContent = processedContent.replace(/^([*\-+])([^\s])/gm, '$1 $2');
    processedContent = processedContent.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
    
    // 4. 移除内容开头和结尾的引号
    processedContent = processedContent.replace(/^['"]+|['"]+$/g, '');
    
    // 5. 移除任何前导的空白字符和"markdown"字样
    processedContent = processedContent.replace(/^\s*markdown[#\s]*/i, '');
    
    // 6. 添加额外的处理来修复常见Markdown格式问题
    processedContent = processedContent
      // 确保段落之间有空行
      .replace(/\n([^#\s-])/g, '\n\n$1')
      // 确保标题前有空行
      .replace(/([^\n])\n(#{1,6})/g, '$1\n\n$2')
      // 确保列表项有正确的空格
      .replace(/\n([\*\-+])/g, '\n\n$1')
      // 移除多余的空行（两个以上的空行缩减为两个）
      .replace(/\n{3,}/g, '\n\n');
    
    // 记录预处理后的内容，用于调试
    console.log('预处理后内容长度:', processedContent.length);
    console.log('预处理后内容前100个字符:', processedContent.substring(0, 100));
    
    // 配置marked选项
    const marked = require('marked');
    marked.setOptions({
      gfm: true, // GitHub风格Markdown
      breaks: true, // 识别回车符为换行符
      headerIds: true, // 为标题元素添加id
      mangle: false, // 不处理HTML
      pedantic: false, // 不严格遵循原始Markdown
      sanitize: false, // 不过滤HTML标签
      smartLists: true, // 使用更智能的列表行为
      smartypants: true // 使用更智能的标点
    });
    
    // 生成HTML
    const html = marked(processedContent);
    console.log('HTML渲染后长度:', html.length);
    
    // 添加样式类并处理任何特殊情况
    const styledHtml = html
      .replace(/<h1/g, '<h1 class="md-h1"')
      .replace(/<h2/g, '<h2 class="md-h2"')
      .replace(/<h3/g, '<h3 class="md-h3"')
      .replace(/<h4/g, '<h4 class="md-h4"')
      .replace(/<h5/g, '<h5 class="md-h5"')
      .replace(/<h6/g, '<h6 class="md-h6"')
      .replace(/<p>/g, '<p class="md-p">')
      .replace(/<ul>/g, '<ul class="md-ul">')
      .replace(/<ol>/g, '<ol class="md-ol">')
      .replace(/<li>/g, '<li class="md-li">')
      .replace(/<pre>/g, '<pre class="md-pre">')
      .replace(/<code>/g, '<code class="md-code">');
    
    return styledHtml;
  } catch (error) {
    console.error('Markdown渲染失败:', error);
    // 如果渲染失败，显示清理过的原始文本
    let cleanText = plan.value.content
      .replace(/```markdown#|```\s*\w*|```/g, '')
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    return `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 16px; background: #f5f5f5; border-radius: 4px; font-family: monospace;">${cleanText}</pre>`;
  }
});

// 导出PDF
const exportPlan = async () => {
  try {
    if (!plan.value) return;
    
    uni.showLoading({
      title: '正在生成PDF...',
      mask: true
    });
    
    // 检查是否为Web环境
    if (typeof document === 'undefined') {
      throw new Error('当前不是Web环境，无法导出PDF');
    }
    
    // 创建一个临时的div来包含内容
    const tempContainer = document.createElement('div');
    tempContainer.className = 'plan-display export-container';
    tempContainer.style.width = '100%';
    tempContainer.style.fontFamily = 'PingFang SC, Microsoft YaHei, sans-serif';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '20px';
    tempContainer.style.lineHeight = '1.6';
    
    // 添加标题和元数据
    const headerDiv = document.createElement('div');
    headerDiv.style.textAlign = 'center';
    headerDiv.style.marginBottom = '30px';
    
    const titleDiv = document.createElement('div');
    titleDiv.textContent = plan.value.title;
    titleDiv.style.fontSize = '24px';
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.marginBottom = '15px';
    headerDiv.appendChild(titleDiv);
    
    const metaDiv = document.createElement('div');
    metaDiv.textContent = `关键词: ${formatKeywords(plan.value.keywords)}`;
    metaDiv.style.fontSize = '14px';
    metaDiv.style.color = '#666';
    headerDiv.appendChild(metaDiv);
    
    // 添加研究目标
    const objectiveDiv = document.createElement('div');
    objectiveDiv.style.marginTop = '20px';
    objectiveDiv.style.marginBottom = '30px';
    objectiveDiv.style.padding = '15px';
    objectiveDiv.style.backgroundColor = '#f8f9fa';
    objectiveDiv.style.borderRadius = '6px';
    
    const objectiveLabelDiv = document.createElement('div');
    objectiveLabelDiv.textContent = '研究目标:';
    objectiveLabelDiv.style.fontWeight = 'bold';
    objectiveLabelDiv.style.marginBottom = '8px';
    objectiveDiv.appendChild(objectiveLabelDiv);
    
    const objectiveContentDiv = document.createElement('div');
    objectiveContentDiv.textContent = plan.value.objective || '无';
    objectiveContentDiv.style.color = '#333';
    objectiveDiv.appendChild(objectiveContentDiv);
    
    headerDiv.appendChild(objectiveDiv);
    tempContainer.appendChild(headerDiv);
    
    // 添加内容
    const contentDiv = document.createElement('div');
    contentDiv.className = 'plan-content';
    contentDiv.style.fontSize = '14px';
    
    try {
      // 深度预处理内容
      let processedContent = plan.value.content;
      
      // 完整的预处理步骤，与renderedContent计算属性中相同
      // 1. 移除所有Markdown围栏标记和类型指示器
      processedContent = processedContent.replace(/```markdown#?/gi, '');
      processedContent = processedContent.replace(/```\s*\w*/gi, '');
      processedContent = processedContent.replace(/```/g, '');
      
      // 2. 确保标题格式正确 (# 后面有空格)
      processedContent = processedContent.replace(/^(#{1,6})([^\s])/gm, '$1 $2');
      
      // 3. 确保列表项格式正确
      processedContent = processedContent.replace(/^([*\-+])([^\s])/gm, '$1 $2');
      processedContent = processedContent.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
      
      // 4. 移除内容开头和结尾的引号
      processedContent = processedContent.replace(/^['"]+|['"]+$/g, '');
      
      // 5. 移除任何前导的空白字符和"markdown"字样
      processedContent = processedContent.replace(/^\s*markdown[#\s]*/i, '');
      
      // 6. 添加额外的处理来修复常见Markdown格式问题
      processedContent = processedContent
        // 确保段落之间有空行
        .replace(/\n([^#\s-])/g, '\n\n$1')
        // 确保标题前有空行
        .replace(/([^\n])\n(#{1,6})/g, '$1\n\n$2')
        // 确保列表项有正确的空格
        .replace(/\n([\*\-+])/g, '\n\n$1')
        // 移除多余的空行（两个以上的空行缩减为两个）
        .replace(/\n{3,}/g, '\n\n');
      
      // 使用marked转换为HTML
      const marked = require('marked');
      marked.setOptions({
        gfm: true,
        breaks: true,
        headerIds: true,
        mangle: false,
        pedantic: false,
        sanitize: false,
        smartLists: true,
        smartypants: true
      });
      
      // 生成HTML并应用样式
      const html = marked(processedContent);
      contentDiv.innerHTML = html;
      
      // 为导出内容添加适当的样式
      const styleHeadings = (selector, fontSize, marginTop, marginBottom, fontWeight = 'bold') => {
        Array.from(contentDiv.querySelectorAll(selector)).forEach(el => {
          el.style.fontSize = fontSize;
          el.style.marginTop = marginTop;
          el.style.marginBottom = marginBottom;
          el.style.fontWeight = fontWeight;
          el.style.color = '#333';
          el.style.pageBreakAfter = 'avoid';
          el.style.pageBreakInside = 'avoid';
        });
      };
      
      // 添加样式到各种元素
      styleHeadings('h1', '22px', '28px', '16px');
      styleHeadings('h2', '20px', '24px', '14px');
      styleHeadings('h3', '18px', '20px', '12px');
      styleHeadings('h4', '16px', '16px', '10px');
      
      // 设置段落样式
      Array.from(contentDiv.querySelectorAll('p')).forEach(p => {
        p.style.margin = '12px 0';
        p.style.lineHeight = '1.6';
        p.style.color = '#333';
      });
      
      // 设置列表样式
      Array.from(contentDiv.querySelectorAll('ul, ol')).forEach(list => {
        list.style.margin = '12px 0';
        list.style.paddingLeft = '24px';
      });
      
      Array.from(contentDiv.querySelectorAll('li')).forEach(item => {
        item.style.margin = '6px 0';
        item.style.lineHeight = '1.5';
      });
    } catch (error) {
      console.error('导出时Markdown渲染失败:', error);
      contentDiv.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 16px; background: #f5f5f5; border-radius: 4px; font-family: monospace;">${plan.value.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
    }
    
    tempContainer.appendChild(contentDiv);
    
    // 添加脚注
    const footerDiv = document.createElement('div');
    footerDiv.style.marginTop = '40px';
    footerDiv.style.paddingTop = '15px';
    footerDiv.style.borderTop = '1px solid #eee';
    footerDiv.style.textAlign = 'center';
    footerDiv.style.fontSize = '12px';
    footerDiv.style.color = '#999';
    footerDiv.textContent = `生成时间: ${formatTime(plan.value.createTime || new Date())}`;
    tempContainer.appendChild(footerDiv);
    
    document.body.appendChild(tempContainer);
    
    // 导出为PDF
    const filename = `${plan.value.title.substring(0, 20)}_研究方案.pdf`;
    
    try {
      await exportToPDF({
        element: tempContainer,
        filename: filename,
        title: plan.value.title,
        author: '教育研究助手',
        margins: { top: 15, right: 15, bottom: 20, left: 15 },
        pageSize: 'a4'
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

// 编辑方案
const editPlan = () => {
  if (!plan.value) return;
  
  uni.navigateTo({
    url: `/pages/researchPlanEditor/researchPlanEditor?id=${plan.value._id}`
  });
};

// 删除方案
const deletePlan = () => {
  if (!plan.value) return;
  
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
          
          await deleteResearchPlan(plan.value._id);
          
          uni.hideLoading();
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          });
          
          // 返回上一页
          setTimeout(() => {
            goBack();
          }, 1500);
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

// 返回列表
const goBack = () => {
  uni.navigateBack({
    delta: 1
  });
};

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
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
.research-plan-detail-container {
  padding: 20px;
  background-color: #f8f9fa;
  min-height: 100vh;
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

/* 错误状态 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
}

.error-text {
  font-size: 16px;
  color: #f44336;
  margin-bottom: 24px;
}

.back-button {
  background-color: #f5f5f5;
  color: #333;
  padding: 10px 20px;
  border-radius: 6px;
}

/* 研究方案内容 */
.plan-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.plan-header {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.plan-title {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.plan-type {
  background-color: #05de7d;
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
}

.plan-date {
  font-size: 14px;
  color: #999;
}

.plan-keywords {
  margin-bottom: 16px;
}

.keywords-label {
  font-size: 14px;
  font-weight: bold;
  color: #555;
  margin-right: 8px;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.keyword-tag {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
}

.plan-objective {
  margin-top: 16px;
}

.objective-label {
  font-size: 14px;
  font-weight: bold;
  color: #555;
  display: block;
  margin-bottom: 8px;
}

.objective-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.plan-body {
  padding: 24px;
}

/* Markdown 样式 */
.markdown-content {
  font-size: 15px;
  line-height: 1.6;
  color: #333;
}

.md-h1 {
  font-size: 22px;
  font-weight: bold;
  margin-top: 24px;
  margin-bottom: 16px;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 8px;
}

.md-h2 {
  font-size: 20px;
  font-weight: bold;
  margin-top: 20px;
  margin-bottom: 14px;
  color: #333;
}

.md-h3 {
  font-size: 18px;
  font-weight: bold;
  margin-top: 16px;
  margin-bottom: 12px;
  color: #333;
}

.md-h4 {
  font-size: 16px;
  font-weight: bold;
  margin-top: 14px;
  margin-bottom: 10px;
  color: #333;
}

.md-p {
  margin: 12px 0;
  line-height: 1.6;
}

.md-ul, .md-ol {
  margin: 12px 0;
  padding-left: 24px;
}

.md-li {
  margin: 6px 0;
}

/* 修复显示问题额外的CSS */
.markdown-content p,
.markdown-content pre,
.markdown-content ul,
.markdown-content ol,
.markdown-content blockquote {
  margin: 1em 0;
}

.markdown-content h1,
.markdown-content h2,
.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  margin-top: 1.2em;
  margin-bottom: 0.8em;
  line-height: 1.4;
}

.markdown-content ul,
.markdown-content ol {
  padding-left: 2em;
}

.markdown-content li {
  margin: 0.5em 0;
}

.markdown-content blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  color: #666;
}

.markdown-content pre {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
}

.markdown-content code {
  background-color: #f0f0f0;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: monospace;
}

.plan-actions {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 24px;
  border-top: 1px solid #f0f0f0;
}

.action-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
}

.export-button {
  background-color: #4caf50;
  color: white;
}

.edit-button {
  background-color: #2196f3;
  color: white;
}

.delete-button {
  background-color: #f44336;
  color: white;
}
</style> 