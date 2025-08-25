#!/bin/bash

echo "🚀 部署VR系統到生產環境..."
echo "================================"

# 檢查環境
if [ -z "$1" ]; then
    echo "❌ 請指定部署平台:"
    echo "   ./deploy.sh vercel    # 部署到Vercel"
    echo "   ./deploy.sh docker    # 部署到Docker"
    echo "   ./deploy.sh server    # 部署到雲服務器"
    exit 1
fi

DEPLOY_PLATFORM=$1

case $DEPLOY_PLATFORM in
    "vercel")
        deploy_vercel
        ;;
    "docker")
        deploy_docker
        ;;
    "server")
        deploy_server
        ;;
    *)
        echo "❌ 不支持的部署平台: $DEPLOY_PLATFORM"
        exit 1
        ;;
esac

# Vercel部署
deploy_vercel() {
    echo "🌐 部署到Vercel..."
    
    # 檢查是否安裝Vercel CLI
    if ! command -v vercel &> /dev/null; then
        echo "📥 安裝Vercel CLI..."
        npm install -g vercel
    fi
    
    # 構建項目
    echo "🔨 構建項目..."
    npm run build
    
    # 部署
    echo "🚀 部署中..."
    vercel --prod
    
    echo "✅ Vercel部署完成！"
    echo "💡 您的網站已經上線，可以通過Vercel提供的域名訪問"
}

# Docker部署
deploy_docker() {
    echo "🐳 部署到Docker..."
    
    # 檢查Docker是否安裝
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker未安裝，請先安裝Docker"
        exit 1
    fi
    
    # 構建Docker鏡像
    echo "🔨 構建Docker鏡像..."
    docker build -t vr-system .
    
    # 停止舊容器
    echo "🛑 停止舊容器..."
    docker stop vr-system 2>/dev/null || true
    docker rm vr-system 2>/dev/null || true
    
    # 啟動新容器
    echo "🚀 啟動新容器..."
    docker run -d \
        --name vr-system \
        -p 3000:3000 \
        -p 3001:3001 \
        -v $(pwd)/uploads:/app/uploads \
        -v $(pwd)/logs:/app/logs \
        --restart unless-stopped \
        vr-system
    
    echo "✅ Docker部署完成！"
    echo "🌐 前端: http://localhost:3000"
    echo "🔧 後端: http://localhost:3001"
}

# 雲服務器部署
deploy_server() {
    echo "☁️ 部署到雲服務器..."
    
    # 檢查環境變量
    if [ -z "$SERVER_HOST" ] || [ -z "$SERVER_USER" ]; then
        echo "❌ 請設置環境變量:"
        echo "   export SERVER_HOST=your-server-ip"
        echo "   export SERVER_USER=your-username"
        exit 1
    fi
    
    echo "🔨 構建項目..."
    npm run build
    
    echo "📦 打包項目..."
    tar -czf vr-system.tar.gz \
        --exclude=node_modules \
        --exclude=.git \
        --exclude=.next \
        .
    
    echo "📤 上傳到服務器..."
    scp vr-system.tar.gz $SERVER_USER@$SERVER_HOST:~/
    
    echo "🔧 在服務器上部署..."
    ssh $SERVER_USER@$SERVER_HOST << 'EOF'
        # 停止舊服務
        pm2 stop vr-system 2>/dev/null || true
        pm2 delete vr-system 2>/dev/null || true
        
        # 備份舊版本
        if [ -d "vr-system" ]; then
            mv vr-system vr-system-backup-$(date +%Y%m%d-%H%M%S)
        fi
        
        # 解壓新版本
        tar -xzf vr-system.tar.gz
        mv $(ls -d */ | grep -v backup) vr-system
        cd vr-system
        
        # 安裝依賴
        npm ci --only=production
        
        # 啟動服務
        pm2 start server/enhanced-vr-server.js --name "vr-system"
        pm2 startup
        pm2 save
        
        # 清理
        rm ~/vr-system.tar.gz
EOF
    
    # 清理本地文件
    rm vr-system.tar.gz
    
    echo "✅ 雲服務器部署完成！"
    echo "🌐 您的網站現在可以通過 http://$SERVER_HOST 訪問"
}

echo "================================"
echo "🎉 部署完成！"
echo "================================"
