# VR多設備旅遊視頻播放器

一個支持真實藍牙掃描和QR碼連接的VR多設備視頻同步播放系統。

## ✨ 主要功能

### 🔵 真實藍牙掃描
- 使用Web Bluetooth API掃描附近的VR設備和手機
- 支持低功耗藍牙（BLE）設備
- 自動識別VR設備類型
- 實時信號強度顯示

### 📱 QR碼連接
- 相機掃描QR碼快速連接設備
- 支持手動輸入設備代碼
- 適用於所有支持相機的設備

### 🎥 視頻管理
- 按地理區域分類：亞洲、歐洲、中東、非洲、北美洲、南美洲、大洋洲、北極、南極
- 支持本地視頻上傳
- 預設真實旅遊視頻內容

### 🎮 播放控制
- 多設備同步播放
- 實時播放狀態同步
- 播放、暫停、停止控制

## 🚀 快速開始

### 1. 安裝依賴

```bash
# 安裝所有依賴包
pnpm install

# 或者使用腳本
chmod +x install-dependencies.sh
./install-dependencies.sh
```

### 2. 啟動後端服務器

```bash
cd server
node index.js
```

後端服務器將在端口3001啟動。

### 3. 啟動前端開發服務器

```bash
pnpm dev
```

前端將在端口3000啟動。

## 🌐 訪問地址

- **前端**: http://localhost:3000
- **後端API**: http://localhost:3001

## 📱 使用方法

### 藍牙連接

1. 點擊"添加設備"按鈕
2. 選擇"藍牙掃描"選項卡
3. 點擊"開始藍牙掃描"
4. 在彈出的對話框中選擇要連接的設備
5. 等待連接完成

**注意事項：**
- 僅在Chrome瀏覽器（Android/Desktop）中支持
- 需要HTTPS環境或localhost
- 設備必須開啟藍牙且處於可發現狀態

### QR碼連接

1. 點擊"添加設備"按鈕
2. 選擇"QR碼掃描"選項卡
3. 點擊"開始掃描"
4. 將QR碼對準掃描框
5. 或使用"手動輸入"功能

### 視頻播放

1. 連接設備後，進入"視頻管理"選項卡
2. 使用分類按鈕過濾不同地區的視頻
3. 選擇視頻點擊"播放"
4. 所有連接的設備將同步播放

## 🛠️ 技術架構

### 前端技術棧
- **React 18** - 用戶界面框架
- **Next.js 14** - 全棧React框架
- **TypeScript** - 類型安全
- **Tailwind CSS** - 樣式框架
- **Radix UI** - 無障礙組件庫

### 後端技術棧
- **Node.js** - 運行時環境
- **Express.js** - Web框架
- **WebSocket** - 實時通信
- **Multer** - 文件上傳處理

### 藍牙和QR碼
- **Web Bluetooth API** - 藍牙設備掃描
- **jsQR** - QR碼解析
- **MediaDevices API** - 相機訪問

## 📁 項目結構

```
├── app/                    # Next.js應用頁面
│   ├── page.tsx          # 主頁面
│   ├── layout.tsx        # 佈局組件
│   └── globals.css       # 全局樣式
├── components/            # React組件
│   ├── bluetooth-scanner.tsx    # 藍牙掃描器
│   ├── qr-scanner.tsx           # QR碼掃描器
│   ├── device-management-modal.tsx # 設備管理模態窗口
│   └── ui/               # UI基礎組件
├── lib/                   # 工具庫
│   ├── bluetooth-manager.ts      # 藍牙管理
│   └── device-manager.ts         # 設備管理
├── server/                # 後端服務器
│   └── index.js          # Express服務器
├── types/                 # 類型定義
│   └── jsqr.d.ts         # jsQR類型定義
└── package.json           # 項目配置
```

## 🔧 配置選項

### 環境變量

```bash
# 後端端口
PORT=3001

# 前端端口
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 藍牙配置

```typescript
// 支持的藍牙服務
const BLUETOOTH_SERVICES = [
  'generic_access',
  'battery_service',
  'device_information',
  'generic_attribute',
  'human_interface_device'
]
```

## 🧪 測試

### 測試環境要求

1. **Chrome瀏覽器**（Android或Desktop）
2. **藍牙功能**已開啟
3. **相機權限**已授予
4. **HTTPS環境**或localhost

### 測試步驟

1. 啟動後端服務器
2. 啟動前端開發服務器
3. 在Chrome中訪問 http://localhost:3000
4. 測試藍牙掃描功能
5. 測試QR碼掃描功能
6. 測試視頻播放同步

## 🐛 故障排除

### 常見問題

**Q: 藍牙掃描不工作？**
A: 確保使用Chrome瀏覽器，已開啟藍牙，並授予權限。

**Q: 相機無法啟動？**
A: 檢查瀏覽器權限設置，確保已允許相機訪問。

**Q: 設備連接失敗？**
A: 檢查設備是否在範圍內，藍牙是否開啟。

**Q: 視頻無法播放？**
A: 確保已連接設備，檢查視頻文件格式。

### 調試模式

開啟瀏覽器開發者工具，查看控制台日誌：

```javascript
// 藍牙掃描日誌
console.log('藍牙設備已連接:', deviceInfo)

// QR碼掃描日誌
console.log('掃描到QR碼:', code.data)

// 設備狀態日誌
console.log('設備狀態更新:', deviceStatus)
```

## 📄 許可證

MIT License

## 🤝 貢獻

歡迎提交Issue和Pull Request！

## 📞 支持

如有問題，請創建GitHub Issue或聯繫開發團隊。