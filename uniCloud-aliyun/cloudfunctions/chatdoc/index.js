'use strict';
const CryptoJS = require('crypto-js');
const axios = require('axios');
const FormData = require('form-data');
const WebSocket = require('ws');
const { URLSearchParams } = require('url');

const APP_ID = '1f804d91';
const API_SECRET = 'MzhiNjY0OWFiZDRhYzZlOGNlOWI2ZGI0';
const API_HOST = 'chatdoc.xfyun.cn';

// 生成接口签名
function generateAuth(timestamp) {
  const auth = CryptoJS.MD5(APP_ID + timestamp).toString();
  return {
    signature: CryptoJS.HmacSHA1(auth, API_SECRET).toString(CryptoJS.enc.Base64),
    timestamp
  };
}

exports.main = async (event, context) => {
  try {
    const { action } = event;
    const { signature, timestamp } = generateAuth(Math.floor(Date.now() / 1000));

    // ------------------------ 文件上传 ------------------------
    if (action === 'upload') {
      const { fileInfo, parseType = 'AUTO', stepByStep = false } = event;
      
      const formData = new FormData();
      if (fileInfo?.base64) {
        const fileBuffer = Buffer.from(fileInfo.base64, 'base64');
        formData.append('file', fileBuffer, fileInfo.name);
      } else {
        throw new Error('无效的文件数据');
      }

      formData.append('parseType', parseType);
      formData.append('fileType', 'wiki');
      formData.append('stepByStep', stepByStep.toString());

      const { data } = await axios.post(
        `https://${API_HOST}/openapi/v1/file/upload`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            appId: APP_ID,
            timestamp,
            signature
          }
        }
      );

      return {
        code: 0,
        data: {
          fileId: data.data.fileId,
          quantity: data.data.quantity,
          parseType: data.data.parseType
        }
      };
    }

    // ------------------------ 文档问答（WebSocket流式）------------------------
    if (action === 'query') {
      const { fileId, question } = event;
      
      const wsUrl = `wss://${API_HOST}/openapi/chat?appId=${APP_ID}&timestamp=${timestamp}&signature=${signature}`;
      const requestData = {
        fileIds: [fileId],
        messages: [{
          role: 'user',
          content: question.substring(0, 500)
        }]
      };

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        const chunks = [];
        let finalResult = {
          answer: '',
          references: new Set(),
          sid: ''
        };

        const timeoutId = setTimeout(() => {
          ws.close();
          reject(new Error('问答响应超时'));
        }, 30000);

        ws.on('open', () => ws.send(JSON.stringify(requestData)));

        ws.on('message', (data) => {
          try {
            const msg = JSON.parse(data);
            if (msg.code !== 0) throw new Error(msg.message);
            
            finalResult.sid = msg.sid;
            if (msg.content) finalResult.answer += msg.content;
            
            // 处理文档引用
            if (msg.status === 99 && msg.fileRefer) {
              try {
                const refer = JSON.parse(msg.fileRefer);
                Object.entries(refer).forEach(([fid, indexes]) => {
                  indexes.forEach(idx => finalResult.references.add(`${fid}#${idx}`));
                });
              } catch (e) {/* 忽略解析错误 */}
            }

            chunks.push(msg);
            if (msg.status === 2) ws.close();
          } catch (e) {
            ws.close();
            reject(e);
          }
        });

        ws.on('close', () => {
          clearTimeout(timeoutId);
          resolve({
            code: 0,
            data: {
              ...finalResult,
              answer: finalResult.answer || '未找到相关答案',
              references: Array.from(finalResult.references),
              chunks
            }
          });
        });

        ws.on('error', err => {
          clearTimeout(timeoutId);
          reject(err);
        });
      });
    }


		// ------------------------ 文档查询 ------------------------
		if (action === 'file_status') {
			const { fileId } = event;
			console.log("parames:", fileId._value)
		
		  const { data } = await axios.post(
		    `https://${API_HOST}/openapi/v1/file/status`,
		    {
					
					fileIds: fileId._value
				},
		    {
		      headers: {
		        'Content-Type': 'application/x-www-form-urlencoded',
		        appId: APP_ID,
		        timestamp,
		        signature
		      }
		    }
		  );
			console.log("data:", data)
		  return {
		    code: 0,
		    data: data.data?.map(item => ({
		      fileId: item.fileId,
		      status: item.fileStatus,
		      isReady: true
		    }))
		  };
		}
    throw new Error('无效的操作类型');

  } catch (error) {
    console.error('服务错误:', error);
    return {
      code: error.response?.data?.code || -1,
      error: error.response?.data?.desc || error.message,
      details: error.stack
    };
  }
};