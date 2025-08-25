/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: "http://localhost:3001",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // 性能優化配置
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  
  // 圖片優化
  images: {
    unoptimized: true,
    domains: ['localhost', '127.0.0.1'],
    formats: ['image/webp', 'image/avif'],
  },
  
  // 實驗性功能
  experimental: {
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // 編譯優化
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // 輸出優化
  output: 'standalone',
  
  // 重寫規則
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ]
  },
}

module.exports = nextConfig
