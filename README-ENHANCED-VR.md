# 🚀 增強版VR多設備視頻播放系統

## ✨ 系統特性

### 🔌 真實連接支持
- **WebSocket實時通信**: 支持真實的設備連接和狀態同步
- **多種連接方式**: WiFi、藍牙、USB、QR碼掃描
- **自動重連機制**: 網絡中斷時自動恢復連接
- **連接池管理**: 支持多設備同時連接

### ⚡ 性能優化
- **SWC編譯器**: 使用Rust編寫的快速編譯器
- **圖片優化**: WebP/AVIF格式支持，自動壓縮
- **代碼分割**: 按需加載，減少初始包大小
- **緩存策略**: 智能緩存，提升響應速度
- **WebSocket優化**: 心跳檢測，連接池管理

### 🌐 前後端一體化
- **Next.js 14**: 最新的React框架，支持App Router
- **Express後端**: 高性能Node.js服務器
- **Socket.io**: 實時雙向通信
- **API路由**: RESTful API設計
- **統一配置**: 前後端配置統一管理

### 📱 多設備支持
- **VR設備**: Oculus、HTC Vive等VR頭顯
- **移動設備**: 智能手機、平板電腦
- **桌面設備**: 電腦、筆記本
- **跨平台**: Windows、macOS、Linux、Android、iOS

## 🚀 快速開始

### 1. 環境要求
- Node.js 18+ 
- npm 9+ 或 yarn
- 現代瀏覽器（支持WebGL、WebRTC）

### 2. 安裝依賴
```bash
npm install
```

### 3. 啟動系統
```bash
# 使用啟動腳本（推薦）
./start-enhanced-vr.sh

# 或手動啟動
npm run dev:all
```

### 4. 訪問系統
- 前端應用: http://localhost:3000
- 後端API: http://localhost:3001/api
- 健康檢查: http://localhost:3001/api/health

## 🏗️ 系統架構

### 前端架構
```
app/
├── page.tsx                 # 主頁面
├── layout.tsx               # 布局組件
├── globals.css              # 全局樣式
└── api/                     # API路由
    └── health/route.ts      # 健康檢查

components/
├── enhanced-device-scanner.tsx  # 設備掃描器
├── device-management-modal.tsx  # 設備管理模態框
├── youtube-search.tsx           # YouTube搜索
├── vr-youtube-player.tsx        # VR播放器
└── ui/                          # UI組件庫
```

### 後端架構
```
server/
├── enhanced-vr-server.js    # 主服務器
├── websocket-server.ts      # WebSocket服務
└── device-discovery.ts      # 設備發現服務

lib/
├── websocket-manager.ts     # WebSocket管理器
├── enhanced-device-manager.ts # 設備管理器
├── youtube-api.ts           # YouTube API
└── database.ts              # 數據庫連接
```

## 🔧 核心功能

### 設備管理
- **自動發現**: 掃描網絡和藍牙設備
- **連接管理**: 建立和維護設備連接
- **狀態監控**: 實時監控設備狀態
- **診斷工具**: 設備連接診斷

### 視頻播放
- **YouTube集成**: 搜索和播放YouTube VR視頻
- **360度支持**: 原生360度視頻播放
- **VR模式**: 支持VR頭顯的沉浸式體驗
- **同步播放**: 多設備同步播放

### 用戶管理
- **認證系統**: JWT token認證
- **權限管理**: 角色基礎的訪問控制
- **會話管理**: 多設備會話同步
- **數據持久化**: Supabase數據庫支持

## 📊 API端點

### 健康檢查
```
GET /api/health
```

### 設備管理
```
GET    /api/devices          # 獲取設備列表
POST   /api/devices/scan     # 掃描設備
POST   /api/devices/:id/connect    # 連接設備
POST   /api/devices/:id/disconnect # 斷開設備
```

### 系統信息
```
GET /api/system/info         # 系統信息
```

### WebSocket事件
```
# 客戶端發送
scanDevices                  # 掃描設備
connectDevice                # 連接設備
disconnectDevice             # 斷開設備
heartbeat                    # 心跳檢測

# 服務器發送
welcome                      # 歡迎消息
deviceList                   # 設備列表
deviceStatusChanged          # 設備狀態變化
heartbeat                    # 心跳響應
```

## 🎯 性能優化

### 編譯優化
- **SWC編譯器**: 比Babel快20倍
- **Tree Shaking**: 移除未使用的代碼
- **代碼分割**: 按路由分割代碼
- **壓縮優化**: 啟用gzip壓縮

### 運行時優化
- **虛擬化**: 長列表虛擬化渲染
- **懶加載**: 圖片和組件懶加載
- **緩存策略**: 智能緩存管理
- **連接池**: WebSocket連接池

### 網絡優化
- **HTTP/2**: 支持多路復用
- **WebSocket**: 實時雙向通信
- **心跳檢測**: 保持連接活躍
- **自動重連**: 網絡恢復時自動重連

## 🔍 故障排除

### 常見問題

#### 1. 端口被佔用
```bash
# 檢查端口狀態
lsof -i :3000
lsof -i :3001

# 停止佔用進程
kill -9 <PID>
```

#### 2. WebSocket連接失敗
- 檢查防火牆設置
- 確認後端服務器運行狀態
- 檢查網絡連接

#### 3. 設備掃描失敗
- 確認設備在同一網絡
- 檢查設備權限設置
- 重啟掃描服務

### 日誌查看
```bash
# 查看後端日誌
tail -f server/enhanced-vr-server.js

# 查看前端日誌
# 在瀏覽器開發者工具中查看
```

## 🚀 部署指南

### 生產環境部署
```bash
# 構建生產版本
npm run build

# 啟動生產服務器
npm run start:all
```

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000 3001
CMD ["npm", "run", "start:all"]
```

### 環境變量
```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

## 🤝 貢獻指南

### 開發流程
1. Fork項目
2. 創建功能分支
3. 提交更改
4. 創建Pull Request

### 代碼規範
- 使用TypeScript
- 遵循ESLint規則
- 編寫單元測試
- 更新文檔

## 📄 許可證

MIT License - 詳見 [LICENSE](LICENSE) 文件

## 🆘 支持

- 📧 郵箱: support@vr-system.com
- 💬 討論區: [GitHub Discussions](https://github.com/your-repo/discussions)
- 🐛 問題報告: [GitHub Issues](https://github.com/your-repo/issues)

---

**🎉 享受您的VR體驗！**
