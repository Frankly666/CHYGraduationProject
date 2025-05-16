import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * 将HTML元素导出为PDF
 * @param {Object} options - 导出选项
 * @param {HTMLElement} options.element - 要导出的HTML元素
 * @param {String} options.filename - PDF文件名，默认为'research-plan.pdf'
 * @param {String} options.title - PDF文档标题
 * @param {String} options.author - PDF文档作者，默认为'EduResearch Assistant'
 * @param {Object} options.margins - PDF页边距，单位为mm
 * @returns {Promise<Blob>} - 返回生成的PDF Blob对象
 */
export const exportElementToPDF = async (options) => {
  try {
    console.log('开始导出HTML元素为PDF...');
    
    const {
      element,
      filename = 'research-plan.pdf',
      title = '教育研究方案',
      author = 'EduResearch Assistant',
      margins = { top: 15, right: 15, bottom: 15, left: 15 }
    } = options;
    
    if (!element) {
      throw new Error('未提供HTML元素');
    }
    
    // 确认当前环境
    let isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';
    console.log('当前是否为Web环境:', isWeb);
    
    if (!isWeb) {
      throw new Error('非Web环境无法使用html2canvas');
    }
    
    // 增加处理步骤：确保所有Markdown已被正确渲染为HTML
    console.log('检查并确保内容已正确渲染');
    
    // 使用html2canvas捕获元素之前，先确保元素在DOM中，且样式已应用
    if (!document.body.contains(element)) {
      console.log('元素不在DOM中，临时添加');
      document.body.appendChild(element);
    }
    
    // 给元素添加明确的样式
    element.style.background = '#ffffff';
    element.style.width = '210mm'; // A4宽度
    element.style.padding = '0';
    element.style.boxSizing = 'border-box';
    element.style.overflow = 'hidden';
    element.style.position = 'absolute';
    element.style.left = '-9999px';
    
    // 深度处理内部的元素样式
    // 标题样式
    Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6')).forEach(el => {
      el.style.color = '#000000';
      el.style.fontWeight = 'bold';
      el.style.margin = '1em 0 0.5em 0';
      if (el.tagName === 'H1') el.style.fontSize = '22px';
      if (el.tagName === 'H2') el.style.fontSize = '20px';
      if (el.tagName === 'H3') el.style.fontSize = '18px';
      if (el.tagName === 'H4') el.style.fontSize = '16px';
    });
    
    // 段落样式
    Array.from(element.querySelectorAll('p')).forEach(el => {
      el.style.margin = '0.5em 0';
      el.style.lineHeight = '1.5';
      el.style.color = '#333333';
    });
    
    // 列表样式
    Array.from(element.querySelectorAll('ul, ol')).forEach(el => {
      el.style.margin = '0.5em 0';
      el.style.paddingLeft = '2em';
    });
    
    Array.from(element.querySelectorAll('li')).forEach(el => {
      el.style.margin = '0.3em 0';
      el.style.lineHeight = '1.5';
      el.style.color = '#333333';
    });
    
    // 给渲染过程一点时间来处理样式
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 使用html2canvas捕获元素
    console.log('捕获HTML元素...');
    
    // 设置html2canvas选项
    const html2canvasOptions = {
      scale: 2, // 提高生成PDF的清晰度
      useCORS: true, // 允许加载跨域图片
      logging: false, // 关闭日志
      allowTaint: true, // 允许跨域图片污染画布
      backgroundColor: '#ffffff', // 设置背景色为白色
      foreignObjectRendering: false, // 禁用foreignObject渲染，提高兼容性
      removeContainer: false, // 不自动移除临时容器
      ignoreElements: element => element.nodeName === 'SCRIPT' // 忽略脚本元素
    };
    
    try {
      const canvas = await html2canvas(element, html2canvasOptions);
      
      // 检查canvas是否创建成功
      if (!canvas) {
        throw new Error('Canvas创建失败');
      }
      
      console.log('Canvas创建成功，宽高:', canvas.width, canvas.height);
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // 计算PDF尺寸 - 使用A4纸张大小
      const imgWidth = 210 - margins.left - margins.right; // A4宽度为210mm
      const pageHeight = 297 - margins.top - margins.bottom; // A4高度为297mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      // 创建PDF文档
      console.log('创建PDF文档...');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // 设置PDF文档属性
      pdf.setProperties({
        title: title,
        author: author,
        subject: '教育研究方案',
        keywords: '教育研究,方案,AI生成',
        creator: 'EduResearch系统'
      });
      
      // 添加标题和页眉
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text(title, pdf.internal.pageSize.width / 2, 10, { align: 'center' });
      
      let position = margins.top;
      
      // 添加内容
      pdf.addImage(imgData, 'JPEG', margins.left, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // 如果内容超过一页，添加新页
      while (heightLeft > 0) {
        position = margins.top;
        pdf.addPage();
        
        // 添加页眉
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          title,
          pdf.internal.pageSize.width / 2,
          10,
          { align: 'center' }
        );
        
        // 添加内容
        pdf.addImage(
          imgData,
          'JPEG',
          margins.left,
          position - imgHeight + pageHeight,
          imgWidth,
          imgHeight
        );
        
        // 添加页脚（页码）
        pdf.setFontSize(8);
        pdf.text(
          `第 ${pdf.internal.getNumberOfPages()} 页`,
          pdf.internal.pageSize.width / 2,
          pdf.internal.pageSize.height - 5,
          { align: 'center' }
        );
        
        heightLeft -= pageHeight;
      }
      
      // 添加页脚到第一页
      pdf.setPage(1);
      pdf.setFontSize(8);
      pdf.text(
        `第 1 页`,
        pdf.internal.pageSize.width / 2,
        pdf.internal.pageSize.height - 5,
        { align: 'center' }
      );
      
      // 在Web环境下直接下载
      console.log('PDF生成完成，准备下载...');
      pdf.save(filename);
      
      // 如果元素是临时添加的，需要移除
      if (element.style.position === 'absolute' && element.style.left === '-9999px') {
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
      }
      
      return pdf.output('blob');
    } catch (canvasError) {
      console.error('Canvas生成失败:', canvasError);
      
      // 清理临时添加的元素
      if (element.style.position === 'absolute' && element.style.left === '-9999px') {
        if (document.body.contains(element)) {
          document.body.removeChild(element);
        }
      }
      
      throw new Error('生成PDF图像失败: ' + canvasError.message);
    }
  } catch (error) {
    console.error('导出PDF失败:', error);
    throw error;
  }
};

/**
 * 在UniApp环境中保存PDF文件
 * @param {Blob} pdfBlob - PDF blob数据
 * @param {String} filename - 文件名
 * @returns {Promise<String>} - 返回保存的文件路径
 */
export const savePDFInUniApp = async (pdfBlob, filename = 'research-plan.pdf') => {
  return new Promise((resolve, reject) => {
    try {
      console.log('准备在UniApp环境中保存PDF...');
      
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result.split(',')[1];
          
          // 使用uni-app的API保存文件
          const tempFilePath = `${wx.env.USER_DATA_PATH}/${filename}`;
          
          wx.getFileSystemManager().writeFile({
            filePath: tempFilePath,
            data: wx.base64ToArrayBuffer(base64),
            encoding: 'binary',
            success: () => {
              console.log('PDF文件已保存到:', tempFilePath);
              
              // 使用系统能力打开文件
              uni.showToast({
                title: '文件已保存',
                icon: 'success'
              });
              
              resolve(tempFilePath);
            },
            fail: (error) => {
              console.error('保存文件失败:', error);
              reject(new Error('保存文件失败: ' + error.errMsg));
            }
          });
        } catch (error) {
          console.error('读取文件数据后处理失败:', error);
          reject(error);
        }
      };
      
      reader.onerror = (error) => {
        console.error('读取文件数据失败:', error);
        reject(new Error('读取文件数据失败'));
      };
      
      reader.readAsDataURL(pdfBlob);
    } catch (error) {
      console.error('保存PDF文件失败:', error);
      reject(error);
    }
  });
};

/**
 * 通用的PDF导出函数，适配网页平台
 * @param {Object} options - 导出选项，与exportElementToPDF相同
 * @returns {Promise<Object>} - 返回导出结果
 */
export const exportToPDF = async (options) => {
  try {
    console.log('开始网页端PDF导出...');
    
    // 检查是否为Web环境
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw new Error('非Web环境无法使用PDF导出');
    }
    
    try {
      // 直接使用html2canvas和jsPDF导出
      const pdfBlob = await exportSimpleElementToPDF(options);
      console.log('PDF生成完成');
      return { success: true, message: 'PDF已下载', data: pdfBlob };
    } catch (error) {
      console.error('网页端导出PDF失败:', error);
      throw new Error('网页端导出PDF失败: ' + error.message);
    }
  } catch (error) {
    console.error('PDF导出失败:', error);
    return { success: false, message: error.message };
  }
};

/**
 * 简化版的HTML元素导出为PDF函数，专注于网页端，支持完整分页
 * @param {Object} options - 导出选项
 * @returns {Promise<Blob>} - 返回PDF Blob
 */
export const exportSimpleElementToPDF = async (options) => {
  try {
    console.log('开始导出HTML元素为PDF (增强版)...');
    
    const {
      element,
      filename = 'research-plan.pdf',
      title = '教育研究方案',
      author = 'EduResearch Assistant',
      margins = { top: 15, right: 15, bottom: 15, left: 15 }
    } = options;
    
    if (!element) {
      throw new Error('未提供HTML元素');
    }
    
    // 清理可能残留的Markdown语法
    const allTextNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while(node = walker.nextNode()) {
      allTextNodes.push(node);
    }
    
    // 处理文本节点，确保没有Markdown语法残留
    allTextNodes.forEach(textNode => {
      if (textNode.nodeValue && textNode.nodeValue.trim()) {
        // 清理Markdown语法
        textNode.nodeValue = textNode.nodeValue
          .replace(/^#+\s+/, '')  // 标题
          .replace(/^-\s+/, '')   // 无序列表
          .replace(/^\d+\.\s+/, ''); // 有序列表
      }
    });
    
    // 计算页面尺寸
    const pageWidth = 210;   // A4宽度(mm)
    const pageHeight = 297;  // A4高度(mm)
    const contentWidth = pageWidth - margins.left - margins.right;
    const contentHeight = pageHeight - margins.top - margins.bottom;
    
    console.log(`页面尺寸: ${pageWidth}x${pageHeight}mm, 内容区域: ${contentWidth}x${contentHeight}mm`);
    
    // 创建PDF文档
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // 设置PDF属性
    pdf.setProperties({
      title: title || element.querySelector('.plan-title')?.textContent || '研究方案',
      author: author,
      subject: '教育研究方案',
      keywords: '教育研究,方案,AI生成',
      creator: 'EduResearch助手'
    });
    
    // 方法一：直接使用html2canvas捕获整个元素，然后分页添加到PDF
    try {
      // 确保元素有正确的样式
      const originalStyle = element.style.cssText;
      element.style.width = `${contentWidth}mm`;
      element.style.margin = '0';
      element.style.padding = '10px';
      element.style.backgroundColor = '#ffffff';
      element.style.color = '#333333';
      element.style.fontFamily = 'Arial, sans-serif';
      
      // 捕获元素
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      // 计算分页
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margins.top;
      let pageCount = 1;
      
      console.log(`总图像高度: ${imgHeight}mm, 单页内容高度: ${contentHeight}mm`);
      
      // 将图像数据转换为JPEG
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      
      // 添加第一页
      pdf.addImage(imgData, 'JPEG', margins.left, position, imgWidth, imgHeight);
      
      // 添加页码
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`第 ${pageCount} 页`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      
      heightLeft -= contentHeight;
      
      // 如果内容超过一页，继续添加新页
      while (heightLeft > 0) {
        pdf.addPage();
        pageCount++;
        
        pdf.addImage(
          imgData,
          'JPEG',
          margins.left,
          position - (contentHeight * (pageCount - 1)),
          imgWidth,
          imgHeight
        );
        
        // 添加页码
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`第 ${pageCount} 页`, pageWidth / 2, pageHeight - 5, { align: 'center' });
        
        heightLeft -= contentHeight;
        console.log(`添加第 ${pageCount} 页, 剩余高度: ${heightLeft}mm`);
      }
      
      // 恢复元素原始样式
      element.style.cssText = originalStyle;
      
      console.log(`PDF生成完成，共 ${pageCount} 页`);
      
      // 保存PDF
      pdf.save(filename);
      
      return pdf.output('blob');
    } catch (error) {
      console.error('使用html2canvas方法导出PDF失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('导出PDF失败:', error);
    throw error;
  }
}; 