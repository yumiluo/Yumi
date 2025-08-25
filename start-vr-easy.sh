#!/bin/bash

echo "🎉 ========================================"
echo "🚀 VR多設備視頻播放系統 - 超級簡單版"
echo "🎯 一鍵啟動，手機直接連接！"
echo "========================================"

# 檢查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到Node.js"
    echo "💡 請先安裝Node.js: https://nodejs.org/"
    echo "   選擇LTS版本，下載後雙擊安裝即可"
    exit 1
fi

echo "✅ Node.js已安裝: $(node --version)"

# 檢查npm
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: 未找到npm"
    echo "💡 請重新安裝Node.js，npm會自動安裝"
    exit 1
fi

echo "✅ npm已安裝: $(npm --version)"

# 獲取本地IP地址
echo ""
echo "🔍 檢測網絡配置..."
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ 無法檢測到本地IP地址"
    echo "💡 請確保電腦已連接到Wi-Fi網絡"
    exit 1
fi

echo "✅ 檢測到本地IP: $LOCAL_IP"

# 安裝依賴
echo ""
echo "📦 正在安裝系統依賴..."
echo "⏳ 這可能需要幾分鐘，請耐心等待..."

npm install

if [ $? -ne 0 ]; then
    echo "❌ 依賴安裝失敗，請檢查網絡連接"
    exit 1
fi

echo "✅ 依賴安裝完成！"

# 顯示連接信息
echo ""
echo "🎉 ========================================"
echo "📱 手機連接信息"
echo "========================================"
echo "💻 電腦端地址: http://localhost:3000"
echo "📱 手機端地址: http://$LOCAL_IP:3000"
echo "🔧 後端API地址: http://$LOCAL_IP:5001"
echo "========================================"
echo ""
echo "💡 使用說明:"
echo "1. 確保手機和電腦連接同一個Wi-Fi"
echo "2. 在手機瀏覽器中輸入上面的手機端地址"
echo "3. 如果無法訪問，請檢查防火牆設置"
echo ""

# 啟動系統
echo "🚀 正在啟動VR系統..."
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







