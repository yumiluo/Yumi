#!/bin/bash

# VR多設備旅遊視頻播放器 - Wi-Fi版本啟動腳本

echo "🚀 啟動VR多設備旅遊視頻播放器 - Wi-Fi版本"
echo "=========================================="

# 檢查依賴
if [ ! -d "node_modules" ]; then
    echo "❌ 錯誤: 未找到node_modules目錄，請先運行install-wifi-dependencies.sh"
    exit 1
fi

# 啟動後端服務器
echo "🔧 啟動後端服務器..."
cd server
if [ ! -f "api-example.js" ]; then
    echo "❌ 錯誤: 未找到api-example.js文件"
    cd ..
    exit 1
fi

echo "📡 後端服務器將在端口5000啟動"
echo "💡 請在新終端中運行: npm run dev"
echo ""

# 啟動後端
npm start &
BACKEND_PID=$!

# 等待後端啟動
sleep 3

# 檢查後端是否啟動成功
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ 後端服務器啟動成功"
else
    echo "❌ 後端服務器啟動失敗"
    kill $BACKEND_PID 2>/dev/null
    cd ..
    exit 1
fi

cd ..

# 啟動前端
echo "🌐 啟動前端應用..."
echo "💡 前端將在 http://localhost:3000 啟動"
echo ""

npm run dev

# 清理後端進程
echo "🧹 清理後端進程..."
kill $BACKEND_PID 2>/dev/null
echo "✅ 應用已關閉"
