'use strict';
const db = uniCloud.database()
const historyCollection = db.collection('history')

exports.main = async (event, context) => {
	const { action, userId, id, updateData, ...rest } = event
	
	// 验证用户ID
	if (!userId) {
		return {
			code: 400,
			message: '用户ID不能为空'
		}
	}

	try {
		switch (action) {
			case 'getUserHistory':
				const history = await historyCollection
					.where({
						userId: userId
					})
					.orderBy('time', 'desc')
					.get()
				
				return {
					code: 200,
					message: '获取历史记录成功',
					data: history.data
				}

			case 'saveHistory':
				const saveResult = await historyCollection.add({
					...rest,
					userId: userId,
					createTime: Date.now(),
					updateTime: Date.now()
				})
				
				return {
					code: 200,
					message: '保存历史记录成功',
					data: {
						id: saveResult.id
					}
				}

			case 'updateHistory':
				if (!id) {
					return {
						code: 400,
						message: '历史记录ID不能为空'
					}
				}

				await historyCollection.doc(id).update({
					...updateData,
					updateTime: Date.now()
				})
				
				return {
					code: 200,
					message: '更新历史记录成功'
				}

			case 'deleteHistory':
				if (!id) {
					return {
						code: 400,
						message: '历史记录ID不能为空'
					}
				}

				await historyCollection.doc(id).remove()
				
				return {
					code: 200,
					message: '删除历史记录成功'
				}

			case 'getHistoryById':
				if (!id) {
					return {
						code: 400,
						message: '历史记录ID不能为空'
					}
				}

				const historyDetail = await historyCollection.doc(id).get()
				
				return {
					code: 200,
					message: '获取历史记录详情成功',
					data: historyDetail.data[0]
				}

			default:
				return {
					code: 400,
					message: '未知的操作类型'
				}
		}
	} catch (error) {
		console.error('操作失败:', error)
		return {
			code: 500,
			message: error.message || '操作失败'
		}
	}
} 