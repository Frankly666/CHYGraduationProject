const send = async () => {
  if (!canSend.value) return
 
   const session = historyList.find(item => item.id === currentSession.id)
   if (!session) {
     console.error('当前会话不存在')
     return
   }
 
   // 构造用户消息
   const userMsg = {
     role: 'user',
     content: inputText.value,
     files: files.value.length ? [...files.value] : null,
     time: Date.now()
   }
   
   // 添加用户消息到历史
   session.messages.push(userMsg)
   
   // 清空输入
   inputText.value = ''
   files.value = []
 
   // 使用reactive创建响应式消息对象
   const tempMsg = reactive({
     role: 'assistant',
     content: '',
     thinking: true,
     time: Date.now()
   })
 
   // 使用unshift代替push保持响应性
   session.messages.unshift(tempMsg)
   scrollToBottom()
 
   try {
    const currentHistory = session.messages
      .filter(m => ['user', 'assistant'].includes(m.role)&&m.content)
      .map(({ role, content }) => ({ role, content }));

     await streamChat(userMsg.content, currentHistory, (data) => {
       switch (data.type) {
         case 'chunk':
           // 使用响应式更新方式
           tempMsg.content = tempMsg.content + data.content
           
           // 强制更新视图（针对小程序环境）
           if (typeof uni !== 'undefined') {
             this.$forceUpdate() 
           }
           break;
           
         case 'done':
           // 使用splice保持数组响应性
           const index = session.messages.indexOf(tempMsg)
           if (index > -1) {
             session.messages.splice(index, 1, {
               ...tempMsg,
               thinking: false
             })
           }
           break;
       }
     })
   } catch (error) {
    tempMsg.content = `请求失败: ${error.message}`;
    tempMsg.error = true;
    tempMsg.thinking = false;
    scrollToBottom();
  }
 }