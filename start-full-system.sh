#!/bin/bash

echo "🚀 啟動完整VR系統..."

# 檢查Node.js和npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js未安裝，請先安裝Node.js"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm未安裝，請先安裝npm"
    exit 1
fi

echo "✅ Node.js版本: $(node --version)"
echo "✅ npm版本: $(npm --version)"

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 殺死可能佔用端口的進程
echo "🔪 清理端口..."
pkill -f "node.*3000" 2>/dev/null
pkill -f "node.*3001" 2>/dev/null
pkill -f "node.*3002" 2>/dev/null

sleep 2

# 啟動設備掃描服務器
echo "🔍 啟動設備掃描服務器 (端口3002)..."
npm run scanner &
SCANNER_PID=$!

# 等待掃描服務器啟動
echo "⏳ 等待掃描服務器啟動..."
sleep 3

# 檢查掃描服務器健康狀態
echo "🏥 檢查掃描服務器健康狀態..."
if curl -s http://localhost:3002/api/health > /dev/null; then
    echo "✅ 設備掃描服務器運行正常"
else
    echo "❌ 設備掃描服務器啟動失敗"
    kill $SCANNER_PID 2>/dev/null
    exit 1
fi

# 啟動VR後端服務器
echo "🎮 啟動VR後端服務器 (端口3001)..."
npm run vr &
VR_PID=$!

# 等待VR服務器啟動
echo "⏳ 等待VR服務器啟動..."
sleep 3

# 檢查VR服務器健康狀態
echo "🏥 檢查VR服務器健康狀態..."
if curl -s http://localhost:3001/api/health > /dev/null; then
    echo "✅ VR後端服務器運行正常"
else
    echo "❌ VR後端服務器啟動失敗"
    kill $VR_PID 2>/dev/null
    kill $SCANNER_PID 2>/dev/null
    exit 1
fi

# 啟動前端開發服務器
echo "🌐 啟動前端開發服務器 (端口3000)..."
npm run dev &
FRONTEND_PID=$!

# 等待前端服務器啟動
echo "⏳ 等待前端服務器啟動..."
sleep 5

# 檢查前端服務器健康狀態
echo "🏥 檢查前端服務器健康狀態..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端服務器運行正常"
else
    echo "❌ 前端服務器啟動失敗"
    kill $FRONTEND_PID 2>/dev/null
    kill $VR_PID 2>/dev/null
    kill $SCANNER_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 完整VR系統啟動成功！"
echo ""
echo "📱 服務狀態:"
echo "   🔍 設備掃描服務器: http://localhost:3002 (PID: $SCANNER_PID)"
echo "   🎮 VR後端服務器:   http://localhost:3001 (PID: $VR_PID)"
echo "   🌐 前端開發服務器: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "🔗 訪問地址:"
echo "   🏠 主頁: http://localhost:3000"
echo "   📱 設備掃描: http://localhost:3000 (設備管理標籤)"
echo "   🎮 VR功能: http://localhost:3000 (VR功能標籤)"
echo ""
echo "📊 API端點:"
echo "   🏥 健康檢查: http://localhost:3002/api/health"
echo "   📋 設備列表: http://localhost:3002/api/devices"
echo "   ⚙️  系統信息: http://localhost:3002/api/system"
echo ""
echo "💡 提示:"
echo "   - 所有命令現在都可以執行！"
echo "   - 設備掃描會發現真實的網絡、藍牙、USB設備"
echo "   - 按 Ctrl+C 停止所有服務"
echo ""

# 等待用戶中斷
trap 'echo ""; echo "🛑 正在關閉所有服務..."; kill $FRONTEND_PID $VR_PID $SCANNER_PID 2>/dev/null; echo "✅ 所有服務已關閉"; exit 0' INT

# 保持腳本運行
while true; do
    sleep 1
done
