<template>
  <view class="file-uploader">
    <!-- 文件上传按钮 -->
    <view class="file-upload" @click="triggerFileInput" v-if="!isFileChat">
      <text class="icon">📁</text>
    </view>
    
    <!-- 当前文件信息和知识图谱生成按钮 -->
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
    
    <!-- 分析结果弹窗 -->
    <uni-popup ref="analysisPopup" type="center">
      <view class="analysis-popup-content">
        <view class="analysis-popup-header">
          <text class="analysis-popup-title">文件分析结果</text>
        </view>
        <view class="analysis-popup-body">
          <view v-if="analysisResult && analysisResult.suitable" class="analysis-suitable">
            <text class="suitable-icon">✅</text>
            <text class="suitable-text">该文件适合生成知识图谱</text>
          </view>
          <view v-else-if="analysisResult && !analysisResult.suitable" class="analysis-unsuitable">
            <text class="unsuitable-icon">❌</text>
            <text class="unsuitable-text">{{ analysisResult.reason || '当前文件不适合生成知识图谱' }}</text>
          </view>
        </view>
        <view class="analysis-popup-footer">
          <button class="analysis-popup-btn" @click="closeAnalysisPopup">确定</button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { ref, computed } from 'vue';
import { uploadFile, getFileContent } from '@/service/file.js';
import { checkFileForKnowledgeGraph, generateKnowledgeGraph } from '@/service/knowledge-graph.js';

export default {
  name: 'ChatFileUploader',
  emits: ['file-uploaded', 'graph-generated'],
  setup(props, { emit }) {
    const currentFile = ref(null);
    const isFileChat = ref(false);
    const isAnalyzing = ref(false);
    const analysisResult = ref(null);
    const analysisPopup = ref(null);
    
    // 文件状态常量
    const FILE_STATUS = {
      PENDING: "pending",
      UPLOADING: "uploading",
      ANALYZING: "analyzing",
      SUCCESS: "success",
      ERROR: "error",
    };
    
    // 触发文件选择
    const triggerFileInput = () => {
      uni.chooseFile({
        count: 1,
        type: 'all',
        success: (res) => {
          if (res.tempFiles && res.tempFiles.length > 0) {
            handleFileUpload(res.tempFiles[0]);
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
        console.log('文件分析结果:', checkResult);
        analysisResult.value = checkResult;
        
        // 更新当前文件信息
        currentFile.value = {
          id: uploadResult.id,
          name: file.name,
          content: fileContent
        };
        isFileChat.value = true;
        
        // 根据分析结果给用户提示
        if (checkResult && checkResult.suitable) {
          uni.showToast({
            title: '文件适合生成知识图谱，可点击生成按钮',
            icon: 'none',
            duration: 3000
          });
        } else {
          uni.showToast({
            title: '当前文件不适合生成知识图谱',
            icon: 'none',
            duration: 3000
          });
        }
        
        // 通知父组件文件已上传
        emit('file-uploaded', {
          file: currentFile.value,
          isFileChat: isFileChat.value,
          analysisResult: analysisResult.value
        });
        
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
        
        // 通知父组件知识图谱已生成
        emit('graph-generated', graphResult);
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
    
    // 显示分析结果弹窗
    const showAnalysisPopup = () => {
      if (analysisPopup.value) {
        analysisPopup.value.open('center');
      }
    };
    
    // 关闭分析结果弹窗
    const closeAnalysisPopup = () => {
      if (analysisPopup.value) {
        analysisPopup.value.close();
      }
    };
    
    return {
      currentFile,
      isFileChat,
      isAnalyzing,
      analysisResult,
      analysisPopup,
      triggerFileInput,
      handleGenerateGraph,
      showAnalysisPopup,
      closeAnalysisPopup
    };
  }
};
</script>

<style lang="scss" scoped>
.file-uploader {
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

  .file-controls {
    display: flex;
    align-items: center;
    gap: 10px;
    
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
  }
}

// 分析结果弹窗样式
.analysis-popup-content {
  width: 80%;
  max-width: 400px;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  .analysis-popup-header {
    padding: 16px;
    border-bottom: 1px solid #f0f0f0;
    text-align: center;
    
    .analysis-popup-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }
  }
  
  .analysis-popup-body {
    padding: 20px;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    
    .analysis-suitable {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      
      .suitable-icon {
        font-size: 32px;
      }
      
      .suitable-text {
        font-size: 16px;
        color: #52c41a;
        font-weight: 500;
      }
    }
    
    .analysis-unsuitable {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      text-align: center;
      
      .unsuitable-icon {
        font-size: 32px;
      }
      
      .unsuitable-text {
        font-size: 16px;
        color: #f5222d;
        font-weight: 500;
        line-height: 1.5;
      }
    }
  }
  
  .analysis-popup-footer {
    padding: 12px 16px;
    border-top: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
    
    .analysis-popup-btn {
      background-color: #1890ff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.3s;
      
      &:hover {
        background-color: #40a9ff;
      }
    }
  }
}
</style>