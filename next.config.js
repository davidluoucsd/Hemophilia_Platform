/** @type {import('next').NextConfig} */
const nextConfig = {
  // 移除静态导出配置，因为我们有动态路由和数据库交互
  // output: 'export',
  
  // 图像优化配置
  images: {
    unoptimized: false, // 启用图像优化
  },
  
  // 压缩配置
  compress: true,
  
  // 实验性功能
  experimental: {
    // 服务器外部包
    serverExternalPackages: [],
    
    // 启用Turbopack（如果需要更快的开发构建）
    // turbo: process.env.NODE_ENV === 'development',
  },
  
  // 缓存优化
  reactStrictMode: true,
  
  // 环境配置
  env: {
    APP_NAME: 'HAL问卷系统',
    APP_VERSION: '1.0.0',
    AUTHOR: '罗骏哲（Junzhe Luo）',
  },
  
  // 页面扩展名
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  
  // 构建ID
  generateBuildId: async () => {
    // 可以使用 git commit hash 或时间戳作为构建ID
    return `hal-build-${new Date().toISOString().split('T')[0]}`;
  },

  // 源码映射，生产环境禁用
  productionBrowserSourceMaps: false,
  
  // 禁用X-Powered-By响应头，提高安全性
  poweredByHeader: false,
  
  // 增加静态资源缓存时间
  assetPrefix: undefined,
  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1小时
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig; 