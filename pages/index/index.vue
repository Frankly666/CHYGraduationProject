<template>
  <view class="content">
    <view class="text-area">
      <text class="title">{{ "hello" }}</text>
    </view>
  </view>
</template>

<script setup>
import { onShow } from '@dcloudio/uni-app'

// 检查登录状态
const checkLogin = () => {
  const username = uni.getStorageSync('username')
  const encryptedPassword = uni.getStorageSync('encryptedPassword') // 获取加密密码
  const salt = uni.getStorageSync('salt') // 获取 salt

  // 如果本地缓存中没有账号、加密密码或 salt，则跳转到登录页面
  if (!(username && encryptedPassword && salt)) {
    console.log('未登录，跳转到登录页面')
    uni.navigateTo({
      url: '/pages/logIn/logIn'
    })
  } else {
    // 这里可以添加额外的逻辑，例如验证加密密码是否有效
    console.log('用户已登录')
  }
}

// 页面显示时检查登录状态
onShow(() => {
  checkLogin()
})
</script>

<style lang="less">
.content {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
}

.text-area {
  text-align: center;
}

.title {
  font-size: 36rpx;
  color: #333;
}
</style>