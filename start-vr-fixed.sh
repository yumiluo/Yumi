#!/bin/bash

echo "🚀 啟動修復版VR多設備視頻播放系統..."

# 檢查Node.js是否安裝
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到Node.js，請先安裝Node.js"
    exit 1
fi

# 檢查npm是否安裝
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: 未找到npm，請先安裝npm"
    exit 1
fi

# 檢查端口是否被佔用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        echo "⚠️  警告: 端口 $port 已被佔用"
        return 1
    fi
    return 0
}

# 檢查必要端口
echo "🔍 檢查端口可用性..."
if ! check_port 3000; then
    echo "請關閉佔用端口3000的服務，或修改前端配置"
fi

if ! check_port 5001; then
    echo "請關閉佔用端口5001的服務，或修改後端配置"
fi

# 安裝前端依賴
echo "📦 安裝前端依賴..."
cd "$(dirname "$0")"
npm install

# 安裝後端依賴
echo "📦 安裝後端依賴..."
cd server
npm install
cd ..

# 啟動後端服務器
echo "🔧 啟動後端Socket.io服務器..."
cd server
npm start &
BACKEND_PID=$!
cd ..

# 等待後端啟動
echo "⏳ 等待後端服務器啟動..."
sleep 5

# 檢查後端是否成功啟動
if ! curl -s http://localhost:5001/api/health > /dev/null; then
    echo "❌ 後端服務器啟動失敗"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ 後端服務器已啟動 (PID: $BACKEND_PID)"

# 啟動前端開發服務器
echo "🌐 啟動前端開發服務器..."
npm run dev &
FRONTEND_PID=$!

# 等待前端啟動
echo "⏳ 等待前端服務器啟動..."
sleep 8

# 檢查前端是否成功啟動
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ 前端服務器啟動失敗"
    kill $FRONTEND_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ 前端服務器已啟動 (PID: $FRONTEND_PID)"

echo ""
echo "🎉 VR多設備視頻播放系統啟動成功！"
echo ""
echo "📱 前端地址: http://localhost:3000"
echo "🔧 後端地址: http://localhost:5001"
echo "📊 後端狀態: http://localhost:5001/api/status"
echo ""
echo "💡 使用說明:"
echo "1. 在瀏覽器中打開 http://localhost:3000"
echo "2. 點擊'沒有帳戶？點擊註冊'來創建新帳戶"
echo "3. 登錄後點擊'VR多設備視頻播放'進入控制器模式"
echo "4. 創建會話並獲取會話代碼"
echo "5. 在手機端輸入會話代碼加入會話"
echo "6. 控制器播放視頻，所有設備將同步播放"
echo ""
echo "⚠️  注意: 系統目前使用內存存儲（數據庫表尚未創建）"
echo "💡 要啟用數據庫存儲，請在Supabase Dashboard中創建必要的表"
echo ""
echo "🛑 按 Ctrl+C 停止所有服務"

# 等待用戶中斷
trap 'echo ""; echo "🛑 正在關閉服務..."; kill $FRONTEND_PID 2>/dev/null; kill $BACKEND_PID 2>/dev/null; echo "✅ 所有服務已關閉"; exit 0' INT

# 保持腳本運行
wait
