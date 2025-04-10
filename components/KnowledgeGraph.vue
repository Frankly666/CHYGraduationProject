<template>
  <view class="knowledge-graph-container">
    <view class="knowledge-graph-header">
      <text class="knowledge-graph-title">知识图谱</text>
      <view class="knowledge-graph-controls">
        <button class="control-button" @click="zoomIn"><uni-icons type="plus" size="18"></uni-icons></button>
        <button class="control-button" @click="zoomOut"><uni-icons type="minus" size="18"></uni-icons></button>
        <button class="control-button" @click="resetView"><uni-icons type="refresh" size="18"></uni-icons></button>
      </view>
    </view>
    <view class="knowledge-graph" id="knowledge-graph-chart"></view>
    <view class="knowledge-graph-footer" v-if="selectedNode">
      <view class="selected-node-info">
        <text class="selected-node-title">{{ selectedNode.name }}</text>
        <text class="selected-node-category" v-if="selectedNode.category !== undefined">{{ graphData.categories[selectedNode.category].name }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import * as echarts from 'echarts/core';
import { GraphChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

// 注册必需的组件
echarts.use([
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  GraphChart,
  CanvasRenderer
]);

export default {
  name: 'KnowledgeGraph',
  props: {
    graphData: {
      type: Object,
      required: true,
      default: () => ({
        nodes: [],
        links: [],
        categories: []
      })
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: '400px'
    }
  },
  data() {
    return {
      chart: null,
      selectedNode: null,
      zoomLevel: 1
    };
  },
  watch: {
    graphData: {
      handler(newVal) {
        if (newVal && newVal.nodes && newVal.nodes.length > 0) {
          this.renderChart();
        }
      },
      deep: true
    }
  },
  mounted() {
    // 初始化图表
    this.$nextTick(() => {
      this.initChart();
      if (this.graphData && this.graphData.nodes && this.graphData.nodes.length > 0) {
        this.renderChart();
      }
    });
  },
  beforeUnmount() {
    // 销毁图表实例
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },
  methods: {
    initChart() {
      const chartDom = document.getElementById('knowledge-graph-chart');
      if (!chartDom) {
        console.error('找不到图表DOM元素');
        return;
      }
      
      // 创建图表实例
      this.chart = echarts.init(chartDom);
      
      // 设置图表大小
      chartDom.style.width = this.width;
      chartDom.style.height = this.height;
      
      // 窗口大小变化时自动调整图表大小
      window.addEventListener('resize', () => {
        if (this.chart) {
          this.chart.resize();
        }
      });
    },
    renderChart() {
      if (!this.chart) {
        this.initChart();
      }
      
      // 图表配置项
      const option = {
        title: {
          show: false
        },
        tooltip: {
          trigger: 'item',
          formatter: (params) => {
            if (params.dataType === 'node') {
              return `<strong>${params.data.name}</strong><br/>类别: ${this.graphData.categories[params.data.category].name}`;
            } else {
              return `<strong>${params.data.name || '关系'}</strong><br/>${params.data.source} → ${params.data.target}`;
            }
          }
        },
        legend: {
          data: this.graphData.categories.map(category => category.name),
          orient: 'vertical',
          left: 'left',
          top: 'middle',
          textStyle: {
            color: '#606266'
          },
          selectedMode: 'multiple'
        },
        animationDuration: 1500,
        animationEasingUpdate: 'quinticInOut',
        series: [
          {
            name: '知识图谱',
            type: 'graph',
            layout: 'force',
            data: this.graphData.nodes,
            links: this.graphData.links,
            categories: this.graphData.categories,
            roam: true,
            label: {
              show: true,
              position: 'right',
              formatter: '{b}',
              fontSize: 12,
              color: '#303133'
            },
            force: {
              repulsion: 200,
              edgeLength: [80, 120],
              gravity: 0.1
            },
            lineStyle: {
              color: 'source',
              curveness: 0.3,
              width: 1.5
            },
            itemStyle: {
              borderWidth: 1,
              shadowColor: 'rgba(0, 0, 0, 0.2)',
              shadowBlur: 5
            },
            emphasis: {
              focus: 'adjacency',
              lineStyle: {
                width: 4
              },
              itemStyle: {
                shadowBlur: 10
              },
              label: {
                fontSize: 14,
                fontWeight: 'bold'
              }
            }
          }
        ]
      };
      
      // 使用配置项设置图表
      this.chart.setOption(option);
      
      // 注册点击事件
      this.chart.on('click', (params) => {
        if (params.dataType === 'node') {
          this.selectedNode = params.data;
        }
      });
    },
    
    // 放大图表
    zoomIn() {
      if (this.chart) {
        this.zoomLevel += 0.2;
        this.chart.setOption({
          series: [{
            zoom: this.zoomLevel
          }]
        });
      }
    },
    
    // 缩小图表
    zoomOut() {
      if (this.chart && this.zoomLevel > 0.4) {
        this.zoomLevel -= 0.2;
        this.chart.setOption({
          series: [{
            zoom: this.zoomLevel
          }]
        });
      }
    },
    
    // 重置视图
    resetView() {
      if (this.chart) {
        this.zoomLevel = 1;
        this.selectedNode = null;
        this.chart.dispatchAction({
          type: 'restore'
        });
        this.renderChart();
      }
    }
  }
};
</script>

<style>
.knowledge-graph-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  margin: 20px 0;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.knowledge-graph-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.knowledge-graph-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.knowledge-graph-controls {
  display: flex;
  gap: 8px;
}

.control-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background-color: #ffffff;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  cursor: pointer;
}

.control-button:hover {
  background-color: #f2f6fc;
  border-color: #c0c4cc;
}

.knowledge-graph {
  width: 100%;
  height: 450px;
}

.knowledge-graph-footer {
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-top: 1px solid #e4e7ed;
}

.selected-node-info {
  display: flex;
  flex-direction: column;
}

.selected-node-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.selected-node-category {
  font-size: 14px;
  color: #606266;
}
</style>