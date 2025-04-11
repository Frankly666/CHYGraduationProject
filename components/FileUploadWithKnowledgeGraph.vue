<template>
  <view class="file-upload-container">
    <!-- 文件上传区域 -->
    <view class="upload-area" @click="triggerFileInput" v-if="!currentFile">
      <uni-icons type="upload" size="30"></uni-icons>
      <text class="upload-text">点击上传文件</text>
    </view>

    <!-- 当前文件信息 -->
    <view class="current-file" v-if="currentFile">
      <text class="file-name">{{ currentFile.name }}</text>
      <text class="file-size">{{ formatFileSize(currentFile.size) }}</text>
    </view>

    <!-- 知识图谱生成提示 -->
    <view class="graph-generate" v-if="showGenerateButton">
      <view class="suggestion-card">
        <uni-icons type="info-filled" size="20" color="#409eff"></uni-icons>
        <view class="suggestion-content">
          <text class="suggestion-title">文档分析完成</text>
          <text class="suggestion-text">{{ analysisResult.reason }}</text>
          <button class="generate-button" @click="handleGenerateGraph">{{ graphData ? '重新生成知识图谱' : '生成知识图谱' }}</button>
        </view>
      </view>
    </view>

    <!-- 知识图谱展示区域 -->
    <view class="graph-container" v-if="graphData">
      <view class="graph-header">
        <text class="graph-title">知识图谱</text>
        <switch class="graph-switch" :checked="showGraph" @change="toggleGraph" />
      </view>
      <knowledge-graph
        v-if="showGraph"
        :graph-data="graphData"
        class="knowledge-graph"
      ></knowledge-graph>
    </view>

    <!-- 加载状态 -->
    <uni-load-more v-if="loading" status="loading" :content-text="loadingText"></uni-load-more>
  </view>
</template>

<script>
import { ref, computed } from 'vue';
import { uploadFile, getFileContent } from '@/service/file.js';
import { checkFileForKnowledgeGraph, generateKnowledgeGraph } from '@/service/knowledge-graph.js';

export default {
  name: 'FileUploadWithKnowledgeGraph',

  setup() {
    const currentFile = ref(null);
    const loading = ref(false);
    const loadingText = ref({ contentdown: '上传文件', contentrefresh: '处理中...' });
    const analysisResult = ref(null);
    const graphData = ref(null);
    const showGraph = ref(true);

    // 切换知识图谱显示状态
    const toggleGraph = (event) => {
      showGraph.value = event.detail.value;
    };

    // 是否显示生成按钮
    const showGenerateButton = computed(() => {
      return currentFile.value && analysisResult.value && analysisResult.value.suitable;
    });

    // 触发文件选择
    const triggerFileInput = () => {
      uni.chooseFile({
        count: 1,
        type: 'all',
        success: (res) => {
          if (res.tempFiles && res.tempFiles.length > 0) {
            handleFileSelected(res.tempFiles[0]);
          }
        },
        fail: (error) => {
          console.error('选择文件失败:', error);
          uni.showToast({
            title: '选择文件失败',
            icon: 'none'
          });
        }
      });
    };

    // 处理选中的文件
    const handleFileSelected = async (file) => {
      try {
        loading.value = true;
        loadingText.value.contentrefresh = '上传文件中...';

        // 文件大小限制检查
        if (file.size > 100 * 1024 * 1024) { // 100MB
          throw new Error('文件大小不能超过100MB');
        }

        currentFile.value = {
          name: file.name || file.path.split('/').pop(),
          size: file.size,
          type: file.type
        };

        // 上传文件
        const uploadResult = await uploadFile(file);
        if (!uploadResult || !uploadResult.id) {
          throw new Error('文件上传失败');
        }

        // 获取文件内容
        loadingText.value.contentrefresh = '分析文件中...';
        const fileContent = await getFileContent(uploadResult.id);

        // 检查文件是否适合生成知识图谱
        const checkResult = await checkFileForKnowledgeGraph(fileContent);
        analysisResult.value = checkResult;

        if (!checkResult.suitable) {
          uni.showToast({
            title: '当前文件不适合生成知识图谱',
            icon: 'none'
          });
        }

        loading.value = false;
      } catch (error) {
        console.error('处理文件失败:', error);
        uni.showToast({
          title: error.message || '处理文件失败',
          icon: 'none'
        });
        loading.value = false;
        currentFile.value = null;
        analysisResult.value = null;
      }
    };

    // 生成知识图谱
    const handleGenerateGraph = async () => {
      try {
        loading.value = true;
        loadingText.value.contentrefresh = '生成知识图谱中...';

        const fileContent = await getFileContent(currentFile.value.id);
        const graphResult = await generateKnowledgeGraph(fileContent);
        graphData.value = graphResult;

        loading.value = false;
      } catch (error) {
        console.error('生成知识图谱失败:', error);
        uni.showToast({
          title: error.message || '生成知识图谱失败',
          icon: 'none'
        });
        loading.value = false;
      }
    };

    // 格式化文件大小
    const formatFileSize = (size) => {
      const units = ['B', 'KB', 'MB', 'GB'];
      let index = 0;
      while (size >= 1024 && index < units.length - 1) {
        size /= 1024;
        index++;
      }
      return `${size.toFixed(2)} ${units[index]}`;
    };

    return {
      currentFile,
      loading,
      loadingText,
      analysisResult,
      graphData,
      showGenerateButton,
      triggerFileInput,
      handleGenerateGraph,
      formatFileSize,
      showGraph,
      toggleGraph
    };
  }
};
</script>

<style>
.file-upload-container {
  padding: 20px;
  width: 100%;
  box-sizing: border-box;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  background-color: #f9fafc;
}

.upload-area:hover {
  border-color: #409eff;
  background-color: #f2f6fc;
}

.upload-text {
  margin-top: 10px;
  color: #606266;
  font-size: 14px;
}

.current-file {
  margin: 20px 0;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 8px;
  box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}

.file-name {
  display: block;
  font-size: 16px;
  color: #303133;
  margin-bottom: 5px;
  font-weight: 500;
}

.file-size {
  font-size: 14px;
  color: #909399;
}

.graph-generate {
  margin: 20px 0;
}

.suggestion-card {
  display: flex;
  padding: 16px;
  background-color: #ecf5ff;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.suggestion-content {
  margin-left: 12px;
  flex: 1;
}

.suggestion-title {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 8px;
}

.suggestion-text {
  display: block;
  margin-bottom: 12px;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.generate-button {
  background-color: #409eff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
  display: inline-block;
}

.generate-button:hover {
  background-color: #66b1ff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.graph-container {
  margin-top: 20px;
}

.graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.graph-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.graph-switch {
  transform: scale(0.8);
}

.knowledge-graph {
  width: 100%;
  height: 500px;
  border: 1px solid #ebeef5;
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}
</style>