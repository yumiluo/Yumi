#!/bin/bash

# VR多設備旅遊視頻播放器 - 依賴安裝腳本

echo "🚀 開始安裝VR多設備旅遊視頻播放器依賴..."

# 檢查Node.js版本
echo "📋 檢查Node.js版本..."
if ! command -v node &> /dev/null; then
    echo "❌ 錯誤: 未找到Node.js，請先安裝Node.js 16+"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ 錯誤: Node.js版本過低，需要16+，當前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js版本檢查通過: $(node -v)"

# 檢查npm版本
echo "📋 檢查npm版本..."
if ! command -v npm &> /dev/null; then
    echo "❌ 錯誤: 未找到npm，請先安裝npm"
    exit 1
fi

echo "✅ npm版本檢查通過: $(npm -v)"

# 安裝主要依賴
echo "📦 安裝主要依賴..."
npm install @mui/material @emotion/react @emotion/styled
npm install socket.io-client aframe-react jsqr qrcode.react axios
npm install lucide-react clsx tailwind-merge

# 安裝UI組件依賴
echo "🎨 安裝UI組件依賴..."
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog
npm install @radix-ui/react-aspect-ratio @radix-ui/react-avatar
npm install @radix-ui/react-checkbox @radix-ui/react-collapsible
npm install @radix-ui/react-context-menu @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu @radix-ui/react-hover-card
npm install @radix-ui/react-label @radix-ui/react-menubar
npm install @radix-ui/react-navigation-menu @radix-ui/react-popover
npm install @radix-ui/react-progress @radix-ui/react-radio-group
npm install @radix-ui/react-scroll-area @radix-ui/react-select
npm install @radix-ui/react-separator @radix-ui/react-slider
npm install @radix-ui/react-slot @radix-ui/react-switch
npm install @radix-ui/react-tabs @radix-ui/react-toast
npm install @radix-ui/react-toggle @radix-ui/react-toggle-group
npm install @radix-ui/react-tooltip

# 安裝開發依賴
echo "🔧 安裝開發依賴..."
npm install --save-dev @types/node @types/react @types/react-dom
npm install --save-dev typescript postcss tailwindcss autoprefixer

# 檢查安裝結果
echo "🔍 檢查安裝結果..."
if [ -d "node_modules" ]; then
    echo "✅ 依賴安裝完成！"
    echo "📊 安裝的依賴包數量: $(ls node_modules | wc -l)"
else
    echo "❌ 依賴安裝失敗"
    exit 1
fi

# 顯示重要依賴版本
echo "📋 重要依賴版本:"
echo "  - React: $(npm list react --depth=0 | grep react@ | cut -d' ' -f2)"
echo "  - Next.js: $(npm list next --depth=0 | grep next@ | cut -d' ' -f2)"
echo "  - A-Frame: $(npm list aframe-react --depth=0 | grep aframe-react@ | cut -d' ' -f2)"
echo "  - YouTube API: $(npm list axios --depth=0 | grep axios@ | cut -d' ' -f2)"

echo ""
echo "🎉 依賴安裝完成！"
echo ""
echo "📝 下一步操作:"
echo "1. 配置YouTube API Key (編輯 components/youtube-search.tsx)"
echo "2. 啟動後端服務器: cd server && node index.js"
echo "3. 啟動前端應用: npm run dev"
echo "4. 訪問應用: http://localhost:3000"
echo ""
echo "📚 更多信息請查看 README-FIXES.md"
