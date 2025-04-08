<template>
	<view class="home-container">
		<!-- 导航栏 -->
		<view class="header">
			<text class="logo">EduResearch</text>
			<view class="nav-btns" v-if="!isLogIn">
				<text class="nav-btn" @tap="navTo('logIn')">登录</text>
				<text class="nav-btn primary" @tap="navTo('enroll')">注册</text>
			</view>
			<view class="userName" v-else>
				<text>{{ username }}</text>
				<view class="user-dropdown">
					<view class="dropdown-item" @click="handleLogout">
						<text>退出登录</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 主内容区 -->
		<view class="main-content">
			<!-- 欢迎区 -->
			<view class="hero-section">
				<view class="shape"></view>
				<view class="build"></view>  
				<view class="wrap">
					<text class="hero-title">智能教育研究助手</text>
					<textarea class="hero-subtitle" value="基于领域结构化知识驱动的教学研究方案生成系统，整合数据挖掘与自然语言处理技术，为教育研究提供科学、高效的智能支持" placeholder="" />
					<view class="quickStart" @click="startChat">
						<text>快速开始</text>
					</view>
				</view>
				
			</view>

			<!-- 功能卡片 -->
			<view class="feature-grid">
				<view v-for="(item, index) in features" :key="index" class="feature-card" @tap="navTo(item.path)">
					<image class="icon-box" :src="item.icon" mode="aspectFit" />
					<view class="wrap">
						<text class="card-title">{{ item.title }}</text>
						<text class="card-desc">{{ item.desc }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部 -->
		<view class="footer">
			<text>让教育研究更高效 © 2024</text>
		</view>
	</view>
</template>

<script setup>
import { ref } from 'vue';

	const features = [{
			title: '数据解析',
			desc: '智能解析论文/教学数据',
			path: 'chat',
			icon: '/static/homePage/DataParsing.png'
		},
		{
			title: '知识图谱',
			desc: '可视化知识点关联网络',
			path: 'chat',
			icon: '/static/homePage/atlas.png'
		},
		{
			title: '方案生成',
			desc: 'AI智能生成研究框架',
			path: 'chat',
			icon: '/static/homePage/scheme.png'
		},
		{
			title: '历史管理',
			desc: '随时查看编辑方案',
			path: 'chat',
			icon: '/static/homePage/history.png'
		}
	];
	
	const isLogIn = ref(!!uni.getStorageSync('isLogIn'))
	const username = isLogIn ? uni.getStorageSync('username') : '';
	
	const handleLogout = () => {
		// 清除登录状态和用户信息
		uni.removeStorageSync('isLogIn');
		uni.removeStorageSync('username');
		uni.removeStorageSync('userId');
		
		// 更新登录状态
		isLogIn.value = false;
		
		// 显示退出成功提示
		uni.showToast({
			title: '已退出登录',
			icon: 'success'
		});
		
		// 可选：跳转到首页
		setTimeout(() => {
			uni.reLaunch({
				url: '/pages/index/index'
			});
		}, 1500);
	};

	const handleSend = async () => {
		test().then(data => {
			console.log(data)
		})
	};

	const navTo = (path) => {
		uni.navigateTo({
			url: `/pages/${path}/${path}`
		});
	};

	// 开始聊天
	const startChat = () => {
		uni.navigateTo({
			url: '/pages/chat/chat'
		});
	};
</script>

<style lang="less">
	// 颜色变量
	@primary: #2563eb; // 更柔和的蓝色
	@background: linear-gradient(150deg, #f0f4f8, #ffffff); // 渐变背景
	@text-dark: #1f2937; // 深灰色文字
	@text-light: #6b7280; // 浅灰色文字

	.home-container {
		min-height: 100vh;
		background: #fff;
		display: flex;
		flex-direction: column;
		justify-content: center; // 内容垂直居中
	}

	/* 导航栏 */
	.header {
		position: fixed;
		top: 0;
		height: 1.7vh;
	  padding: 24px 10%;
	  display: flex;
	  align-items: center;
	  background: rgba(255, 255, 255, 0); 
	  position: sticky;
	  top: 0;
	  z-index: 100;
	
	  .logo {
	    font-size: 24px;
	    font-weight: 700; // 粗体
	    color: #05de7d; 
	  }
		
		.userName {
			margin-left: auto;
			font-size: 16px;
			font-weight: 700; // 粗体
			color: #05de7d; 
			cursor: pointer;
			position: relative; // 添加相对定位
			
			&:hover {
				.user-dropdown {
					display: block;
					opacity: 1;
					transform: translateY(0);
				}
			}
			
			.user-dropdown {
				position: absolute;
				top: 100%;
				right: 0;
				background: white;
				border-radius: 8px;
				box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
				padding: 8px 0;
				min-width: 120px;
				display: none;
				opacity: 0;
				transform: translateY(-10px);
				transition: all 0.3s ease;
				
				.dropdown-item {
					padding: 8px 16px;
					font-size: 14px;
					color: #333;
					cursor: pointer;
					transition: all 0.2s;
					
					&:hover {
						background: #f5f7fa;
						color: #05de7d;
					}
				}
			}
		}
	
	  .nav-btns {
	    margin-left: auto;
	    display: flex;
	    gap: 16px;
	
	    .nav-btn {
	      padding: 8px 20px;
	      font-size: 14px;
	      color: #fff;
	      cursor: pointer;
	      border-radius: 8px;
	      transition: all 0.2s;
	
	      &:hover {
	        background-color: #fff;
					color: black;
	      }
	
	      &.primary {
	        background-color: #05de7d;
	        color: white;
	
	        &:hover {
	          background-color: darken(#05de7d, 5%);  
	        }
	      }
	    }
	  }
	}

	/* 欢迎区 */
	.hero-section {
		position: absolute;
		top: 0;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		height: 68vh;
		width: 100vw;
		text-align: center;
		background: url(/static/homePage/header-hero.jpg) no-repeat center center / cover;
		
		.shape {
			position: absolute;
			bottom: 0;
			width: 100vw;
			height: 4.74vw;
			background: url(/static/homePage/header-shape.png) no-repeat center center / contain;
		}
		
		.build {
			position: absolute;
			right: 8vw;
			width: 40vw;
			height: 21vw;
			background: url(/static/homePage/hero-image.png) no-repeat center center / contain;
		}
		
		.quickStart {
			position: relative;
			top: -2vw   ;
			width: 5vw;
			height: 2vw;
			border: 1px solid #fff;
			font-size: 16px;
			line-height: 2vw;
			padding: 5px 20px;
			text-align: center;
			border-radius: 50px;
			color: #fff;
			background-color: rgba(255, 255, 255, 0.1);
			
			&:hover {
				background-color: rgba(255, 255, 255, 0.5);
				cursor: pointer;
			}
			
		}
		
		.wrap {
			position: absolute;
			left: 25%;
			top: 30%;
			display: flex;
			flex-direction: column;
			
			.hero-title {
				font-size: 48px;
				font-weight: 600;
				color: #fff;
				margin-bottom: 16px;
			}
			
			.hero-subtitle {
				width: 15vw;
				font-size: 16px;
				color: #fff;
				margin-bottom: 40px;
				line-height: 36px;
				text-align: left;
			}
		}

		

		.start-btn {
			width: 100%;
			padding: 12px 24px;
			font-size: 16px;
			color: white;
			background-color: @primary;
			border: none;
			border-radius: 8px;
			cursor: pointer;
			transition: background-color 0.2s;

			&:hover {
				background-color: darken(@primary, 5%);
			}
		}
	}

	/* 功能卡片 */
	.feature-grid {
		position: absolute;
		bottom: 15%;
		display: flex;
		justify-content: space-around;
		width: 100%;
		.feature-card {
			display: flex;
			justify-content: space-around;
			align-items: center;
			padding: 32px;
			box-sizing: border-box;
			background-color: white;
			border-radius: 16px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
			transition: all 0.3s;
			cursor: pointer;
			text-align: center;

			&:hover {
				transform: translateY(-8px);
				box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
			}

			.icon-box {
				width: 64px;
				height: 64px;
				margin-bottom: 24px;
				transition: transform 0.3s;
			}
			
			.wrap {
				display: flex;
				flex-direction: column;
				
				.card-title {
					font-size: 22px;
					font-weight: 600;
					color: @text-dark;
					margin-bottom: 12px;
				}
				
				.card-desc {
					font-size: 15px;
					color: @text-light;
					line-height: 1.6;
				}
			}

			
		}
	}

	/* 底部 */
	.footer {
		padding: 24px;
		text-align: center;
		font-size: 14px;
		color: @text-light;
		background-color: rgba(255, 255, 255, 0.9);
		margin-top: auto;
	}
</style>