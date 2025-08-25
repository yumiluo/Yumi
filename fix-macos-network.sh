#!/bin/bash

echo "🔧 修復macOS網絡配置"
echo "===================="

echo ""
echo "📋 當前網絡狀態:"
echo "===================="

# 檢查當前IP
CURRENT_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
echo "📍 當前IP: $CURRENT_IP"

# 檢查端口綁定
echo ""
echo "🔌 端口3001綁定狀態:"
lsof -i :3001

echo ""
echo "🌐 網絡接口狀態:"
netstat -an | grep 3001

echo ""
echo "💡 解決方案:"
echo "===================="
echo "1. 檢查macOS防火牆設置"
echo "2. 檢查網絡偏好設置"
echo "3. 嘗試不同的綁定方式"
echo ""

echo "🔧 嘗試修復..."
echo "===================="

# 檢查防火牆狀態
echo "檢查防火牆狀態..."
sudo pfctl -s all 2>/dev/null | grep -i "block" | head -3 || echo "無法檢查防火牆"

echo ""
echo "📝 手動修復步驟:"
echo "===================="
echo "1. 打開 系統偏好設置 > 安全與隱私 > 防火牆"
echo "2. 點擊 '防火牆選項...'"
echo "3. 確保端口3001沒有被阻止"
echo "4. 或者暫時關閉防火牆進行測試"
echo ""
echo "5. 檢查 系統偏好設置 > 網絡"
echo "6. 確保Wi-Fi連接正常"
echo "7. 點擊 '高級...' > TCP/IP"
echo "8. 確認IP地址設置正確"
echo ""

echo "🧪 測試建議:"
echo "===================="
echo "1. 暫時關閉防火牆: sudo pfctl -d"
echo "2. 重新啟動後端服務"
echo "3. 測試網絡連接"
echo "4. 如果成功，重新配置防火牆規則"
echo ""

echo "⚠️  注意: 關閉防火牆會降低安全性，僅用於測試！"
echo "✅ 完成！請按照上述步驟進行修復。"

