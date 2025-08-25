# YouTube VR/360度旅遊影片整合功能

## 概述

這個更新為VR多設備旅遊視頻播放器添加了真實的YouTube VR/360度影片搜索和播放功能。用戶可以從YouTube搜索真實的360度旅遊影片，並將其存儲到瀏覽器的LocalStorage中，實現本地訪問和重用。

## 新增功能

### 1. YouTube影片搜索
- **搜索功能**: 在影片庫中新增"搜索YouTube VR影片"按鈕
- **真實API**: 使用YouTube Data API v3搜索真實的VR/360度旅遊影片
- **智能過濾**: 自動過濾包含"360"或"VR"關鍵詞的影片
- **國家識別**: 從標題和描述中自動識別國家/地區信息

### 2. LocalStorage管理
- **本地存儲**: 將YouTube影片元數據存儲到瀏覽器LocalStorage
- **數據持久化**: 重新載入頁面後自動恢復影片列表
- **存儲限制**: 最多存儲50個影片，防止存儲空間過載
- **數據管理**: 支持刪除、搜索、分類過濾等操作

### 3. 真實播放功能
- **YouTube嵌入**: 使用YouTube IFrame API播放真實的360度影片
- **VR支持**: 支持360度影片的拖拽旋轉和VR頭顯
- **同步播放**: 與現有的多設備同步邏輯完全兼容
- **播放控制**: 支持播放、暫停、停止、音量控制等

## 安裝和配置

### 1. 安裝依賴
```bash
npm install @mui/material socket.io-client aframe-react jsqr qrcode.react axios
```

### 2. 配置YouTube API Key
在 `components/youtube-search.tsx` 文件中，將以下行：
```typescript
const YOUTUBE_API_KEY = 'YOUR_API_KEY'
```
替換為您的真實Google API Key：
```typescript
const YOUTUBE_API_KEY = 'AIzaSyC...' // 您的真實API Key
```

### 3. 獲取YouTube API Key
1. 訪問 [Google Cloud Console](https://console.cloud.google.com/)
2. 創建新項目或選擇現有項目
3. 啟用YouTube Data API v3
4. 創建憑證（API Key）
5. 複製API Key並替換到代碼中

## 使用方法

### 1. 搜索YouTube影片
1. 點擊"搜索YouTube VR影片"按鈕
2. 在搜索框中輸入關鍵詞（如："360 VR travel Japan"）
3. 點擊搜索按鈕
4. 瀏覽搜索結果，點擊"選擇影片"添加到本地庫

### 2. 管理本地影片
- **查看影片**: 所有YouTube影片會顯示在影片庫中
- **分類過濾**: 使用國家分類按鈕過濾影片
- **刪除影片**: 點擊影片卡片上的垃圾桶圖標刪除
- **播放影片**: 點擊播放按鈕開始播放

### 3. 播放控制
- **基本控制**: 播放、暫停、停止
- **360度控制**: 使用滑鼠拖拽旋轉視角
- **音量控制**: 調整音量和靜音切換
- **全螢幕**: 支持全螢幕播放模式

## 技術架構

### 組件結構
- `YouTubeSearch`: YouTube搜索模態框組件
- `YouTubePlayer`: YouTube播放器組件
- `YouTubeStorage`: LocalStorage管理工具

### 數據流程
1. 用戶搜索 → YouTube API → 過濾360度影片 → 顯示結果
2. 選擇影片 → 存儲到LocalStorage → 更新影片列表
3. 播放影片 → YouTube IFrame API → 360度播放體驗

### 存儲結構
```typescript
interface YouTubeVideo {
  id: string           // YouTube影片ID
  title: string        // 影片標題
  description: string  // 影片描述
  thumbnail: string    // 縮略圖URL
  duration: string     // 影片時長
  country: string      // 國家/地區
  tags: string[]       // 標籤
  embedUrl: string     // 嵌入URL
  publishedAt: string  // 發布時間
  channelTitle: string // 頻道名稱
  addedAt: string      // 添加到本地時間
  viewCount: number    // 觀看次數
}
```

## 測試指南

### 1. 基本功能測試
1. 啟動後端服務器：`cd server && node index.js`
2. 啟動前端應用：`npm run dev`
3. 訪問 http://localhost:3000
4. 點擊"搜索YouTube VR影片"按鈕

### 2. YouTube搜索測試
1. 搜索"360 VR travel Japan"
2. 確認搜索結果包含360度影片
3. 選擇一個影片添加到本地庫
4. 檢查影片是否出現在影片庫中

### 3. 播放功能測試
1. 點擊影片的播放按鈕
2. 確認YouTube播放器正常載入
3. 測試360度拖拽功能
4. 測試播放控制按鈕

### 4. 數據持久化測試
1. 添加幾個YouTube影片到本地庫
2. 重新載入頁面
3. 確認影片列表從LocalStorage恢復
4. 測試分類過濾功能

## 注意事項

### 1. API限制
- YouTube Data API v3有每日配額限制
- 免費版本：10,000次請求/天
- 建議在生產環境中監控API使用量

### 2. 版權問題
- 本功能僅嵌入YouTube影片，不下載內容
- 遵守YouTube服務條款和版權規定
- 用戶需對搜索和播放的內容負責

### 3. 瀏覽器兼容性
- 需要支持LocalStorage的現代瀏覽器
- YouTube IFrame API需要網路連接
- 360度播放需要WebGL支持

### 4. 性能考慮
- LocalStorage有大小限制（通常5-10MB）
- 大量影片可能影響載入性能
- 建議定期清理不需要的影片

## 故障排除

### 1. API Key錯誤
**症狀**: 搜索時顯示"請先設定YouTube API Key"
**解決**: 檢查API Key是否正確設置，確認API已啟用

### 2. 搜索無結果
**症狀**: 搜索後顯示"沒有找到相關的360度旅遊影片"
**解決**: 嘗試不同的搜索關鍵詞，檢查網路連接

### 3. 播放器載入失敗
**症狀**: 播放器顯示錯誤或無法載入
**解決**: 檢查網路連接，確認YouTube服務可用

### 4. LocalStorage錯誤
**症狀**: 無法添加或刪除影片
**解決**: 檢查瀏覽器存儲空間，清除瀏覽器數據

## 更新日誌

### v1.0.0 (當前版本)
- ✅ 添加YouTube VR/360度影片搜索功能
- ✅ 實現LocalStorage本地影片管理
- ✅ 整合YouTube IFrame API播放器
- ✅ 支持360度影片的拖拽和VR體驗
- ✅ 保持與現有多設備同步邏輯的兼容性

## 未來計劃

- [ ] 添加影片收藏功能
- [ ] 實現播放歷史記錄
- [ ] 支持更多影片平台
- [ ] 添加影片評分和評論
- [ ] 實現智能推薦算法

## 支持

如果您在使用過程中遇到問題，請：
1. 檢查瀏覽器控制台的錯誤信息
2. 確認API Key配置正確
3. 檢查網路連接狀態
4. 查看本README的故障排除部分

---

**注意**: 本功能需要有效的YouTube API Key才能正常工作。請確保在Google Cloud Console中正確配置API憑證。

