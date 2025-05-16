'use strict';
const db = uniCloud.database();
const researchPlansCollection = db.collection('research_plans');

// 清理字符串字段，移除不安全字符
const sanitizeString = (str) => {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  
  // 移除控制字符和非法字符，保留基本文本字符和标点
  return str
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '')  // 移除控制字符
    .replace(/[\uD800-\uDFFF]/g, '');  // 移除代理对字符
};

// 生成符合MongoDB要求的ID
const generateMongoId = (prefix = 'plan') => {
  // MongoDB的_id需要特定格式，我们使用一个简单的字母数字字符串
  // 避免使用特殊字符和下划线等可能导致问题的字符
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${prefix}${timestamp}${random}`;
};

exports.main = async (event, context) => {
  const { action, userId, planId, planData, page = 1, pageSize = 10 } = event;
  
  try {
    switch (action) {
      case "create":
        if (!userId || !planData) {
          return {
            code: 400,
            message: "缺少必要参数"
          };
        }
        
        // 创建新研究方案 - 使用简化数据结构
        const now = Date.now();
        // 生成唯一ID，确保格式符合MongoDB要求
        const uniqueId = generateMongoId('plan');
        
        // 准备文档数据，不包含_id字段，让MongoDB自动生成
        const docData = {
          userId,
          title: sanitizeString(planData.title || '未命名研究方案').slice(0, 100),
          topic: sanitizeString(planData.topic || '').slice(0, 100),
          objective: sanitizeString(planData.objective || '').slice(0, 500),
          keywords: Array.isArray(planData.keywords) 
            ? planData.keywords.map(k => sanitizeString(k).slice(0, 50)).slice(0, 10) 
            : [],
          templateType: sanitizeString(planData.templateType || 'default').slice(0, 50),
          frameworkStr: sanitizeString(planData.frameworkStr || '{}').slice(0, 10000),
          content: sanitizeString(planData.content || '').slice(0, 50000),
          createTime: now,
          updateTime: now,
          // 存储客户端生成的ID作为备用
          clientId: planData.clientId || uniqueId
        };

        console.log('准备创建研究方案，MongoDB将自动生成ID');
        
        try {
          // 使用MongoDB的默认ID策略
          const result = await researchPlansCollection.add(docData);
          console.log('添加文档返回结果:', result);
          
          if (!result.id) {
            console.error('添加文档后未返回ID');
            return {
              code: 500,
              message: "创建研究方案失败：无法获取ID"
            };
          }
          
          // 获取新创建的研究方案详情
          console.log('尝试获取新创建的文档，ID:', result.id);
          const planDetail = await researchPlansCollection.doc(result.id).get();
          
          if (!planDetail.data || planDetail.data.length === 0) {
            console.error('无法获取新创建的文档');
            // 返回特殊标记，表示这种情况
            return {
              code: 200,
              message: "研究方案创建成功，但无法获取完整数据",
              data: {
                _id: result.id,
                ...docData
              }
            };
          }
          
          console.log('成功获取到新创建的文档:', planDetail.data[0]);
          
          // 确保返回的数据中包含_id字段
          const responseData = planDetail.data[0];
          if (!responseData._id && responseData.id) {
            responseData._id = responseData.id;
          }
          
          return {
            code: 200,
            message: "研究方案创建成功",
            data: responseData
          };
        } catch (insertError) {
          console.error('创建研究方案失败:', insertError);
          // 返回错误信息和客户端ID
          return {
            code: 500,
            message: `创建研究方案失败: ${insertError.message}`,
            data: {
              _id: planData.clientId || uniqueId,
              ...docData,
              error: insertError.message
            }
          };
        }
        
      case "list":
        if (!userId) {
          console.error('缺少用户ID参数');
          return {
            code: 400,
            message: "缺少用户ID"
          };
        }
        
        console.log('获取研究方案列表, 用户ID:', userId, '页码:', page, '每页数量:', pageSize);
        
        try {
          // 计算分页
          const skip = (page - 1) * pageSize;
          
          // 获取用户的所有研究方案
          const countResult = await researchPlansCollection.where({ userId }).count();
          const total = countResult.total;
          
          console.log('研究方案总数:', total);
          
          // 如果没有数据，返回空列表
          if (total === 0) {
            console.log('用户没有研究方案');
            return {
              code: 200,
              message: "研究方案列表获取成功",
              data: {
                list: [],
                page,
                pageSize,
                total: 0,
                totalPages: 0
              }
            };
          }
          
          // 计算总页数
          const totalPages = Math.ceil(total / pageSize);
          
          // 验证页码是否有效
          if (page > totalPages) {
            console.error('请求的页码超出范围, 当前页码:', page, '总页数:', totalPages);
            return {
              code: 400,
              message: `请求的页码超出范围，当前总页数: ${totalPages}`
            };
          }
          
          const plans = await researchPlansCollection
            .where({ userId })
            .orderBy("createTime", "desc")
            .skip(skip)
            .limit(pageSize)
            .get();
          
          console.log('成功获取研究方案列表, 条数:', plans.data.length);
          
          return {
            code: 200,
            message: "研究方案列表获取成功",
            data: {
              list: plans.data,
              page,
              pageSize,
              total,
              totalPages
            }
          };
        } catch (error) {
          console.error('获取研究方案列表失败:', error);
          return {
            code: 500,
            message: error.message || "获取研究方案列表失败"
          };
        }
        
      case "get":
        if (!planId) {
          console.error('缺少研究方案ID参数');
          return {
            code: 400,
            message: "缺少研究方案ID"
          };
        }
        
        console.log('获取研究方案详情, ID:', planId);
        
        try {
          // 获取研究方案详情
          const plan = await researchPlansCollection.doc(planId).get();
          
          console.log('查询结果:', plan);
          
          if (!plan || !plan.data || plan.data.length === 0) {
            console.error('研究方案不存在, ID:', planId);
            return {
              code: 404,
              message: "研究方案不存在或已被删除"
            };
          }
          
          console.log('成功获取研究方案详情:', plan.data[0]);
          
          return {
            code: 200,
            message: "研究方案获取成功",
            data: plan.data[0]
          };
        } catch (error) {
          console.error('获取研究方案详情失败:', error);
          return {
            code: 500,
            message: error.message || "获取研究方案详情失败"
          };
        }
        
      case "getByUser":
        if (!userId) {
          console.error('缺少用户ID参数');
          return {
            code: 400,
            message: "缺少用户ID"
          };
        }
        
        console.log('根据用户ID获取研究方案, 用户ID:', userId);
        
        try {
          // 获取用户的所有研究方案，按创建时间倒序排序
          const plans = await researchPlansCollection
            .where({ userId })
            .orderBy("createTime", "desc")
            .get();
          
          console.log('成功获取用户研究方案, 条数:', plans.data.length);
          
          return {
            code: 200,
            message: "用户研究方案获取成功",
            data: plans.data
          };
        } catch (error) {
          console.error('获取用户研究方案失败:', error);
          return {
            code: 500,
            message: error.message || "获取用户研究方案失败"
          };
        }
        
      case "update":
        if (!planId || !planData) {
          return {
            code: 400,
            message: "缺少必要参数"
          };
        }
        
        // 准备更新数据
        const updateData = {};
        
        // 只更新提供的字段，并且确保安全
        if (planData.title !== undefined) {
          updateData.title = sanitizeString(planData.title).slice(0, 100);
        }
        if (planData.topic !== undefined) {
          updateData.topic = sanitizeString(planData.topic).slice(0, 100);
        }
        if (planData.objective !== undefined) {
          updateData.objective = sanitizeString(planData.objective).slice(0, 500);
        }
        if (planData.keywords !== undefined) {
          updateData.keywords = Array.isArray(planData.keywords) 
            ? planData.keywords.map(k => sanitizeString(k).slice(0, 50)).slice(0, 10)
            : [];
        }
        if (planData.templateType !== undefined) {
          updateData.templateType = sanitizeString(planData.templateType).slice(0, 50);
        }
        if (planData.frameworkStr !== undefined) {
          updateData.frameworkStr = sanitizeString(planData.frameworkStr).slice(0, 10000);
        }
        if (planData.content !== undefined) {
          updateData.content = sanitizeString(planData.content).slice(0, 50000);
        }
        
        // 添加更新时间
        updateData.updateTime = Date.now();
        
        // 更新研究方案
        await researchPlansCollection.doc(planId).update(updateData);
        
        return {
          code: 200,
          message: "研究方案更新成功"
        };
        
      case "delete":
        if (!planId) {
          return {
            code: 400,
            message: "缺少研究方案ID"
          };
        }
        
        // 删除研究方案
        await researchPlansCollection.doc(planId).remove();
        
        return {
          code: 200,
          message: "研究方案删除成功"
        };
          
      default:
        return {
          code: 400,
          message: "无效的操作"
        };
    }
  } catch (error) {
    console.error("研究方案操作错误:", error);
    return {
      code: 500,
      message: error.message || "服务器内部错误"
    };
  }
}; 