# 🗄️ MongoDB Atlas 配置說明

## 📋 配置步驟

### 1. **創建MongoDB Atlas帳戶**
1. 訪問 [MongoDB Atlas](https://www.mongodb.com/atlas)
2. 註冊免費帳戶
3. 創建新集群（選擇免費層 M0）

### 2. **獲取連接字符串**
1. 在集群頁面點擊"Connect"
2. 選擇"Connect your application"
3. 複製連接字符串

### 3. **配置環境變量**
創建 `.env` 文件在項目根目錄：

```bash
# MongoDB Atlas連接URI
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.mongodb.net/vr-travel?retryWrites=true&w=majority

# JWT密鑰
JWT_SECRET=your-super-secret-jwt-key-here

# 服務器端口
PORT=5001
```

### 4. **替換連接字符串**
將 `your-username` 和 `your-password` 替換為您的實際MongoDB Atlas用戶名和密碼。

## 🔧 測試連接

### 方法1：使用MongoDB Compass
1. 下載 [MongoDB Compass](https://www.mongodb.com/products/compass)
2. 使用連接字符串連接
3. 檢查是否能看到 `vr-travel` 數據庫

### 方法2：使用命令行
```bash
# 測試連接
curl -X POST http://localhost:5001/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## 🚨 常見問題

### 1. **連接失敗**
- 檢查用戶名和密碼是否正確
- 確認IP地址是否在白名單中
- 檢查網絡連接

### 2. **權限錯誤**
- 確認用戶有讀寫權限
- 檢查數據庫名稱是否正確

### 3. **超時錯誤**
- 檢查網絡延遲
- 確認MongoDB Atlas服務狀態

## 📊 數據庫結構

### Users 集合
```json
{
  "_id": "ObjectId",
  "email": "user@example.com",
  "password": "hashed_password",
  "role": "user|controller",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "lastLogin": "2024-01-01T00:00:00.000Z"
}
```

### Sessions 集合（內存存儲，可選持久化）
```json
{
  "id": "SESSION-123",
  "joinCode": "JOIN-ABC",
  "theme": "Paris Tour",
  "createdBy": "user_id",
  "createdByEmail": "user@example.com",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "devices": [],
  "currentVideo": null,
  "playbackState": "stopped",
  "currentTime": 0
}
```

## 🎯 下一步

配置完成後，您可以：
1. 啟動後端服務器
2. 測試註冊和登錄功能
3. 創建會話並測試設備連接
4. 測試YouTube 360°視頻同步播放

## 🔐 安全建議

1. **使用強密碼**：至少12個字符，包含大小寫字母、數字和特殊字符
2. **定期更換密鑰**：定期更換JWT_SECRET
3. **限制IP訪問**：在MongoDB Atlas中限制IP訪問範圍
4. **監控訪問**：定期檢查數據庫訪問日誌



