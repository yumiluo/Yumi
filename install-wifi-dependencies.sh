#!/bin/bash

# VR多設備旅遊視頻播放器 - Wi-Fi功能依賴安裝腳本
# 此腳本將安裝所有必要的依賴包

echo "🚀 開始安裝VR多設備旅遊視頻播放器 - Wi-Fi功能依賴"
echo "=================================================="

# 檢查Node.js版本
echo "📋 檢查Node.js版本..."
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到Node.js，請先安裝Node.js 16.0.0或更高版本"
    echo "💡 下載地址: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ 錯誤: Node.js版本過低，需要16.0.0或更高版本"
    echo "💡 當前版本: $(node -v)"
    echo "💡 請更新Node.js後重試"
    exit 1
fi

echo "✅ Node.js版本檢查通過: $(node -v)"

# 檢查npm版本
echo "📋 檢查npm版本..."
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: 未找到npm，請檢查Node.js安裝"
    exit 1
fi

echo "✅ npm版本: $(npm -v)"

# 檢查是否為npm項目
if [ ! -f "package.json" ]; then
    echo "❌ 錯誤: 未找到package.json文件，請在項目根目錄運行此腳本"
    exit 1
fi

echo "✅ 項目結構檢查通過"

# 備份原有package.json
echo "📋 備份原有package.json..."
if [ -f "package.json.backup" ]; then
    echo "⚠️  發現已有備份文件，跳過備份"
else
    cp package.json package.json.backup
    echo "✅ package.json已備份為package.json.backup"
fi

# 安裝核心依賴
echo "📦 安裝核心依賴..."
echo "   - @mui/material (Material-UI組件庫)"
echo "   - socket.io-client (WebSocket客戶端)"
echo "   - aframe-react (VR框架React集成)"
echo "   - jsqr (QR碼掃描)"
echo "   - qrcode.react (QR碼生成)"
echo "   - axios (HTTP客戶端)"

npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
if [ $? -ne 0 ]; then
    echo "❌ 安裝Material-UI依賴失敗"
    exit 1
fi

npm install socket.io-client
if [ $? -ne 0 ]; then
    echo "❌ 安裝Socket.io客戶端失敗"
    exit 1
fi

npm install aframe aframe-react
if [ $? -ne 0 ]; then
    echo "❌ 安裝A-Frame依賴失敗"
    exit 1
fi

npm install jsqr qrcode.react
if [ $? -ne 0 ]; then
    echo "❌ 安裝QR碼相關依賴失敗"
    exit 1
fi

npm install axios
if [ $? -ne 0 ]; then
    echo "❌ 安裝Axios失敗"
    exit 1
fi

# 安裝開發依賴
echo "📦 安裝開發依賴..."
npm install --save-dev @types/node @types/react @types/react-dom typescript
if [ $? -ne 0 ]; then
    echo "❌ 安裝TypeScript類型定義失敗"
    exit 1
fi

# 檢查安裝結果
echo "📋 檢查安裝結果..."
if [ -d "node_modules" ]; then
    echo "✅ 依賴安裝完成"
    echo "📁 node_modules目錄已創建"
else
    echo "❌ 依賴安裝失敗，node_modules目錄未創建"
    exit 1
fi

# 創建後端服務器目錄
echo "📁 創建後端服務器目錄..."
mkdir -p server
if [ ! -f "server/package.json" ]; then
    echo "📦 初始化後端package.json..."
    cat > server/package.json << EOF
{
  "name": "vr-wifi-backend",
  "version": "1.0.0",
  "description": "VR多設備Wi-Fi連接後端服務",
  "main": "api-example.js",
  "scripts": {
    "start": "node api-example.js",
    "dev": "nodemon api-example.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "socket.io": "^4.7.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
EOF
    echo "✅ 後端package.json已創建"
fi

# 安裝後端依賴
echo "📦 安裝後端依賴..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "❌ 安裝後端依賴失敗"
    cd ..
    exit 1
fi
cd ..

echo "✅ 後端依賴安裝完成"

# 創建啟動腳本
echo "📝 創建啟動腳本..."
cat > start-wifi-app.sh << 'EOF'
#!/bin/bash

# VR多設備旅遊視頻播放器 - Wi-Fi版本啟動腳本

echo "🚀 啟動VR多設備旅遊視頻播放器 - Wi-Fi版本"
echo "=========================================="

# 檢查依賴
if [ ! -d "node_modules" ]; then
    echo "❌ 錯誤: 未找到node_modules目錄，請先運行install-wifi-dependencies.sh"
    exit 1
fi

# 啟動後端服務器
echo "🔧 啟動後端服務器..."
cd server
if [ ! -f "api-example.js" ]; then
    echo "❌ 錯誤: 未找到api-example.js文件"
    cd ..
    exit 1
fi

echo "📡 後端服務器將在端口5000啟動"
echo "💡 請在新終端中運行: npm run dev"
echo ""

# 啟動後端
npm start &
BACKEND_PID=$!

# 等待後端啟動
sleep 3

# 檢查後端是否啟動成功
if curl -s http://localhost:5000/health > /dev/null; then
    echo "✅ 後端服務器啟動成功"
else
    echo "❌ 後端服務器啟動失敗"
    kill $BACKEND_PID 2>/dev/null
    cd ..
    exit 1
fi

cd ..

# 啟動前端
echo "🌐 啟動前端應用..."
echo "💡 前端將在 http://localhost:3000 啟動"
echo ""

npm run dev

# 清理後端進程
echo "🧹 清理後端進程..."
kill $BACKEND_PID 2>/dev/null
echo "✅ 應用已關閉"
EOF

chmod +x start-wifi-app.sh
echo "✅ 啟動腳本已創建: start-wifi-app.sh"

# 創建測試腳本
echo "📝 創建測試腳本..."
cat > test-wifi-connection.sh << 'EOF'
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
EOF

chmod +x test-wifi-connection.sh
echo "✅ 測試腳本已創建: test-wifi-connection.sh"

# 顯示安裝完成信息
echo ""
echo "🎉 安裝完成！"
echo "============="
echo ""
echo "📋 已安裝的依賴:"
echo "   ✅ Material-UI組件庫"
echo "   ✅ Socket.io客戶端"
echo "   ✅ A-Frame VR框架"
echo "   ✅ QR碼掃描和生成"
echo "   ✅ HTTP客戶端"
echo "   ✅ TypeScript支持"
echo ""
echo "📁 已創建的文件:"
echo "   ✅ server/package.json"
echo "   ✅ start-wifi-app.sh (啟動腳本)"
echo "   ✅ test-wifi-connection.sh (測試腳本)"
echo ""
echo "🚀 使用方法:"
echo "   1. 啟動後端: cd server && npm start"
echo "   2. 啟動前端: npm run dev"
echo "   3. 測試連接: ./test-wifi-connection.sh"
echo "   4. 完整啟動: ./start-wifi-app.sh"
echo ""
echo "📖 詳細文檔請參考: README-WIFI-UPDATE.md"
echo ""
echo "💡 提示: 如果遇到問題，請檢查網絡設置和防火牆配置"
echo ""

