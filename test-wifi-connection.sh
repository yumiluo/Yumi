#!/bin/bash

# Wi-Fi連接測試腳本

echo "🧪 測試Wi-Fi連接功能"
echo "===================="

# 檢查後端是否運行
echo "📡 檢查後端服務器..."
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ 後端服務器運行正常"
else
    echo "❌ 後端服務器未運行，請先啟動後端"
    echo "💡 運行: cd server && npm start"
    exit 1
fi

# 測試設備發現端點
echo "🔍 測試設備發現端點..."
DISCOVER_RESPONSE=$(curl -s http://localhost:5000/discover)
if [ $? -eq 0 ]; then
    echo "✅ 設備發現端點正常"
    echo "📋 響應: $DISCOVER_RESPONSE"
else
    echo "❌ 設備發現端點測試失敗"
fi

# 測試設備列表端點
echo "📋 測試設備列表端點..."
DEVICES_RESPONSE=$(curl -s http://localhost:5000/api/devices)
if [ $? -eq 0 ]; then
    echo "✅ 設備列表端點正常"
    echo "📋 響應: $DEVICES_RESPONSE"
else
    echo "❌ 設備列表端點測試失敗"
fi

echo ""
echo "🎉 Wi-Fi連接測試完成！"
echo "💡 如果所有測試都通過，說明後端配置正確"
echo "💡 現在可以啟動前端應用進行完整測試"
