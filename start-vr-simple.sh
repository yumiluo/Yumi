#!/bin/bash

echo "🎉 ========================================"
echo "🚀 VR多設備視頻播放系統 - 新手友好版"
echo "🎯 一鍵啟動，無需複雜配置！"
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

# 啟動系統
echo ""
echo "🚀 正在啟動VR系統..."
echo "⏳ 請等待系統啟動完成..."

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







