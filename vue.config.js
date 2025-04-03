module.exports = {
    devServer: {
        disableHostCheck: true,
        proxy: {
            '/moonshotv1': {
                target: 'https://api.moonshot.cn/v1',
                changeOrigin: true,
                secure: false,
                ws: false,
                pathRewrite: {
                    '^/moonshotv1': ''
                }
            }
        }
    }
}
