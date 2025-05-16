<template>
  <view class="research-plan-editor-container">
    <view v-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载研究方案中...</text>
    </view>
    
    <view v-else-if="!plan" class="error-container">
      <text class="error-text">加载失败，研究方案不存在或已被删除</text>
      <button class="back-button" @click="goBack">返回列表</button>
    </view>
    
    <view v-else class="editor-content">
      <view class="editor-header">
        <view class="editor-title">编辑研究方案</view>
        <view class="plan-meta">
          <text class="plan-type">{{ getTemplateTypeName(plan.templateType) }}</text>
          <text class="plan-date">创建时间: {{ formatTime(plan.createTime) }}</text>
        </view>
      </view>
      
      <view class="form-container">
        <!-- 基本信息编辑 -->
        <view class="form-section">
          <view class="form-group">
            <text class="form-label">标题</text>
            <input class="form-input" v-model="editedPlan.title" placeholder="输入研究方案标题" />
          </view>
          
          <view class="form-group">
            <text class="form-label">研究目标</text>
            <textarea class="form-textarea" v-model="editedPlan.objective" placeholder="描述研究目标" />
          </view>
          
          <view class="form-group">
            <text class="form-label">关键词</text>
            <view class="keywords-container">
              <view 
                v-for="(keyword, index) in editedPlan.keywords" 
                :key="index" 
                class="keyword-tag"
              >
                <text>{{ keyword }}</text>
                <text class="remove-keyword" @click="removeKeyword(index)">×</text>
              </view>
              
              <view class="keyword-input-container">
                <input 
                  class="keyword-input" 
                  v-model="newKeyword" 
                  placeholder="添加新关键词"
                  @confirm="addKeyword"
                />
                <button class="add-keyword-btn" @click="addKeyword" :disabled="!newKeyword.trim()">添加</button>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 内容编辑区域 -->
        <view class="form-section">
          <view class="edit-tabs">
            <view 
              class="tab" 
              :class="{ active: activeTab === 'edit' }"
              @click="activeTab = 'edit'"
            >
              编辑
            </view>
            <view 
              class="tab" 
              :class="{ active: activeTab === 'preview' }"
              @click="activeTab = 'preview'"
            >
              预览
            </view>
          </view>
          
          <!-- Markdown编辑器 -->
          <view v-if="activeTab === 'edit'" class="markdown-editor">
            <textarea 
              class="editor-textarea" 
              v-model="editedPlan.content" 
              placeholder="使用Markdown格式编辑研究方案内容"
            ></textarea>
            
            <view class="markdown-tips">
              <text class="tips-title">Markdown 快速指南:</text>
              <text class="tip-item"># 标题1</text>
              <text class="tip-item">## 标题2</text>
              <text class="tip-item">**粗体**</text>
              <text class="tip-item">*斜体*</text>
              <text class="tip-item">- 无序列表项</text>
              <text class="tip-item">1. 有序列表项</text>
            </view>
          </view>
          
          <!-- Markdown预览 -->
          <view v-else class="markdown-preview">
            <rich-text class="preview-content" :nodes="renderedContent"></rich-text>
          </view>
        </view>
        
        <!-- 操作按钮 -->
        <view class="form-actions">
          <button class="action-button cancel-button" @click="goBack">
            取消
          </button>
          <button class="action-button save-button" @click="savePlan">
            保存方案
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getResearchPlan, updateResearchPlan } from '@/controls/research-plan.js';

// 状态
const loading = ref(true);
const plan = ref(null);
const editedPlan = ref(null);
const activeTab = ref('edit');
const newKeyword = ref('');

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
    await loadPlanDetail(id);
  } else {
    loading.value = false;
    uni.showToast({
      title: '缺少方案ID',
      icon: 'none'
    });
  }
});

// 加载研究方案详情
const loadPlanDetail = async (id) => {
  try {
    loading.value = true;
    
    const planData = await getResearchPlan(id);
    
    // 处理frameworkStr字段
    if (planData.frameworkStr) {
      try {
        planData.framework = JSON.parse(planData.frameworkStr);
      } catch (parseError) {
        console.error('解析框架字符串失败:', parseError);
        planData.framework = {};
      }
    } else if (!planData.framework) {
      planData.framework = {};
    }
    
    plan.value = planData;
    
    // 创建编辑用的副本
    editedPlan.value = {
      title: planData.title,
      objective: planData.objective,
      keywords: [...planData.keywords],
      content: planData.content,
      templateType: planData.templateType,
      framework: planData.framework
    };
    
    loading.value = false;
  } catch (error) {
    console.error('加载研究方案详情失败:', error);
    loading.value = false;
    uni.showToast({
      title: '加载失败: ' + error.message,
      icon: 'none'
    });
  }
};

// 添加关键词
const addKeyword = () => {
  if (newKeyword.value.trim()) {
    // 避免重复添加
    if (!editedPlan.value.keywords.includes(newKeyword.value.trim())) {
      editedPlan.value.keywords.push(newKeyword.value.trim());
    }
    newKeyword.value = '';
  }
};

// 移除关键词
const removeKeyword = (index) => {
  editedPlan.value.keywords.splice(index, 1);
};

// 渲染Markdown内容
const renderedContent = computed(() => {
  if (!editedPlan.value || !editedPlan.value.content) return '';
  
  try {
    // 预处理内容，移除可能干扰Markdown解析的标记
    let processedContent = editedPlan.value.content;
    
    // 1. 移除所有Markdown围栏标记和类型指示器
    processedContent = processedContent.replace(/```markdown#?/gi, '');
    processedContent = processedContent.replace(/```\s*\w*/gi, '');
    processedContent = processedContent.replace(/```$/gm, '');
    
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
    
    const html = marked(processedContent);
    
    // 添加样式类
    return html
      .replace(/<h1/g, '<h1 class="md-h1"')
      .replace(/<h2/g, '<h2 class="md-h2"')
      .replace(/<h3/g, '<h3 class="md-h3"')
      .replace(/<h4/g, '<h4 class="md-h4"')
      .replace(/<p>/g, '<p class="md-p">')
      .replace(/<ul>/g, '<ul class="md-ul">')
      .replace(/<ol>/g, '<ol class="md-ol">')
      .replace(/<li>/g, '<li class="md-li">')
      .replace(/<pre>/g, '<pre class="md-pre">')
      .replace(/<code>/g, '<code class="md-code">');
  } catch (error) {
    console.error('Markdown渲染失败:', error);
    // 处理错误，返回原始文本
    return `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 16px; background: #f5f5f5; border-radius: 4px; font-family: monospace;">${editedPlan.value.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;
  }
});

// 保存方案
const savePlan = async () => {
  if (!editedPlan.value.title.trim()) {
    uni.showToast({
      title: '标题不能为空',
      icon: 'none'
    });
    return;
  }
  
  try {
    uni.showLoading({
      title: '正在保存...',
      mask: true
    });
    
    // 将framework转换为frameworkStr
    const updateData = {
      title: editedPlan.value.title,
      objective: editedPlan.value.objective,
      keywords: editedPlan.value.keywords,
      content: editedPlan.value.content
    };
    
    // 如果有framework对象，转换为字符串
    if (editedPlan.value.framework) {
      try {
        updateData.frameworkStr = JSON.stringify(editedPlan.value.framework);
      } catch (error) {
        console.error('转换框架为字符串失败:', error);
        // 出错时使用空对象
        updateData.frameworkStr = '{}';
      }
    }
    
    await updateResearchPlan(planId.value, updateData);
    
    uni.hideLoading();
    
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 延迟返回
    setTimeout(() => {
      goBack();
    }, 1500);
  } catch (error) {
    console.error('保存研究方案失败:', error);
    uni.hideLoading();
    uni.showToast({
      title: '保存失败: ' + error.message,
      icon: 'none'
    });
  }
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

// 获取模板类型名称
const getTemplateTypeName = (type) => {
  return templateTypeNames[type] || type;
};
</script>

<style>
.research-plan-editor-container {
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

/* 编辑器内容 */
.editor-content {
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.editor-header {
  padding: 24px;
  border-bottom: 1px solid #f0f0f0;
}

.editor-title {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  margin-bottom: 16px;
}

.plan-meta {
  display: flex;
  align-items: center;
  gap: 16px;
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

/* 表单容器 */
.form-container {
  padding: 24px;
}

.form-section {
  margin-bottom: 24px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 24px;
}

.form-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-weight: 500;
  margin-bottom: 8px;
  color: #333;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.form-textarea {
  height: 100px;
}

/* 关键词标签样式 */
.keywords-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.keyword-tag {
  background-color: #e8f5e9;
  color: #2e7d32;
  padding: 4px 10px;
  border-radius: 16px;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.remove-keyword {
  margin-left: 6px;
  font-weight: bold;
  cursor: pointer;
}

.keyword-input-container {
  display: flex;
  gap: 10px;
}

.keyword-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.add-keyword-btn {
  background-color: #05de7d;
  color: white;
  padding: 0 16px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
}

/* 编辑/预览标签 */
.edit-tabs {
  display: flex;
  margin-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.tab {
  padding: 12px 24px;
  cursor: pointer;
  font-weight: 500;
  color: #666;
}

.tab.active {
  color: #05de7d;
  border-bottom: 2px solid #05de7d;
}

/* Markdown编辑器 */
.markdown-editor {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  overflow: hidden;
}

.editor-textarea {
  width: 100%;
  height: 500px;
  padding: 16px;
  border: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.markdown-tips {
  background-color: #f8f9fa;
  padding: 12px;
  border-top: 1px solid #f0f0f0;
}

.tips-title {
  font-weight: 500;
  display: block;
  margin-bottom: 8px;
}

.tip-item {
  font-size: 12px;
  color: #666;
  margin-right: 16px;
  font-family: monospace;
}

/* Markdown预览 */
.markdown-preview {
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 16px;
  min-height: 500px;
  max-height: 500px;
  overflow-y: auto;
}

/* Markdown 样式 */
.preview-content {
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

.md-pre {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 16px 0;
}

.md-code {
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 0.9em;
}

/* 更多详细样式 */
.preview-content p,
.preview-content pre,
.preview-content ul,
.preview-content ol,
.preview-content blockquote {
  margin: 1em 0;
}

.preview-content h1,
.preview-content h2,
.preview-content h3,
.preview-content h4,
.preview-content h5,
.preview-content h6 {
  margin-top: 1.2em;
  margin-bottom: 0.8em;
  line-height: 1.4;
}

.preview-content ul,
.preview-content ol {
  padding-left: 2em;
}

.preview-content li {
  margin: 0.5em 0;
}

.preview-content blockquote {
  border-left: 4px solid #ddd;
  padding-left: 1em;
  color: #666;
}

/* 操作按钮 */
.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 24px;
}

.action-button {
  padding: 10px 24px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
}

.cancel-button {
  background-color: #f5f5f5;
  color: #455a64;
}

.save-button {
  background-color: #05de7d;
  color: white;
}
</style> 