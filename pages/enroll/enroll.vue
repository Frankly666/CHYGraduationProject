<template>
  <view class="w3l-workinghny-form">
    <view class="wrapper">
      <!-- Logo -->
      <view class="logo">
        <h1>
          <text class="brand-logo" href="#">
            教学方案研究生成系统
          </text>
        </h1>
      </view>

      <!-- 主体内容 -->
      <view class="workinghny-block-grid">
        <!-- 左侧图片 -->
        <view class="workinghny-left-img">
          <img 
            src="../../static/logIn/1.png" 
            class="img-responsive" 
            alt="login visual"
          />
        </view>

        <!-- 右侧表单 -->
        <view class="form-right-inf">
          <view class="login-form-content">
            <!-- 注册表单 -->
            <view class="signin-form">
              <!-- 用户名输入 -->
              <view class="one-frm">
                <view>账号</view>
                <input
                  type="text"
                  placeholder="请输入账号名"
                  v-model="formData.username"
                />
              </view>

              <!-- 密码输入 -->
              <view class="one-frm">
                <view>密码</view>
                <input
                  type="password"
                  v-model="formData.password"
                  placeholder="请输入你的密码"
                />
              </view>

              <!-- 确认密码 -->
              <view class="one-frm">
                <view>确认密码</view>
                <input
                  type="password"
                  v-model="formData.confirmPassword"
                  placeholder="再次输入你的密码"
                />
              </view>

              <!-- 提交按钮 -->
              <button 
                type="submit" 
                class="btn btn-style mt-3" 
                @click="handleSubmit"
                :disabled="isLoading"
              >
                <text v-if="!isLoading">注册</text>
                <text v-else class="loading-text">注册中...</text>
              </button>

              <!-- 登录链接 -->
              <p class="already">
                已有账号?
                <a @click="switchToLogin">登录</a>
              </p>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { enroll } from '@/controls/enroll.js' // 导入封装的 enroll 工具函数

// 加载状态
const isLoading = ref(false)

// 表单数据
const formData = ref({
  username: '',
  password: '',
  confirmPassword: '',
})

// 表单提交
const handleSubmit = async () => {
  // 表单验证
  if (!formData.value.username || !formData.value.password || !formData.value.confirmPassword) {
    uni.showToast({
      title: '账号和密码不能为空',
      icon: 'none',
      duration: 2000
    })
    return
  }

  if (formData.value.password !== formData.value.confirmPassword) {
    uni.showToast({
      title: '两次输入的密码不一致',
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  if(formData.value.username.length < 6 || formData.value.password.length < 6) {
    uni.showToast({
      title: '账号和密码长度不能小于6位',
      icon: 'none',
      duration: 2000
    })
    return
  }

  try {
    // 设置加载状态
    isLoading.value = true
    
    // 显示加载提示
    uni.showLoading({
      title: '注册中...',
      mask: true
    })

    // 调用 enroll 工具函数
    const result = await enroll(formData.value)
    
    // 隐藏加载提示
    uni.hideLoading()
    
    if (result.code === 200) {
      // 显示成功提示
      uni.showToast({
        title: '注册成功',
        icon: 'success',
        duration: 1500
      })
      
      // 保存用户ID
      if (result.data && result.data.userId) {
        uni.setStorageSync('userId', result.data.userId)
      }
      
      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        uni.navigateTo({
          url: '/pages/logIn/logIn'
        })
      }, 1500)
    } else {
      uni.showToast({
        title: result.message || '注册失败',
        icon: 'none',
        duration: 2000
      })
    }
  } catch (error) {
    // 隐藏加载提示
    uni.hideLoading()
    
    uni.showToast({
      title: '注册失败，请稍后重试',
      icon: 'none',
      duration: 2000
    })
    console.error('注册失败:', error)
  } finally {
    // 重置加载状态
    isLoading.value = false
  }
}

// 跳转登录页面
function switchToLogin() {
  uni.navigateTo({
    url: '/pages/logIn/logIn'
  })
}
</script>



<style lang="less">
* {
    box-sizing: border-box;
}


input,
select {
    -webkit-appearance: none;
    outline: none;
    font-family: 'Karla', sans-serif;
}


img {
    max-width: 100%;
}

.p-relative {
    position: relative;
}

.p-absolute {
    position: absolute;
}

.p-fixed {
    position: fixed;
}

.p-sticky {
    position: sticky;
}

.btn,
button,
.actionbg,
input {
    border-radius: 4px;
    -webkit-border-radius: 4px;
    -moz-border-radius: 4px;
    -o-border-radius: 4px;
    -ms-border-radius: 4px;
}

.btn:hover,
button:hover {
    transition: 0.5s ease;
    -webkit-transition: 0.5s ease;
    -o-transition: 0.5s ease;
    -ms-transition: 0.5s ease;
    -moz-transition: 0.5s ease;
}

/*-- wrapper start --*/
.wrapper {
    width: 100%;
    padding-right: 15px;
    padding-left: 15px;
    margin-right: auto;
    margin-left: auto;
}

@media (min-width: 576px) {
    .wrapper {
        max-width: 540px;
    }
}

@media (min-width: 768px) {
    .wrapper {
        max-width: 720px;
    }
}

@media (min-width: 992px) {
    .wrapper {
        max-width: 960px;
    }
}

@media (min-width: 1200px) {
    .wrapper {
        max-width: 1140px;
    }
}

.wrapper-full {
    width: 100%;
    padding-right: 15px;
    padding-left: 15px;
    margin-right: auto;
    margin-left: auto;
}

/*-- //wrapper start --*/

/*-- form styling --*/
.w3l-workinghny-form .logo {
    text-align: center;
	margin-bottom: 100px;
}

.w3l-workinghny-form .logo a.brand-logo {
    display: inline-block;
    text-align: center;   
    font-size: 50px;
    line-height: 1.1em;
    font-weight: 700;
    color: #212529;
    margin-bottom: 30px;
    text-transform: capitalize;
    letter-spacing: -1px;
}

.w3l-workinghny-form .align-end {
    align-self: flex-end;
    padding: 2em;
}

.w3l-workinghny-form .logo a.brand-logo text {
    font-weight: 300;
}

.w3l-workinghny-form h1 {
    font-size: 50px;
    line-height: 1.1em;
    font-weight: 700;
    color: #3f3a64;
}

.w3l-workinghny-form {
    position: relative;
    z-index: 0;
    display: grid;
    align-items: center;
    height: 100vh;
	padding-bottom: 15vh;
}


.w3l-workinghny-form .workinghny-block-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    grid-gap: 70px;
    width: 90%;
    margin: 0 auto;
    align-items: center;
}


.w3l-workinghny-form .one-frm {
    font-style: normal;
    font-size: 16px;
    color: #343a40;
    display: block;
    margin-bottom: 60px;
    font-weight: bold;
	
	view {
		margin-bottom: 20px;
		font-size: 20px;
	}
}

.w3l-workinghny-form input {
    background: transparent;
    border: none;
    border-bottom: 2px solid #212529;
    font-size: 16px;
    line-height: 20px;
    width: 100%;
    margin-bottom: 30px;
    border-radius: 0;
    outline: none;
	
	&:hover {
		border-bottom: 2px solid #4361ee;
		color: #4361ee;
	}
}


.w3l-workinghny-form .btn-style {
    position: relative;
    min-width: 120px;
    height: 45px;
    line-height: 45px;
    text-align: center;
    background: #05de7d;
    color: #fff;
    font-size: 16px;
    font-weight: 600;
    border: none;
    transition: all 0.3s ease;
    
    &:disabled {
        background: #ccc;
        cursor: not-allowed;
    }
    
    .loading-text {
        display: inline-block;
        animation: loading 1s infinite;
    }
}

@keyframes loading {
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
}

.w3l-workinghny-form p.already,
.w3l-workinghny-form p.already a {
    font-size: 18px;
    line-height: 25px;
    color: #495057;
    margin: 25px 0 0;
    text-align: center;
}

.w3l-workinghny-form p.remember {
    color: #495057;
    line-height: 20px
}

.w3l-workinghny-form p.already {
    color: #495057;
    font-weight: 700;
	margin-top: 50px;
}

.w3l-workinghny-form p.already a:hover {
    color: #4361ee;
}

.w3l-workinghny-form .check-remaind input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
}

.w3l-workinghny-form .check-remaind {
    display: block;
    position: relative;
    padding-left: 35px;
    cursor: pointer;
    margin: 5px 0px 30px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}

.w3l-workinghny-form .check-remaind input {
    position: absolute;
    opacity: 0;
    cursor: pointer;
    height: 0;
    width: 0;
}

.w3l-workinghny-form .checkmark {
    position: absolute;
    top: 0px;
    left: 0;
    height: 21px;
    width: 21px;
    background-color: #F5F4F2;
    border-radius: 4px;
}

.w3l-workinghny-form .check-remaind:hover input~.checkmark {
    background-color: #4361ee;
}

.w3l-workinghny-form .check-remaind input:checked~.checkmark {
    background-color: #4361ee;
}

.w3l-workinghny-form .checkmark:after {
    content: "";
    position: absolute;
    display: none;
}

.w3l-workinghny-form .check-remaind input:checked~.checkmark:after {
    display: block;
}

.w3l-workinghny-form .check-remaind .checkmark:after {
    left: 7px;
    top: 3px;
    width: 5px;
    height: 10px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg);
}

/* -- placeholder --*/
::-webkit-input-placeholder {
    /* Chrome/Opera/Safari */
    color: #777;
}

::-moz-placeholder {
    /* Firefox 19+ */
    color: #777;
}

:-ms-input-placeholder {
    /* IE 10+ */
    color: #777;
}

:-moz-placeholder {
    /* Firefox 18- */
    color: #777;
}

/* -- placeholder --*/


/*-- responsive design --*/
@media (max-width: 992px) {
    .w3l-workinghny-form .workinghny-block-grid {
        grid-template-columns: 1fr;
        grid-gap: 10px;
        width: 100%;
    }
    .w3l-workinghny-form .login-form-content {
        padding: 0em 0em 2em 0;
    }
    .workinghny-left-img {
        order: 2;
    }

    .w3l-workinghny-form .logo a.brand-logo {
        font-size: 40px;
        margin-bottom: 10px;
    }

    .w3l-workinghny-form {
        height: auto;
    }
}

@media (max-width: 667px) {
    .w3l-workinghny-form .align-end {
        padding: 0em;
    }
}

@media (max-width: 480px) {
    .w3l-workinghny-form .logo a.brand-logo {
        font-size: 35px;
    }

    .w3l-workinghny-form h2 {
        font-size: 22px;
    }
}

@media (max-width: 415px) {
    .w3l-workinghny-form .copyright {
        margin-top: 10px;
    }
}

</style>