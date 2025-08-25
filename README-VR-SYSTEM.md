# VR多設備視頻播放系統

一個基於React.js和Socket.io的VR多設備視頻播放系統，支持控制器和用戶設備的實時視頻同步播放。

## 🚀 功能特點

- **多設備同步**: 控制器播放視頻，所有連接設備實時同步
- **真實連接**: 使用Socket.io實現真實的設備連接，無假數據
- **設備識別**: 自動識別設備型號（iPhone 14、Samsung Galaxy S23等）
- **多種連接方式**: 支持Wi-Fi掃描和QR碼連接
- **實時狀態**: 實時顯示設備連接狀態和視頻播放狀態
- **響應式設計**: 支持桌面和移動設備
- **Material-UI主題**: 現代化的深色主題設計

## 🛠️ 技術棧

### 前端
- **React 18** - 現代化React框架
- **TypeScript** - 類型安全的JavaScript
- **Socket.io-client** - 實時通信客戶端
- **Tailwind CSS** - 實用優先的CSS框架
- **Radix UI** - 無障礙UI組件
- **Lucide React** - 現代化圖標庫

### 後端
- **Node.js** - JavaScript運行時
- **Express.js** - Web應用框架
- **Socket.io** - 實時雙向通信
- **CORS** - 跨域資源共享

### 依賴
- **ua-parser-js** - 用戶代理解析器
- **qrcode.react** - QR碼生成
- **jsQR** - QR碼掃描

## 📦 安裝和運行

### 前置要求
- Node.js 16.0.0 或更高版本
- npm 或 yarn 包管理器
- 現代化瀏覽器（支持ES6+）

### 快速啟動

1. **克隆項目**
   ```bash
   git clone <repository-url>
   cd Yumi
   ```

2. **使用啟動腳本（推薦）**
   ```bash
   ./start-vr-system.sh
   ```

3. **手動啟動**
   ```bash
   # 安裝前端依賴
   npm install
   
   # 安裝後端依賴
   cd server
   npm install
   cd ..
   
   # 啟動後端服務器
   cd server
   npm start &
   cd ..
   
   # 啟動前端開發服務器
   npm run dev
   ```

### 端口配置
- **前端**: http://localhost:3000
- **後端**: http://localhost:5000
- **後端狀態**: http://localhost:5000/status
- **健康檢查**: http://localhost:5000/health

## 🎮 使用方法

### 1. 控制器模式（桌面端）

1. 打開瀏覽器訪問 http://localhost:3000
2. 點擊"VR多設備視頻播放"進入控制器模式
3. 點擊"創建新會話"生成會話代碼
4. 使用QR碼或Wi-Fi掃描邀請設備加入
5. 播放視頻，所有連接設備將同步播放

### 2. 用戶模式（移動端）

1. 在手機瀏覽器中訪問 http://localhost:3000
2. 點擊"VR視頻觀看器"進入用戶模式
3. 輸入從控制器獲得的會話代碼
4. 點擊"加入會話"
5. 等待控制器發送視頻進行同步播放

### 3. 設備連接方式

#### Wi-Fi連接
- 確保所有設備在同一Wi-Fi網絡
- 後端服務必須在端口5000運行
- 系統會自動掃描本地網絡中的設備

#### QR碼連接
- 掃描控制器顯示的QR碼
- 支持相機掃描和手動輸入
- 適用於所有支持相機的設備

## 🔧 配置說明

### 環境變量
```bash
# 後端端口（默認5000）
PORT=5000

# 前端開發服務器端口（默認3000）
# 在next.config.js中配置
```

### 網絡配置
- 支持常見本地IP範圍：192.168.x.x, 10.x.x.x, 172.x.x.x
- 自動檢測當前網絡環境
- 可配置掃描超時和並發數

### 設備識別
系統使用`ua-parser-js`自動識別設備信息：
- **iOS設備**: iPhone 14, iPhone 15 Pro等
- **Android設備**: Samsung Galaxy S23, Xiaomi 13等
- **VR設備**: Oculus Quest, HTC Vive等
- **其他設備**: 瀏覽器信息

## 📱 設備支持

### 控制器設備
- 桌面瀏覽器（Chrome, Firefox, Safari, Edge）
- 支持會話創建、設備管理、視頻控制

### 用戶設備
- 移動設備（iOS, Android）
- 平板設備
- VR頭顯
- 桌面瀏覽器

## 🔍 故障排除

### 常見問題

1. **無法連接到後端服務器**
   - 檢查後端是否在端口5000運行
   - 確認防火牆設置
   - 檢查網絡連接

2. **設備無法發現**
   - 確保在同一Wi-Fi網絡
   - 檢查後端服務狀態
   - 嘗試手動輸入IP地址

3. **視頻同步延遲**
   - 檢查網絡延遲
   - 確認設備性能
   - 調整同步間隔

4. **QR碼無法掃描**
   - 檢查相機權限
   - 確保光線充足
   - 嘗試手動輸入會話代碼

### 調試信息
- 前端控制台：設備連接狀態、Socket.io事件
- 後端控制台：連接日誌、設備管理狀態
- 網絡面板：WebSocket連接狀態

## 🚀 部署

### 生產環境
```bash
# 構建前端
npm run build

# 啟動生產服務器
npm start

# 後端生產部署
cd server
NODE_ENV=production npm start
```

### Docker部署
```dockerfile
# 前端Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]

# 後端Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## 📊 性能優化

### 前端優化
- 使用React.memo減少不必要的重渲染
- 實現虛擬滾動處理大量設備列表
- 優化Socket.io事件處理

### 後端優化
- 實現設備連接池管理
- 優化WebSocket消息廣播
- 添加連接限流和防護

### 網絡優化
- 實現自適應同步間隔
- 添加網絡質量檢測
- 支持斷線重連和狀態恢復

## 🔒 安全考慮

- 實現會話認證和授權
- 添加設備連接驗證
- 防止惡意設備連接
- 實現消息加密傳輸

## 🤝 貢獻指南

1. Fork項目
2. 創建功能分支
3. 提交更改
4. 推送到分支
5. 創建Pull Request

## 📄 許可證

MIT License - 詳見LICENSE文件

## 📞 支持

如有問題或建議，請：
- 提交Issue
- 發送郵件
- 參與討論

---

**注意**: 本系統僅用於教育和研究目的，請遵守相關法律法規。







