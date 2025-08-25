#!/bin/bash

echo "🚀 啟動增強版VR系統..."
echo "================================"

# 檢查Node.js版本
echo "📋 檢查Node.js版本..."
node_version=$(node --version)
echo "Node.js版本: $node_version"

# 檢查npm版本
echo "📦 檢查npm版本..."
npm_version=$(npm --version)
echo "npm版本: $npm_version"

# 安裝依賴
echo "📥 安裝依賴..."
npm install

# 檢查端口是否被佔用
echo "🔍 檢查端口狀態..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口3000已被佔用，正在停止..."
    lsof -ti:3000 | xargs kill -9
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  端口3001已被佔用，正在停止..."
    lsof -ti:3001 | xargs kill -9
fi

# 啟動後端服務器
echo "🔧 啟動後端服務器..."
echo "後端服務器將在 http://localhost:3001 運行"
echo "API端點: http://localhost:3001/api"
echo "WebSocket端點: ws://localhost:3001"

# 在後台啟動後端服務器
node server/enhanced-vr-server.js &
BACKEND_PID=$!

# 等待後端啟動
echo "⏳ 等待後端服務器啟動..."
sleep 3

# 檢查後端是否成功啟動
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ 後端服務器啟動成功"
else
    echo "❌ 後端服務器啟動失敗"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 啟動前端
echo "🌐 啟動前端應用..."
echo "前端應用將在 http://localhost:3000 運行"

# 在後台啟動前端
npm run dev &
FRONTEND_PID=$!

# 等待前端啟動
echo "⏳ 等待前端應用啟動..."
sleep 5

# 檢查前端是否成功啟動
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端應用啟動成功"
else
    echo "❌ 前端應用啟動失敗"
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "================================"
echo "🎉 VR系統啟動完成！"
echo ""
echo "📱 前端應用: http://localhost:3000"
echo "🔧 後端API: http://localhost:3001/api"
echo "🔌 WebSocket: ws://localhost:3001"
echo "📊 健康檢查: http://localhost:3001/api/health"
echo ""
echo "💡 使用說明:"
echo "1. 打開瀏覽器訪問 http://localhost:3000"
echo "2. 在設備管理標籤中掃描和連接設備"
echo "3. 使用YouTube搜索功能添加VR視頻"
echo "4. 在VR播放器中觀看360度視頻"
echo ""
echo "🛑 停止系統: 按 Ctrl+C 或運行 stop-vr.sh"
echo "================================"

# 等待用戶中斷
trap 'echo ""; echo "🛑 正在停止VR系統..."; kill $FRONTEND_PID 2>/dev/null; kill $BACKEND_PID 2>/dev/null; echo "✅ VR系統已停止"; exit 0' INT

# 保持腳本運行
wait
