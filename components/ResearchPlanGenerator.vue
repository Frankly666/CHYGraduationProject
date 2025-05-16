<template>
  <view class="research-plan-generator">
    <!-- 步骤指示器 -->
    <view class="steps-container">
      <view 
        v-for="(step, index) in steps" 
        :key="index" 
        class="step" 
        :class="{ 'active': currentStep >= index, 'complete': currentStep > index }"
      >
        <view class="step-number">{{ index + 1 }}</view>
        <text class="step-title">{{ step.title }}</text>
      </view>
    </view>
    
    <!-- 步骤内容 -->
    <view class="step-content">
      <!-- 步骤1: 输入基本信息 -->
      <view v-if="currentStep === 0" class="step-form">
        <view class="form-group">
          <text class="form-label">研究主题</text>
          <input 
            class="form-input" 
            v-model="formData.topic" 
            placeholder="请输入研究主题"
            @input="validateForm"
            @blur="validateForm"
          />
        </view>
        
        <view class="form-group">
          <text class="form-label">研究目标</text>
          <textarea 
            class="form-textarea" 
            v-model="formData.objective" 
            placeholder="请描述研究目标"
            @input="validateForm"
            @blur="validateForm"
          />
        </view>
        
        <view class="form-group">
          <text class="form-label">关键词（多个关键词以逗号分隔）</text>
          <view class="keyword-input-container">
            <input 
              class="form-input" 
              v-model="keywordsInput" 
              placeholder="例如：教育技术,数据挖掘,人工智能"
              @input="handleKeywordsInput"
              @blur="handleKeywordsBlur"
              @confirm="handleKeywordsConfirm"
            />
            <button class="add-keyword-btn" @click="addKeywordManually" :disabled="!keywordsInput.trim()">
              添加
            </button>
          </view>
          <view class="keywords-container">
            <view 
              v-for="(keyword, index) in formData.keywords" 
              :key="index" 
              class="keyword-tag"
            >
              <text>{{ keyword }}</text>
              <text class="remove-keyword" @click="removeKeyword(index)">×</text>
            </view>
          </view>
        </view>
        
        <view class="form-group">
          <text class="form-label">研究方案类型</text>
          <picker 
            class="form-picker" 
            :range="templateTypes" 
            :value="templateTypeIndex"
            @change="handleTemplateTypeChange"
          >
            <view class="picker-text">
              {{ templateTypeIndex >= 0 ? templateTypes[templateTypeIndex] : '请选择研究方案类型' }}
            </view>
          </picker>
        </view>
        
        <!-- 使用知识图谱数据选项 -->
        <view class="form-group" v-if="graphData">
          <label class="checkbox-container">
            <checkbox :checked="useGraphData" @change="toggleUseGraphData" />
            <text class="checkbox-label">使用已生成的知识图谱数据</text>
          </label>
        </view>
        
        <view class="form-actions">
          <button 
            class="primary-button" 
            @click="goToNextStep" 
            :disabled="!isFormValid"
            hover-class="button-hover"
          >
            下一步：生成框架
          </button>
        </view>
      </view>
      
      <!-- 步骤2: 生成和编辑框架 -->
      <view v-if="currentStep === 1" class="step-framework">
        <view class="loading-container" v-if="isGeneratingFramework">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在生成研究方案框架...</text>
        </view>
        
        <view v-else class="framework-content">
          <text class="section-title">研究方案框架</text>
          
          <view v-if="generatedFramework.error" class="error-message">
            <text>{{ generatedFramework.error }}</text>
            <button class="retry-button" @click="generateFramework">重试</button>
          </view>
          
          <view v-else class="framework-sections">
            <view 
              v-for="(section, key) in generatedFramework" 
              :key="key" 
              class="framework-section"
            >
              <view class="section-header">
                <text class="section-name">{{ section.title }}</text>
                <text class="section-edit" @click="editSection(key)">编辑</text>
              </view>
              <text class="section-description">{{ section.description }}</text>
            </view>
          </view>
          
          <view class="form-actions">
            <button class="secondary-button" @click="goToPreviousStep">
              返回上一步
            </button>
            <button class="primary-button" @click="goToNextStep" :disabled="!generatedFramework || generatedFramework.error">
              下一步：生成完整方案
            </button>
          </view>
        </view>
      </view>
      
      <!-- 步骤3: 生成完整方案 -->
      <view v-if="currentStep === 2" class="step-complete-plan">
        <view class="loading-container" v-if="isGeneratingContent">
          <view class="loading-spinner"></view>
          <text class="loading-text">正在生成完整研究方案...</text>
        </view>
        
        <view v-else class="plan-content">
          <text class="section-title">完整研究方案</text>
          
          <view v-if="generatedPlan.error" class="error-message">
            <text>{{ generatedPlan.error }}</text>
            <button class="retry-button" @click="generatePlanContent">重试</button>
          </view>
          
          <view v-else class="plan-display" ref="planDisplayRef">
            <!-- 添加研究方案标题 -->
            <view class="plan-header">
              <view class="plan-title">{{ formData.topic }}</view>
              <view class="plan-meta">
                <text>关键词: {{ formData.keywords.join('、') }}</text>
              </view>
            </view>
            
            <!-- 使用Markdown渲染器展示内容 -->
            <rich-text :nodes="renderedPlanContent"></rich-text>
            
            <!-- 添加脚注 -->
            <view class="plan-footer">
              <text>生成时间: {{ formatDate(new Date()) }}</text>
              <text>由EduResearch智能教育研究助手生成</text>
            </view>
          </view>
          
          <!-- 优化选项 -->
          <view class="optimization-controls" v-if="generatedPlan.content">
            <text class="optimization-title">方案优化</text>
            <view class="optimization-options">
              <view 
                v-for="(option, index) in optimizationOptions" 
                :key="index" 
                class="optimization-option"
                :class="{ 'selected': selectedOptimization === option.value }"
                @click="selectOptimization(option.value)"
              >
                <text>{{ option.label }}</text>
              </view>
            </view>
            
            <button 
              class="optimize-button" 
              @click="optimizePlan" 
              :disabled="!selectedOptimization || isOptimizing"
            >
              {{ isOptimizing ? '正在优化...' : '优化方案' }}
            </button>
          </view>
          
          <!-- 导出和保存选项 -->
          <view class="export-options" v-if="generatedPlan.content">
            <button class="export-button" @click="exportPlan" :disabled="isExporting">
              {{ isExporting ? '导出中...' : '导出为PDF' }}
            </button>
            <button class="save-button" @click="saveToHistory">
              保存到历史记录
            </button>
          </view>
          
          <view class="form-actions">
            <button class="secondary-button" @click="goToPreviousStep">
              返回上一步
            </button>
            <button class="restart-button" @click="restartProcess">
              重新开始
            </button>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 编辑框架部分的弹窗 -->
    <uni-popup ref="sectionEditPopup" type="center">
      <view class="edit-popup-content">
        <view class="edit-popup-header">
          <text class="edit-popup-title">编辑{{ editingSectionKey ? generatedFramework[editingSectionKey].title : '' }}</text>
        </view>
        <view class="edit-popup-body">
          <view class="form-group">
            <text class="form-label">标题</text>
            <input class="form-input" v-model="editingSectionTitle" placeholder="输入章节标题" />
          </view>
          <view class="form-group">
            <text class="form-label">描述</text>
            <textarea class="form-textarea" v-model="editingSectionDescription" placeholder="输入章节描述" />
          </view>
        </view>
        <view class="edit-popup-footer">
          <button class="cancel-button" @click="cancelEditSection">取消</button>
          <button class="confirm-button" @click="saveEditSection">保存</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
import { marked } from 'marked';
import { generateResearchPlanFramework, fillResearchPlanContent, optimizeResearchPlan } from '@/service/research-plan.js';
import { exportToPDF } from '@/service/pdf-export.js';
import { createResearchPlan } from '@/controls/research-plan.js';

// 组件属性
const props = defineProps({
  graphData: {
    type: Object,
    default: null
  },
  embedded: {
    type: Boolean,
    default: false
  }
});

// 组件事件
const emit = defineEmits(['complete', 'cancel']);

// 步骤配置
const steps = [
  { title: '基本信息' },
  { title: '方案框架' },
  { title: '完整方案' }
];
const currentStep = ref(0);

// 表单数据
const formData = reactive({
  topic: '',
  objective: '',
  keywords: [],
  templateType: 'experimental' // 默认值
});

// 知识图谱数据使用
const useGraphData = ref(props.graphData !== null);

// 关键词输入处理
const keywordsInput = ref('');
const handleKeywordsInput = (e) => {
  console.log('关键词输入变化:', keywordsInput.value);
  
  if (keywordsInput.value.includes(',')) {
    // 提取逗号分隔的关键词
    const keywords = keywordsInput.value.split(',').map(k => k.trim()).filter(k => k);
    console.log('添加关键词数组:', keywords);
    formData.keywords.push(...keywords);
    keywordsInput.value = '';
    validateForm(); // 添加验证调用
  }
};

// 添加新的方法处理失焦和回车
const handleKeywordsBlur = () => {
  console.log('关键词输入框失焦:', keywordsInput.value);
  
  if (keywordsInput.value.trim()) {
    // 添加单个关键词
    const keyword = keywordsInput.value.trim();
    console.log('失焦添加关键词:', keyword);
    formData.keywords.push(keyword);
    keywordsInput.value = '';
    validateForm(); // 验证表单
  }
};

const handleKeywordsConfirm = (e) => {
  console.log('关键词输入确认:', keywordsInput.value);
  
  if (keywordsInput.value.trim()) {
    // 添加单个关键词
    const keyword = keywordsInput.value.trim();
    console.log('确认添加关键词:', keyword);
    formData.keywords.push(keyword);
    keywordsInput.value = '';
    validateForm(); // 验证表单
  }
};

const removeKeyword = (index) => {
  formData.keywords.splice(index, 1);
  validateForm(); // 添加验证调用
};

// 模板类型选择
const templateTypes = ['实验研究', '调查研究', '案例研究', '文献综述', '行动研究'];
const templateTypeIndex = ref(0);
const templateTypeValues = ['experimental', 'survey', 'case-study', 'literature-review', 'action-research'];

const handleTemplateTypeChange = (e) => {
  templateTypeIndex.value = e.detail.value;
  formData.templateType = templateTypeValues[e.detail.value];
  validateForm(); // 添加验证调用
};

// 表单验证
const isFormValid = ref(false);
const validateForm = () => {
  console.log('验证表单:', formData); // 添加日志便于调试
  isFormValid.value = !!formData.topic && !!formData.objective && formData.keywords.length > 0;
  console.log('验证结果:', isFormValid.value); // 添加日志便于调试
};

// 监听输入变化
watch(() => formData.topic, () => validateForm());
watch(() => formData.objective, () => validateForm());

// 切换是否使用知识图谱数据
const toggleUseGraphData = (e) => {
  useGraphData.value = e.detail.value;
};

// 步骤控制
const goToNextStep = async () => {
  try {
    if (currentStep.value === 0) {
      // 从步骤1到步骤2，生成框架
      uni.showLoading({
        title: '正在生成框架...',
        mask: true
      });
      
      console.log('开始生成框架，表单数据:', formData);
      if (!isFormValid.value) {
        uni.hideLoading();
        uni.showToast({
          title: '请完成所有必填项',
          icon: 'none'
        });
        return;
      }
      
      await generateFramework();
      
      // 验证框架是否生成成功
      if (!generatedFramework.value || (generatedFramework.value.error && !Object.keys(generatedFramework.value).some(key => key.startsWith('section')))) {
        uni.hideLoading();
        uni.showModal({
          title: '生成失败',
          content: generatedFramework.value?.error || '生成框架失败，请重试',
          showCancel: false
        });
        return;
      }
      
      uni.hideLoading();
    } else if (currentStep.value === 1) {
      // 从步骤2到步骤3，生成完整内容
      uni.showLoading({
        title: '正在生成完整方案...',
        mask: true
      });
      
      await generatePlanContent();
      
      // 验证内容是否生成成功
      if (!generatedPlan.value || generatedPlan.value.error) {
        uni.hideLoading();
        uni.showModal({
          title: '生成失败',
          content: generatedPlan.value?.error || '生成方案内容失败，请重试',
          showCancel: false
        });
        return;
      }
      
      uni.hideLoading();
    }
    
    if (currentStep.value < steps.length - 1) {
      currentStep.value++;
    }
  } catch (error) {
    console.error('步骤切换失败:', error);
    uni.hideLoading();
    uni.showToast({
      title: '操作失败: ' + error.message,
      icon: 'none'
    });
  }
};

const goToPreviousStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--;
  }
};

// 框架生成
const isGeneratingFramework = ref(false);
const generatedFramework = ref(null);

const generateFramework = async () => {
  try {
    isGeneratingFramework.value = true;
    
    const result = await generateResearchPlanFramework({
      topic: formData.topic,
      objective: formData.objective,
      keywords: formData.keywords,
      templateType: formData.templateType
    });
    
    generatedFramework.value = result;
  } catch (error) {
    console.error('生成框架失败:', error);
    generatedFramework.value = { error: '生成框架失败: ' + error.message };
  } finally {
    isGeneratingFramework.value = false;
  }
};

// 框架编辑
const sectionEditPopup = ref(null);
const editingSectionKey = ref(null);
const editingSectionTitle = ref('');
const editingSectionDescription = ref('');

const editSection = (key) => {
  editingSectionKey.value = key;
  editingSectionTitle.value = generatedFramework.value[key].title;
  editingSectionDescription.value = generatedFramework.value[key].description;
  sectionEditPopup.value.open();
};

const cancelEditSection = () => {
  sectionEditPopup.value.close();
};

const saveEditSection = () => {
  if (editingSectionKey.value && generatedFramework.value) {
    generatedFramework.value[editingSectionKey.value] = {
      title: editingSectionTitle.value,
      description: editingSectionDescription.value
    };
  }
  sectionEditPopup.value.close();
};

// 完整方案生成
const isGeneratingContent = ref(false);
const generatedPlan = ref({ content: '', framework: null });

const generatePlanContent = async () => {
  try {
    isGeneratingContent.value = true;
    
    const graphDataToUse = useGraphData.value ? props.graphData : null;
    const result = await fillResearchPlanContent(generatedFramework.value, formData, graphDataToUse);
    
    generatedPlan.value = result;
  } catch (error) {
    console.error('生成完整方案失败:', error);
    generatedPlan.value = { error: '生成完整方案失败: ' + error.message };
  } finally {
    isGeneratingContent.value = false;
  }
};

// Markdown渲染
const renderedPlanContent = computed(() => {
  if (!generatedPlan.value.content) return '';
  try {
    // 0. 记录原始内容，方便调试
    console.log('原始内容前50个字符:', generatedPlan.value.content.substring(0, 50));
    
    // 1. 创建内容的副本
    let content = generatedPlan.value.content;
    
    // 2. 全面清理Markdown围栏和各种前缀标记
    // 处理开头的```markdown#标记（使用非贪婪匹配确保只移除开头部分）
    content = content.replace(/^[\s`]{0,3}markdown#?.*?\n/i, '');
    
    // 移除所有```markdown标记
    content = content.replace(/```markdown#?/gi, '');
    
    // 移除任何代码块标记
    content = content.replace(/```\w*/gi, '');
    content = content.replace(/```/g, '');
    
    // 移除可能的引号包裹
    content = content.replace(/^['"`]|['"`]$/g, '');
    
    // 3. 确保正确的Markdown格式
    // 确保标题格式正确 (# 后面有空格)
    content = content.replace(/^(#{1,6})([^\s])/gm, '$1 $2');
    
    // 确保列表项格式正确
    content = content.replace(/^([*\-+])([^\s])/gm, '$1 $2');
    content = content.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
    
    // 4. 结构化格式调整
    content = content
      // 确保段落之间有空行
      .replace(/\n([^#\s\-\*\d])/g, '\n\n$1')
      // 确保标题前有空行
      .replace(/([^\n])\n(#{1,6})/g, '$1\n\n$2')
      // 确保列表项有正确的空格
      .replace(/\n([*\-+])/g, '\n\n$1')
      // 移除多余的空行（三个以上的空行缩减为两个）
      .replace(/\n{3,}/g, '\n\n');
    
    // 5. 记录预处理后的内容，方便调试
    console.log('预处理后内容前50个字符:', content.substring(0, 50));
    console.log('预处理后内容长度:', content.length);
    
    // 6. 配置marked选项以确保正确渲染
    marked.setOptions({
      gfm: true,          // GitHub风格Markdown
      breaks: true,       // 识别回车符为换行符
      headerIds: true,    // 为标题元素添加id
      mangle: false,      // 不处理HTML
      pedantic: false,    // 不严格遵循原始Markdown
      sanitize: false,    // 不过滤HTML标签
      smartLists: true,   // 使用更智能的列表行为
      smartypants: true   // 使用更智能的标点
    });
    
    // 7. 将Markdown转换为HTML
    const html = marked(content);
    console.log('HTML渲染后长度:', html.length);
    
    // 8. 为渲染的HTML添加适当的类名以应用样式
    return html
      .replace(/<h1/g, '<h1 class="plan-h1"')
      .replace(/<h2/g, '<h2 class="plan-h2"')
      .replace(/<h3/g, '<h3 class="plan-h3"')
      .replace(/<h4/g, '<h4 class="plan-h4"')
      .replace(/<h5/g, '<h5 class="plan-h5"')
      .replace(/<h6/g, '<h6 class="plan-h6"')
      .replace(/<p>/g, '<p class="plan-p">')
      .replace(/<ul>/g, '<ul class="plan-ul">')
      .replace(/<ol>/g, '<ol class="plan-ol">')
      .replace(/<li>/g, '<li class="plan-li">')
      .replace(/<pre>/g, '<pre class="plan-pre">')
      .replace(/<code>/g, '<code class="plan-code">');
  } catch (error) {
    console.error('Markdown渲染失败:', error);
    
    // 在渲染失败时提供友好的降级处理，返回预处理过的纯文本
    let cleanText = generatedPlan.value.content
      .replace(/```markdown#?|```\s*\w*|```/g, '')
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    return `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 16px; background: #f5f5f5; border-radius: 4px; font-family: monospace;">${cleanText}</pre>`;
  }
});

// 方案优化
const optimizationOptions = [
  { label: '方法论优化', value: 'methodology' },
  { label: '文献引用增强', value: 'literature' },
  { label: '可行性提升', value: 'feasibility' },
  { label: '创新性增强', value: 'innovation' }
];
const selectedOptimization = ref('');
const isOptimizing = ref(false);

const selectOptimization = (value) => {
  selectedOptimization.value = value;
};

const optimizePlan = async () => {
  if (!selectedOptimization.value || !generatedPlan.value.content) return;
  
  try {
    isOptimizing.value = true;
    
    const optimizedContent = await optimizeResearchPlan(generatedPlan.value.content, {
      focus: selectedOptimization.value
    });
    
    // 更新生成的方案内容
    generatedPlan.value = {
      ...generatedPlan.value,
      content: optimizedContent
    };
    
  } catch (error) {
    console.error('优化方案失败:', error);
    uni.showToast({
      title: '优化方案失败: ' + error.message,
      icon: 'none'
    });
  } finally {
    isOptimizing.value = false;
  }
};

// 直接将Markdown转换为HTML，用于导出
const markdownToHTML = (markdown) => {
  if (!markdown) return '';
  
  try {
    // 配置marked选项
    marked.setOptions({
      gfm: true,          // GitHub风格Markdown
      breaks: true,       // 识别回车符为换行符
      headerIds: true,    // 为标题元素添加id
      mangle: false,      // 不处理HTML
      pedantic: false,    // 不严格遵循原始Markdown
      sanitize: false,    // 不过滤HTML标签
      smartLists: true,   // 使用更智能的列表行为
      smartypants: true   // 使用更智能的标点
    });
    
    // 使用与renderedPlanContent相同的预处理逻辑
    let content = markdown;
    
    // 处理开头的```markdown#标记（使用非贪婪匹配确保只移除开头部分）
    content = content.replace(/^[\s`]{0,3}markdown#?.*?\n/i, '');
    
    // 移除所有```markdown标记
    content = content.replace(/```markdown#?/gi, '');
    
    // 移除任何代码块标记
    content = content.replace(/```\w*/gi, '');
    content = content.replace(/```/g, '');
    
    // 移除可能的引号包裹
    content = content.replace(/^['"`]|['"`]$/g, '');
    
    // 确保标题格式正确 (# 后面有空格)
    content = content.replace(/^(#{1,6})([^\s])/gm, '$1 $2');
    
    // 确保列表项格式正确
    content = content.replace(/^([*\-+])([^\s])/gm, '$1 $2');
    content = content.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
    
    // 结构化格式调整
    content = content
      // 确保段落之间有空行
      .replace(/\n([^#\s\-\*\d])/g, '\n\n$1')
      // 确保标题前有空行
      .replace(/([^\n])\n(#{1,6})/g, '$1\n\n$2')
      // 确保列表项有正确的空格
      .replace(/\n([*\-+])/g, '\n\n$1')
      // 移除多余的空行（三个以上的空行缩减为两个）
      .replace(/\n{3,}/g, '\n\n');
    
    // 使用marked转换为HTML
    const html = marked(content);
    
    // 添加内联样式以确保PDF正确显示
    const styledHtml = html
      .replace(/<h1/g, '<h1 style="font-size:24px;font-weight:bold;margin:24px 0 16px;color:#333;border-bottom:1px solid #eee;padding-bottom:8px;"')
      .replace(/<h2/g, '<h2 style="font-size:20px;font-weight:bold;margin:20px 0 14px;color:#333;"')
      .replace(/<h3/g, '<h3 style="font-size:18px;font-weight:bold;margin:18px 0 12px;color:#333;"')
      .replace(/<h4/g, '<h4 style="font-size:16px;font-weight:bold;margin:16px 0 10px;color:#333;"')
      .replace(/<h5/g, '<h5 style="font-size:14px;font-weight:bold;margin:14px 0 8px;color:#333;"')
      .replace(/<h6/g, '<h6 style="font-size:13px;font-weight:bold;margin:12px 0 6px;color:#333;"')
      .replace(/<p>/g, '<p style="margin:12px 0;line-height:1.6;color:#333;">')
      .replace(/<ul>/g, '<ul style="margin:12px 0;padding-left:24px;">')
      .replace(/<ol>/g, '<ol style="margin:12px 0;padding-left:24px;">')
      .replace(/<li>/g, '<li style="margin:6px 0;line-height:1.5;">')
      .replace(/<pre/g, '<pre style="background-color:#f5f5f5;padding:12px;border-radius:5px;overflow-x:auto;margin:16px 0;"')
      .replace(/<code/g, '<code style="background-color:#f0f0f0;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:0.9em;"');
      
    return styledHtml;
  } catch (error) {
    console.error('Markdown转HTML失败:', error);
    // 在转换失败的情况下，直接返回纯文本以确保内容可见
    let cleanText = markdown
      .replace(/```markdown#?|```\s*\w*|```/g, '')
      .replace(/^['"]+|['"]+$/g, '')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    return `<div style="white-space:pre-wrap;padding:16px;background:#f5f5f5;border-radius:4px;font-family:monospace;line-height:1.5;">${cleanText}</div>`;
  }
};

// PDF导出功能
const isExporting = ref(false);
const planDisplayRef = ref(null);

const exportPlan = async () => {
  try {
    isExporting.value = true;
    
    uni.showLoading({
      title: '正在生成PDF...',
      mask: true
    });
    
    // 检查是否为Web环境
    if (typeof document === 'undefined') {
      throw new Error('当前不是Web环境，无法导出PDF');
    }
    
    // 使用预处理函数创建导出内容
    console.log('准备导出PDF...');
    
    // 创建一个临时的div来包含格式化后的内容
    const tempContainer = document.createElement('div');
    tempContainer.className = 'plan-display export-container';
    tempContainer.style.width = '100%';
    tempContainer.style.fontFamily = 'PingFang SC, Microsoft YaHei, sans-serif';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.padding = '30px'; 
    tempContainer.style.lineHeight = '1.6';
    tempContainer.style.color = '#333333';
    
    // 添加标题和元数据
    const headerDiv = document.createElement('div');
    headerDiv.className = 'plan-header';
    headerDiv.style.textAlign = 'center';
    headerDiv.style.marginBottom = '30px';
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'plan-title';
    titleDiv.textContent = formData.topic;
    titleDiv.style.fontSize = '26px';
    titleDiv.style.fontWeight = 'bold';
    titleDiv.style.marginBottom = '15px';
    headerDiv.appendChild(titleDiv);
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'plan-meta';
    metaDiv.textContent = `关键词: ${formData.keywords.join('、')}`;
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
    objectiveDiv.style.textAlign = 'left';
    
    const objectiveLabelDiv = document.createElement('div');
    objectiveLabelDiv.textContent = '研究目标:';
    objectiveLabelDiv.style.fontWeight = 'bold';
    objectiveLabelDiv.style.marginBottom = '8px';
    objectiveDiv.appendChild(objectiveLabelDiv);
    
    const objectiveContentDiv = document.createElement('div');
    objectiveContentDiv.textContent = formData.objective || '无';
    objectiveContentDiv.style.color = '#333';
    objectiveDiv.appendChild(objectiveContentDiv);
    
    headerDiv.appendChild(objectiveDiv);
    tempContainer.appendChild(headerDiv);
    
    // 添加内容区域
    const contentDiv = document.createElement('div');
    contentDiv.className = 'plan-content';
    contentDiv.style.fontSize = '15px';
    contentDiv.style.lineHeight = '1.6';
    contentDiv.style.textAlign = 'left';
    
    try {
      // 使用我们的markdownToHTML函数处理内容
      contentDiv.innerHTML = markdownToHTML(generatedPlan.value.content);
    } catch (markdownError) {
      console.error('Markdown转HTML失败:', markdownError);
      // 降级处理
      let cleanText = generatedPlan.value.content
        .replace(/```markdown#?|```\s*\w*|```/g, '')
        .replace(/^['"]+|['"]+$/g, '')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      contentDiv.innerHTML = `<pre style="white-space: pre-wrap; word-wrap: break-word; padding: 16px; background: #f5f5f5; border-radius: 4px; font-family: monospace;">${cleanText}</pre>`;
    }
    
    // 确保内容中所有标题都有适当的分页控制
    Array.from(contentDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')).forEach(heading => {
      heading.style.pageBreakAfter = 'avoid';
      heading.style.pageBreakBefore = 'auto';
    });
    
    // 确保段落和列表有适当的分页控制
    Array.from(contentDiv.querySelectorAll('p')).forEach(p => {
      p.style.pageBreakInside = 'avoid';
    });
    
    Array.from(contentDiv.querySelectorAll('ul, ol')).forEach(list => {
      list.style.pageBreakInside = 'auto';
    });
    
    tempContainer.appendChild(contentDiv);
    
    // 添加脚注
    const footerDiv = document.createElement('div');
    footerDiv.className = 'plan-footer';
    footerDiv.style.marginTop = '40px';
    footerDiv.style.paddingTop = '15px';
    footerDiv.style.borderTop = '1px solid #f0f0f0';
    footerDiv.style.textAlign = 'center';
    footerDiv.style.fontSize = '12px';
    footerDiv.style.color = '#999';
    
    const timeText = document.createElement('div');
    timeText.textContent = `生成时间: ${formatDate(new Date())}`;
    footerDiv.appendChild(timeText);
    
    const serviceText = document.createElement('div');
    serviceText.textContent = '由EduResearch智能教育研究助手生成';
    footerDiv.appendChild(serviceText);
    
    tempContainer.appendChild(footerDiv);
    
    console.log('导出内容准备完成');
    
    try {
      console.log('添加元素到DOM并准备导出...');
      
      // 设置样式，确保能被正确捕获
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '0';
      tempContainer.style.left = '0';
      tempContainer.style.width = '210mm'; // A4宽度
      tempContainer.style.maxWidth = '210mm';
      tempContainer.style.padding = '20mm 20mm';
      tempContainer.style.boxSizing = 'border-box';
      tempContainer.style.zIndex = '-1000'; // 放在很低的层级，不影响用户界面
      
      document.body.appendChild(tempContainer);
      
      // 给页面渲染元素的时间
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 构建PDF文件名
      const filename = `${formData.topic.substring(0, 20)}_研究方案.pdf`;
      console.log('准备导出PDF，文件名:', filename);
      
      // 调用PDF导出服务，传递额外的分页处理参数
      const result = await exportToPDF({
        element: tempContainer,
        filename: filename,
        title: formData.topic,
        author: '教育研究助手',
        margins: { top: 15, right: 15, bottom: 20, left: 15 }, // 调整页边距
        pageSize: 'a4' // 使用A4页面
      });
      
      uni.hideLoading();
      
      if (result.success) {
        uni.showToast({
          title: '导出成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('PDF导出失败:', error);
      throw error;
    } finally {
      // 确保清理临时创建的元素
      if (document.body.contains(tempContainer)) {
        try {
          document.body.removeChild(tempContainer);
          console.log('临时导出元素已移除');
        } catch (cleanupError) {
          console.error('移除临时元素失败:', cleanupError);
        }
      }
    }
  } catch (error) {
    console.error('导出PDF过程中出错:', error);
    uni.hideLoading();
    
    // 显示友好的错误信息
    uni.showModal({
      title: '导出失败',
      content: `无法导出PDF: ${error.message}。您可以尝试刷新页面后重试，或复制内容到其他文档工具中。`,
      showCancel: false
    });
  } finally {
    isExporting.value = false;
  }
};

// 保存到历史记录
const saveToHistory = async () => {
  try {
    // 检查用户是否登录
    const isLoggedIn = uni.getStorageSync('isLogIn');
    const userId = uni.getStorageSync('userId');
    
    if (!isLoggedIn || !userId) {
      uni.showToast({
        title: '请先登录再保存',
        icon: 'none'
      });
      return;
    }
    
    // 显示加载提示
    uni.showLoading({
      title: '正在保存...',
      mask: true
    });
    
    // 清理和验证数据
    const cleanString = (str, maxLength = 500) => {
      if (str === null || str === undefined) return '';
      if (typeof str !== 'string') str = String(str);
      
      // 移除MongoDB中不允许的字符，特别是点和美元符号
      return str
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')  // 移除控制字符
        .replace(/[\uD800-\uDFFF]/g, '')  // 移除代理对字符
        .replace(/[^\u0000-\u00ff\u4e00-\u9fa5]/g, '') // 只保留基本拉丁字母、数字和中文字符
        .slice(0, maxLength);
    };
    
    // 清理关键词数组
    const cleanKeywords = (keywords) => {
      if (!Array.isArray(keywords)) return [];
      return keywords
        .map(k => cleanString(k, 50))
        .filter(k => k.length > 0)
        .slice(0, 10); // 最多10个关键词
    };
    
    // 将复杂对象转换为安全的JSON字符串
    const safeJsonString = (obj) => {
      if (!obj) return '{}';
      try {
        // 先转换为简单对象
        const safeObj = {};
        
        // 仅提取基本文本字段
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            if (obj[key].title) safeObj[key] = {
              title: cleanString(obj[key].title, 100),
              description: cleanString(obj[key].description, 500)
            };
          }
        });
        
        // 转换为JSON并验证
        const jsonStr = JSON.stringify(safeObj);
        // 尝试解析一次确保有效
        JSON.parse(jsonStr);
        
        return jsonStr;
      } catch (err) {
        console.error('框架对象转JSON失败:', err);
        return '{}';
      }
    };
    
    // 准备安全的研究方案数据
    const safePlanData = {
      title: cleanString(formData.topic, 100),
      topic: cleanString(formData.topic, 100),
      objective: cleanString(formData.objective, 500),
      keywords: cleanKeywords(formData.keywords),
      templateType: cleanString(formData.templateType, 50),
      frameworkStr: safeJsonString(generatedFramework.value),
      content: cleanString(generatedPlan.value.content, 50000),
      // 添加一个客户端生成的ID作为备用
      clientId: `client_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    };
    
    console.log('处理后的安全数据:', safePlanData);
    
    // 保存到研究方案数据库并获取返回结果
    console.log('开始调用创建研究方案API...');
    const savedPlan = await createResearchPlan(safePlanData);
    console.log('保存成功，返回的完整方案数据:', savedPlan);
    
    // 完整输出所有返回的字段，用于调试
    Object.keys(savedPlan).forEach(key => {
      console.log(`返回字段[${key}]:`, savedPlan[key]);
    });
    
    // 确保返回的数据中包含_id
    let planId = null;
    if (savedPlan && savedPlan._id) {
      planId = savedPlan._id;
      console.log('成功获取到方案ID:', planId);
    } else if (savedPlan && savedPlan.id) {
      planId = savedPlan.id;
      console.log('使用替代ID字段:', planId);
    } else {
      // 使用客户端生成的ID作为备用
      planId = safePlanData.clientId;
      console.log('使用客户端生成的备用ID:', planId);
    }
    
    // 可以在本地存储中记录最近保存的方案ID
    try {
      // 获取现有的历史记录
      let planHistory = uni.getStorageSync('researchPlanHistory') || [];
      // 确保它是数组
      if (!Array.isArray(planHistory)) planHistory = [];
      
      // 添加新保存的方案ID到历史记录头部
      planHistory.unshift({
        id: planId,
        title: safePlanData.title,
        time: Date.now()
      });
      
      // 只保留最近10条记录
      if (planHistory.length > 10) {
        planHistory = planHistory.slice(0, 10);
      }
      
      // 保存到本地存储
      uni.setStorageSync('researchPlanHistory', planHistory);
      console.log('更新方案历史记录成功，当前历史:', planHistory);
    } catch (storageError) {
      console.error('保存方案历史记录失败:', storageError);
      // 不影响主流程，继续执行
    }
    
    uni.hideLoading();
    
    uni.showToast({
      title: '保存成功',
      icon: 'success'
    });
    
    // 可以选择保存后直接跳转到详情页
    if (planId) {
      setTimeout(() => {
        console.log('即将跳转到详情页，ID:', planId);
        uni.navigateTo({
          url: `/pages/researchPlanDetail/researchPlanDetail?id=${encodeURIComponent(planId)}`
        });
      }, 1500); // 延迟1.5秒后跳转，让用户看到保存成功的提示
    }
    
  } catch (error) {
    console.error('保存研究方案失败:', error);
    uni.hideLoading();
    uni.showToast({
      title: '保存失败: ' + error.message,
      icon: 'none'
    });
  }
};

// 重新开始
const restartProcess = () => {
  // 重置表单数据
  formData.topic = '';
  formData.objective = '';
  formData.keywords = [];
  formData.templateType = 'experimental';
  
  // 重置其他状态
  keywordsInput.value = '';
  templateTypeIndex.value = 0;
  isFormValid.value = false;
  generatedFramework.value = null;
  generatedPlan.value = { content: '', framework: null };
  selectedOptimization.value = '';
  
  // 返回第一步
  currentStep.value = 0;
};

// 手动添加关键词的方法
const addKeywordManually = () => {
  if (keywordsInput.value.trim()) {
    console.log('手动添加关键词:', keywordsInput.value.trim());
    formData.keywords.push(keywordsInput.value.trim());
    keywordsInput.value = '';
    validateForm();
    
    // 消息提示
    uni.showToast({
      title: '关键词已添加',
      icon: 'none',
      duration: 1000
    });
  }
};

// 格式化日期函数
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

// 组件初始化
onMounted(() => {
  console.log('研究方案生成器组件已挂载');
  
  // 初始化表单验证
  validateForm();
  
  // 确保弹窗组件已正确初始化
  if (!sectionEditPopup.value) {
    console.warn('编辑弹窗组件未正确初始化');
    // 延迟再次尝试获取弹窗引用
    setTimeout(() => {
      if (!sectionEditPopup.value) {
        console.warn('编辑弹窗组件延迟初始化仍然失败');
      }
    }, 1000);
  }
  
  // 打印初始状态
  console.log('初始状态:', {
    currentStep: currentStep.value,
    formData: JSON.stringify(formData),
    isFormValid: isFormValid.value,
    templateTypeIndex: templateTypeIndex.value,
    graphData: props.graphData ? '存在' : '不存在'
  });
});

// 监听属性变化
watch(() => props.graphData, (newVal) => {
  useGraphData.value = newVal !== null;
});
</script>

<style>
.research-plan-generator {
  width: 100%;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

/* 步骤指示器样式 */
.steps-container {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  position: relative;
}

.steps-container::before {
  content: '';
  position: absolute;
  top: 18px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: #e0e0e0;
  z-index: 1;
}

.step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 2;
  flex: 1;
}

.step-number {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #e0e0e0;
  color: #666;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.step.active .step-number {
  background-color: #05de7d;
  color: white;
}

.step.complete .step-number {
  background-color: #05de7d;
  color: white;
}

.step-title {
  font-size: 14px;
  color: #666;
  transition: all 0.3s ease;
}

.step.active .step-title,
.step.complete .step-title {
  color: #05de7d;
  font-weight: bold;
}

/* 表单样式 */
.step-form,
.step-framework,
.step-complete-plan {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

.form-picker {
  width: 100%;
  height: 42px;
  border: 1px solid #ddd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 12px;
}

.picker-text {
  font-size: 14px;
  color: #333;
}

/* 关键词标签样式 */
.keyword-input-container {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
}

.add-keyword-btn {
  background-color: #05de7d;
  color: white;
  padding: 0 12px;
  border-radius: 6px;
  border: none;
  font-size: 14px;
  height: 42px;
  line-height: 42px;
  white-space: nowrap;
}

.add-keyword-btn:disabled {
  background-color: #b0bec5;
  cursor: not-allowed;
}

.keywords-container {
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
  display: flex;
  align-items: center;
}

.remove-keyword {
  margin-left: 6px;
  font-weight: bold;
  cursor: pointer;
}

/* 复选框样式 */
.checkbox-container {
  display: flex;
  align-items: center;
}

.checkbox-label {
  margin-left: 8px;
  font-size: 14px;
}

/* 按钮样式 */
.form-actions {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
}

.primary-button {
  background-color: #05de7d;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
}

.primary-button:disabled {
  background-color: #b0bec5;
  cursor: not-allowed;
}

.secondary-button {
  background-color: #eceff1;
  color: #455a64;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
}

.retry-button {
  background-color: #ffb74d;
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  margin-left: 10px;
}

.optimize-button {
  background-color: #5c6bc0;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  margin-top: 12px;
}

.export-options {
  display: flex;
  margin: 24px 0;
  justify-content: center;
  gap: 16px;
}

.export-button,
.save-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.export-button {
  background-color: #4caf50;
  color: white;
  min-width: 140px;
}

.export-button:hover:not(:disabled) {
  background-color: #43a047;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.export-button:disabled {
  background-color: #a5d6a7;
  cursor: not-allowed;
}

.save-button {
  background-color: #2196f3;
  color: white;
  min-width: 140px;
}

.save-button:hover {
  background-color: #1e88e5;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.restart-button {
  background-color: #ef5350;
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
}

/* 加载状态样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
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

/* 错误消息样式 */
.error-message {
  background-color: #ffebee;
  color: #c62828;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
}

/* 框架内容样式 */
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.framework-sections {
  margin-bottom: 20px;
}

.framework-section {
  background-color: #f5f5f5;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.section-name {
  font-weight: 600;
  color: #333;
}

.section-edit {
  color: #2196f3;
  font-size: 12px;
  cursor: pointer;
}

.section-description {
  font-size: 14px;
  color: #555;
  line-height: 1.5;
}

/* 编辑弹窗样式 */
.edit-popup-content {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  width: 80vw;
  max-width: 500px;
}

.edit-popup-header {
  margin-bottom: 16px;
}

.edit-popup-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.edit-popup-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

.cancel-button {
  background-color: #eceff1;
  color: #455a64;
  padding: 8px 16px;
  border-radius: 6px;
  margin-right: 10px;
}

.confirm-button {
  background-color: #05de7d;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
}

/* 方案内容样式 */
.plan-display {
  background-color: white;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  padding: 24px;
  margin-bottom: 20px;
  max-height: 500px;
  overflow-y: auto;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.plan-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.plan-title {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  margin-bottom: 10px;
  text-align: center;
}

.plan-meta {
  font-size: 14px;
  color: #666;
  text-align: center;
}

.plan-footer {
  margin-top: 30px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #999;
}

/* 导出样式 - 这些样式会影响导出的PDF */
.rich-text {
  line-height: 1.8;
  color: #333;
}

/* 导出容器样式 */
.export-container {
  max-height: none !important;
  overflow: visible !important;
  width: 100%;
  background-color: white;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.export-container h1,
.export-container h2,
.export-container h3,
.export-container h4,
.export-container h5,
.export-container h6 {
  margin: 1.2em 0 0.8em;
  font-weight: 600;
  line-height: 1.2;
  color: #222;
}

.export-container h1 {
  font-size: 1.8em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.export-container h2 {
  font-size: 1.6em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.export-container h3 {
  font-size: 1.4em;
}

.export-container h4 {
  font-size: 1.2em;
}

.export-container p {
  margin: 0.8em 0;
  text-align: justify;
}

.export-container ul,
.export-container ol {
  padding-left: 2em;
  margin: 0.8em 0;
}

.export-container li {
  margin: 0.4em 0;
}

/* 使Markdown渲染后的内容更美观 */
.rich-text :deep(h1),
.rich-text :deep(h2),
.rich-text :deep(h3),
.rich-text :deep(h4),
.rich-text :deep(h5),
.rich-text :deep(h6) {
  margin: 1.2em 0 0.8em;
  font-weight: 600;
  line-height: 1.2;
  color: #222;
}

.rich-text :deep(h1) {
  font-size: 1.8em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.rich-text :deep(h2) {
  font-size: 1.6em;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.3em;
}

.rich-text :deep(h3) {
  font-size: 1.4em;
}

.rich-text :deep(h4) {
  font-size: 1.2em;
}

.rich-text :deep(p) {
  margin: 0.8em 0;
  text-align: justify;
}

.rich-text :deep(ul),
.rich-text :deep(ol) {
  padding-left: 2em;
  margin: 0.8em 0;
}

.rich-text :deep(li) {
  margin: 0.4em 0;
}

.rich-text :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  color: #666;
  background-color: #f8f8f8;
  border-left: 4px solid #ddd;
}

.rich-text :deep(code) {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 0.9em;
}

.rich-text :deep(pre) {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin: 1em 0;
}

.rich-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.rich-text :deep(th),
.rich-text :deep(td) {
  padding: 0.5em;
  border: 1px solid #ddd;
  text-align: left;
}

.rich-text :deep(th) {
  background-color: #f5f5f5;
  font-weight: bold;
}

/* 优化选项样式 */
.optimization-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.optimization-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.optimization-option {
  background-color: #f1f3f4;
  color: #333;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.optimization-option.selected {
  background-color: #05de7d;
  color: white;
}

/* 响应式调整 */
@media (max-width: 600px) {
  .form-actions {
    flex-direction: column;
  }
  
  .primary-button,
  .secondary-button,
  .restart-button {
    width: 100%;
    margin-bottom: 10px;
  }
  
  .export-options {
    flex-direction: column;
  }
  
  .export-button,
  .save-button {
    width: 100%;
    margin-bottom: 10px;
    margin-right: 0;
  }
}

/* 按钮悬停效果 */
.button-hover {
  opacity: 0.85;
  transform: scale(0.98);
}

.export-container li {
  margin: 0.4em 0;
}

.export-container blockquote {
  margin: 1em 0;
  padding: 0.5em 1em;
  color: #666;
  background-color: #f8f8f8;
  border-left: 4px solid #ddd;
}

.export-container code {
  background-color: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: Consolas, Monaco, 'Andale Mono', monospace;
  font-size: 0.9em;
}

.export-container pre {
  background-color: #f5f5f5;
  padding: 1em;
  border-radius: 5px;
  overflow-x: auto;
  margin: 1em 0;
}

.export-container table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}

.export-container th,
.export-container td {
  padding: 0.5em;
  border: 1px solid #ddd;
  text-align: left;
}

.export-container th {
  background-color: #f5f5f5;
  font-weight: bold;
}

/* 使Markdown渲染后的内容更美观 */
</style> 