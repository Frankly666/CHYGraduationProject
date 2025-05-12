// config/env.js

// 环境配置
const ENV = {
  // 开发环境
  development: {
    baseURL: 'https://api.moonshot.cn/v1',
  },
  
  // 生产环境
  production: {
    baseURL: 'https://franco6.site/moonshotv1', // Nginx服务器地址(HTTPS)
  }
};

// 当前环境，可以根据实际情况修改
const currentEnv = 'production';

// 导出当前环境的配置
export const config = ENV[currentEnv];

// 导出判断环境的工具函数
export const isDev = () => currentEnv === 'development';
export const isProd = () => currentEnv === 'production';