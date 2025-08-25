#!/bin/bash

echo "🛑 停止VR系統..."
echo "================================"

# 停止前端應用
echo "🌐 停止前端應用..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "正在停止端口3000的進程..."
    lsof -ti:3000 | xargs kill -9
    echo "✅ 前端應用已停止"
else
    echo "前端應用未運行"
fi

# 停止後端服務器
echo "🔧 停止後端服務器..."
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "正在停止端口3001的進程..."
    lsof -ti:3001 | xargs kill -9
    echo "✅ 後端服務器已停止"
else
    echo "後端服務器未運行"
fi

# 檢查是否還有相關進程
echo "🔍 檢查剩餘進程..."
remaining_processes=$(ps aux | grep -E "(next|node.*server)" | grep -v grep)
if [ -n "$remaining_processes" ]; then
    echo "發現剩餘進程:"
    echo "$remaining_processes"
    echo "正在強制停止..."
    ps aux | grep -E "(next|node.*server)" | grep -v grep | awk '{print $2}' | xargs kill -9
    echo "✅ 所有相關進程已停止"
else
    echo "✅ 沒有發現剩餘進程"
fi

echo "================================"
echo "🎉 VR系統已完全停止！"
echo ""
echo "💡 重新啟動系統: ./start-enhanced-vr.sh"
echo "================================"
