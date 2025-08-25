#!/bin/bash

echo "🛑 正在停止完整VR系統..."

# 停止所有相關進程
echo "🔪 停止設備掃描服務器..."
pkill -f "node.*device-scanner-server" 2>/dev/null

echo "🔪 停止VR後端服務器..."
pkill -f "node.*enhanced-vr-server" 2>/dev/null

echo "🔪 停止前端開發服務器..."
pkill -f "next dev" 2>/dev/null

# 清理端口
echo "🧹 清理端口..."
pkill -f "node.*3000" 2>/dev/null
pkill -f "node.*3001" 2>/dev/null
pkill -f "node.*3002" 2>/dev/null

sleep 2

echo "✅ 所有服務已停止"
echo "🌐 端口狀態:"
echo "   3000: $(lsof -ti:3000 2>/dev/null | wc -l | tr -d ' ') 個進程"
echo "   3001: $(lsof -ti:3001 2>/dev/null | wc -l | tr -d ' ') 個進程"
echo "   3002: $(lsof -ti:3002 2>/dev/null | wc -l | tr -d ' ') 個進程"
