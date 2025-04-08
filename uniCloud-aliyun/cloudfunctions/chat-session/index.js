"use strict";
const db = uniCloud.database();
const chatSessionsCollection = db.collection("chat_sessions");
const chatMessagesCollection = db.collection("chat_messages");

exports.main = async (event, context) => {
  const { action, userId, sessionId, title, type, updateData } = event;
  
  try {
    switch (action) {
      case "create":
        if (!userId || !title) {
          return {
            code: 400,
            message: "Missing required parameters"
          };
        }
        
        // 创建新会话
        const now = Date.now();
        const result = await chatSessionsCollection.add({
          userId,
          title,
          type: type || "chat",
          createTime: now,
          updateTime: now,
          lastMessage: "",
          lastRole: ""
        });
        
        // 获取新创建的会话详情
        const sessionDetail = await chatSessionsCollection.doc(result.id).get();
        
        return {
          code: 200,
          message: "Session created successfully",
          data: sessionDetail.data[0]
        };
        
      case "list":
        if (!userId) {
          return {
            code: 400,
            message: "Missing userId"
          };
        }
        
        // 获取用户的所有会话
        const sessions = await chatSessionsCollection
          .where({
            userId
          })
          .orderBy("updateTime", "desc")
          .get();
        
        return {
          code: 200,
          message: "Sessions retrieved successfully",
          data: sessions.data
        };
        
      case "get":
        if (!sessionId) {
          return {
            code: 400,
            message: "Missing sessionId"
          };
        }
        
        // 获取单个会话详情
        const session = await chatSessionsCollection.doc(sessionId).get();
        
        if (session.data.length === 0) {
          return {
            code: 404,
            message: "Session not found"
          };
        }
        
        return {
          code: 200,
          message: "Session retrieved successfully",
          data: session.data[0]
        };
        
      case "update":
        if (!sessionId || !updateData) {
          return {
            code: 400,
            message: "Missing required parameters"
          };
        }
        
        // 转换字段名
        const normalizedUpdateData = {};
        if (updateData.last_message !== undefined) {
          normalizedUpdateData.lastMessage = updateData.last_message;
        } else if (updateData.lastMessage !== undefined) {
          normalizedUpdateData.lastMessage = updateData.lastMessage;
        }
        
        // 处理最后消息的角色
        if (updateData.last_role !== undefined) {
          normalizedUpdateData.lastRole = updateData.last_role;
        } else if (updateData.lastRole !== undefined) {
          normalizedUpdateData.lastRole = updateData.lastRole;
        }
        
        if (updateData.title !== undefined) {
          normalizedUpdateData.title = updateData.title;
        }
        
        if (updateData.type !== undefined) {
          normalizedUpdateData.type = updateData.type;
        }
        
        // 更新会话
        await chatSessionsCollection.doc(sessionId).update({
          ...normalizedUpdateData,
          updateTime: Date.now()
        });
        
        return {
          code: 200,
          message: "Session updated successfully"
        };
        
      case "delete":
        if (!sessionId) {
          return {
            code: 400,
            message: "Missing sessionId"
          };
        }
        
        // 删除会话
        await chatSessionsCollection.doc(sessionId).remove();
        
        // 同时删除该会话的所有消息
        await chatMessagesCollection.where({
          sessionId
        }).remove();
        
        return {
          code: 200,
          message: "Session deleted successfully"
        };
        
      default:
        return {
          code: 400,
          message: "Invalid action"
        };
    }
  } catch (error) {
    console.error("Chat session operation error:", error);
    return {
      code: 500,
      message: error.message || "Internal server error"
    };
  }
};
