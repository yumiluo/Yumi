#!/bin/bash

echo "🎉 ========================================"
echo "🚀 VR多設備系統 - 快速Wi-Fi掃描版"
echo "⚡ 掃描時間 < 5秒，mDNS優先！"
echo "========================================"

# 檢查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到Node.js"
    echo "💡 請先安裝Node.js: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js已安裝: $(node --version)"

# 檢查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: 未找到npm"
    exit 1
fi

echo "✅ npm已安裝: $(npm --version)"

# 獲取本地IP地址
echo ""
echo "🔍 檢測網絡配置..."
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ 無法檢測到本地IP地址"
    exit 1
fi

echo "✅ 檢測到本地IP: $LOCAL_IP"

# 安裝依賴
echo ""
echo "📦 正在安裝系統依賴..."
npm install

# 顯示連接信息
echo ""
echo "🎉 ========================================"
echo "📱 快速掃描測試信息"
echo "========================================"
echo "💻 電腦端地址: http://localhost:3000"
echo "📱 手機端地址: http://$LOCAL_IP:3000"
echo "🔧 後端API地址: http://$LOCAL_IP:5001"
echo "========================================"
echo ""
echo "⚡ 快速掃描特性:"
echo "• mDNS優先發現（如果可用）"
echo "• 智能IP範圍計算"
echo "• 並行掃描，超時控制"
echo "• 掃描時間 < 5秒"
echo ""
echo "🧪 測試步驟:"
echo "1. 電腦端創建會話"
echo "2. 點擊'開始快速掃描'"
echo "3. 記錄掃描完成時間"
echo "4. 手機端加入會話"
echo "5. 測試YouTube 360°同步播放"
echo ""

# 啟動系統
echo "🚀 正在啟動快速掃描系統..."
echo "⏳ 請等待系統啟動完成..."
echo ""

# 使用concurrently同時啟動前後端
npx concurrently \
  --names "前端,後端" \
  --prefix-colors "blue,green" \
  --kill-others \
  "npm run dev" \
  "npm run vr"

echo ""
echo "🎉 系統已關閉"
echo "�� 如需重新啟動，再次運行此腳本即可"






