# VR多設備旅遊視頻播放器 - Wi-Fi連接更新

## 更新概述

本次更新將原有的藍牙連接功能完全替換為Wi-Fi本地網絡連接，提供更穩定、更快速的設備發現和連接體驗。

## 主要變更

### 1. 移除藍牙功能
- ❌ 完全移除 `BluetoothScanner` 組件
- ❌ 移除所有 `navigator.bluetooth` 相關代碼
- ❌ 移除藍牙錯誤處理和提示
- ❌ 移除 `add-device-bluetooth` 事件

### 2. 新增Wi-Fi功能
- ✅ 新增 `WiFiScanner` 組件
- ✅ 實現本地網絡設備掃描
- ✅ 支持常見IP範圍自動掃描
- ✅ 並行掃描提升效率
- ✅ 智能設備類型識別

### 3. 保留現有功能
- ✅ 保持所有UI設計和樣式
- ✅ QR碼掃描功能完整保留
- ✅ 視頻同步邏輯不變
- ✅ YouTube集成保持原樣

## 技術實現

### Wi-Fi掃描原理
```typescript
// 掃描本地IP範圍
const getLocalIPRanges = (): string[] => {
  const commonRanges = [
    '192.168.0', '192.168.1', '192.168.2',
    '10.0.0', '10.0.1',
    '172.16.0', '172.16.1'
  ];
  return commonRanges;
};

// 並行掃描多個IP
const scanIP = async (baseIP: string, port: number = 5000) => {
  const response = await fetch(`http://${ip}:${port}/discover`);
  // 處理響應...
};
```

### 設備發現流程
1. 用戶點擊"開始Wi-Fi掃描"
2. 系統自動掃描常見本地IP範圍
3. 向每個IP的端口5000發送 `/discover` 請求
4. 解析響應，識別設備類型
5. 顯示可連接設備列表
6. 用戶選擇設備進行連接

## 安裝和配置

### 1. 安裝依賴
```bash
npm install @mui/material socket.io-client aframe-react jsqr qrcode.react axios
```

### 2. 後端配置
後端需要實現 `/discover` 端點：

```javascript
// Express.js 示例
app.get('/discover', (req, res) => {
  res.json({
    status: 'available',
    deviceName: 'VR Device',
    deviceType: 'vr', // 'vr' | 'mobile' | 'unknown'
    sessionId: 'session-xxx'
  });
});
```

### 3. CORS配置
後端需要允許本地網絡訪問：

```javascript
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || 
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('http://172.')) {
      callback(null, true);
    } else {
      callback(new Error('不允許的來源'));
    }
  }
}));
```

## 使用方法

### 1. 啟動後端服務
```bash
cd server
node api-example.js
```

### 2. 啟動前端應用
```bash
npm run dev
```

### 3. 設備連接流程
1. 進入VR多設備頁面
2. 創建新會話
3. 點擊"添加設備" → "Wi-Fi掃描"
4. 點擊"開始Wi-Fi掃描"
5. 等待掃描完成
6. 選擇要連接的設備
7. 確認連接

## 網絡要求

### 設備配置
- 所有設備必須在同一Wi-Fi網絡
- 後端服務運行在端口5000
- 防火牆允許本地網絡通信

### 支持的IP範圍
- `192.168.0.x` - `192.168.255.x`
- `10.0.0.x` - `10.255.255.x`
- `172.16.0.x` - `172.31.255.x`

## 錯誤處理

### 常見問題及解決方案

#### 1. 掃描無結果
```
錯誤: 未找到設備，請確保在同一Wi-Fi網絡中，且後端服務正在運行
```
**解決方案:**
- 檢查所有設備是否在同一Wi-Fi
- 確認後端服務正在運行
- 檢查防火牆設置

#### 2. CORS錯誤
```
錯誤: 請檢查網絡設定
```
**解決方案:**
- 確認後端CORS配置正確
- 檢查IP地址是否在允許範圍內

#### 3. 掃描超時
```
錯誤: 掃描可能需要30秒，請耐心等待
```
**解決方案:**
- 等待掃描完成
- 檢查網絡連接速度
- 減少掃描的IP範圍

## 測試指南

### 1. 基本功能測試
```bash
# 1. 啟動後端
npm run server

# 2. 啟動前端
npm run dev

# 3. 測試設備發現
curl http://localhost:5000/discover

# 4. 檢查健康狀態
curl http://localhost:5000/health
```

### 2. 多設備測試
1. 在電腦上運行控制器
2. 在手機上打開相同頁面
3. 使用Wi-Fi掃描連接
4. 測試視頻同步播放

### 3. 網絡測試
```bash
# 測試本地網絡連接
ping 192.168.1.1
ping 192.168.1.100

# 測試端口開放
telnet 192.168.1.100 5000
```

## 性能優化

### 掃描優化
- 使用 `Promise.allSettled` 並行處理
- 限制並發請求數量（批次大小10）
- 設置合理的超時時間（3秒）
- 智能IP範圍推斷

### 錯誤處理優化
- 忽略超時錯誤，繼續掃描
- 記錄CORS錯誤但不中斷掃描
- 提供詳細的錯誤信息和解決建議

## 安全考慮

### 網絡安全
- 僅允許本地網絡訪問
- 限制掃描範圍為私有IP地址
- 實現適當的認證機制

### 數據保護
- 不存儲敏感設備信息
- 連接信息僅在會話期間有效
- 支持設備斷開和清理

## 未來改進

### 計劃功能
- [ ] 設備自動重連
- [ ] 網絡質量檢測
- [ ] 多會話支持
- [ ] 設備權限管理

### 技術優化
- [ ] WebRTC P2P連接
- [ ] 更智能的IP範圍檢測
- [ ] 設備緩存機制
- [ ] 離線模式支持

## 技術支持

### 問題反饋
如果遇到問題，請檢查：
1. 網絡連接狀態
2. 後端服務運行狀態
3. 防火牆設置
4. 瀏覽器控制台錯誤

### 調試信息
啟用詳細日誌：
```javascript
// 在WiFiScanner組件中
console.log('掃描進度:', scanProgress);
console.log('發現設備:', discoveredDevices);
console.log('網絡狀態:', isNetworkSupported);
```

## 總結

本次更新成功將藍牙連接替換為Wi-Fi連接，提供了：
- 更穩定的設備發現
- 更快的連接速度
- 更好的用戶體驗
- 更廣泛的設備兼容性

所有現有功能得到保留，UI設計完全一致，用戶可以無縫過渡到新的Wi-Fi連接方式。

