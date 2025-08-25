#!/bin/bash

# VR多設備旅遊視頻播放器 - 啟動腳本

echo "🚀 啟動VR多設備旅遊視頻播放器..."

# 檢查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到Node.js，請先安裝Node.js 16+"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"

# 檢查依賴
if [ ! -d "node_modules" ]; then
    echo "📦 安裝依賴包..."
    npm install
fi

# 檢查後端服務器是否已運行
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  後端服務器已在端口3001運行"
else
    echo "🔧 啟動後端服務器..."
    cd server && node index.js &
    BACKEND_PID=$!
    echo "✅ 後端服務器已啟動 (PID: $BACKEND_PID)"
    cd ..
    
    # 等待後端啟動
    echo "⏳ 等待後端服務器啟動..."
    sleep 3
fi

# 檢查前端服務器是否已運行
if lsof -i :3000 > /dev/null 2>&1; then
    echo "⚠️  前端服務器已在端口3000運行"
    FRONTEND_PORT=3000
elif lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  前端服務器已在端口3001運行"
    FRONTEND_PORT=3001
elif lsof -i :3002 > /dev/null 2>&1; then
    echo "⚠️  前端服務器已在端口3002運行"
    FRONTEND_PORT=3002
else
    echo "🌐 啟動前端應用程序..."
    npm run dev &
    FRONTEND_PID=$!
    echo "✅ 前端應用程序已啟動 (PID: $FRONTEND_PID)"
    
    # 等待前端啟動
    echo "⏳ 等待前端應用程序啟動..."
    sleep 5
    
    # 檢查前端端口
    if lsof -i :3000 > /dev/null 2>&1; then
        FRONTEND_PORT=3000
    elif lsof -i :3001 > /dev/null 2>&1; then
        FRONTEND_PORT=3001
    elif lsof -i :3002 > /dev/null 2>&1; then
        FRONTEND_PORT=3002
    else
        echo "❌ 無法確定前端端口"
        FRONTEND_PORT="未知"
    fi
fi

# 顯示服務狀態
echo ""
echo "🎉 應用程序啟動完成！"
echo ""
echo "📊 服務狀態:"
echo "  - 後端服務器: http://localhost:3001 ✅"
echo "  - 前端應用程序: http://localhost:$FRONTEND_PORT ✅"
echo ""
echo "🔑 登錄信息:"
echo "  - 管理員: admin@example.com / 123456"
echo "  - 用戶: user@example.com / 123456"
echo "  - 訪客模式: 無需帳號"
echo ""
echo "📱 使用方法:"
echo "1. 在瀏覽器中訪問: http://localhost:$FRONTEND_PORT"
echo "2. 登錄或使用訪客模式"
echo "3. 導航到'視頻管理'標籤"
echo "4. 點擊'搜索YouTube VR影片'"
echo "5. 搜索並添加360度旅遊影片"
echo "6. 在'播放控制'標籤中測試VR播放"
echo ""
echo "💡 提示:"
echo "  - 確保已配置YouTube API Key"
echo "  - 使用支持WebVR的瀏覽器（如Chrome）"
echo "  - 支持VR頭顯和手機陀螺儀"
echo ""
echo "🛑 停止服務:"
echo "  按 Ctrl+C 或運行: pkill -f 'node index.js' && pkill -f 'next dev'"
echo ""

# 保持腳本運行
echo "🔄 服務運行中... (按 Ctrl+C 停止)"
wait











