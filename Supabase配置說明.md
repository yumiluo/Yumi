# 🚀 Supabase配置說明

## 🎯 概述

本系統已成功連接到Supabase，使用PostgreSQL數據庫、實時訂閱和認證功能。

## 🔑 配置信息

### 項目URL
```
https://vdeiwyqicpkfvqntxczj.supabase.co
```

### API密鑰
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWl3eXFpY3BrZnZxbnR4Y3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzE1NTAsImV4cCI6MjA3MTQwNzU1MH0.M-1yPcuKfNPUyAWVPCyx1hA7zEvGb-tPbwxizo96R4E
```

### 密碼
```
thisismyapi
```

## 🗄️ 數據庫設置

### 1. 執行SQL腳本

在Supabase SQL編輯器中執行 `supabase-schema.sql` 腳本：

1. 登錄 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇項目 `vdeiwyqicpkfvqntxczj`
3. 點擊左側菜單 "SQL Editor"
4. 複製並粘貼 `supabase-schema.sql` 的內容
5. 點擊 "Run" 執行腳本

### 2. 表結構

腳本會創建以下表：

- **users** - 用戶表（郵箱、密碼哈希、角色）
- **sessions** - 會話表（會話ID、加入代碼、主題）
- **devices** - 設備表（設備ID、名稱、類型、型號）
- **videos** - 視頻表（標題、類別、URL、標籤）

### 3. 行級安全策略 (RLS)

腳本會自動配置安全策略：
- 用戶只能查看/修改自己的數據
- 會話對所有人可見
- 設備和視頻對所有人可見

## 🔧 前端配置

### 1. 安裝依賴

```bash
npm install @supabase/supabase-js
```

### 2. 配置文件

創建 `lib/supabase.ts`：

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vdeiwyqicpkfvqntxczj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWl3eXFpY3BrZnZxbnR4Y3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzE1NTAsImV4cCI6MjA3MTQwNzU1MH0.M-1yPcuKfNPUyAWVPCyx1hA7zEvGb-tPbwxizo96R4E';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

## 🧪 測試連接

### 1. 後端測試

```bash
# 啟動後端
npm run vr

# 檢查控制台輸出
✅ Supabase連接成功
```

### 2. API測試

```bash
# 測試註冊
curl -X POST http://localhost:5001/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'

# 測試登錄
curl -X POST http://localhost:5001/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

### 3. 前端測試

1. 訪問 http://localhost:3000
2. 點擊"沒有帳戶？點擊註冊"
3. 輸入郵箱和密碼
4. 點擊"註冊"
5. 使用相同憑據登錄

## 🔍 故障排除

### 常見問題

#### 1. 連接失敗
```
❌ Supabase連接測試失敗: [錯誤信息]
```

**解決方案：**
- 檢查網絡連接
- 確認API密鑰正確
- 檢查項目URL是否正確

#### 2. 表不存在
```
❌ 表不存在: users
```

**解決方案：**
- 執行 `supabase-schema.sql` 腳本
- 檢查表是否創建成功

#### 3. 權限錯誤
```
❌ 權限不足: [錯誤信息]
```

**解決方案：**
- 檢查RLS策略是否正確配置
- 確認用戶認證狀態

### 調試方法

#### 1. 檢查Supabase Dashboard
- 登錄 [Supabase Dashboard](https://supabase.com/dashboard)
- 查看 "Table Editor" 確認表結構
- 查看 "Logs" 檢查錯誤信息

#### 2. 檢查後端日誌
```bash
npm run vr
# 查看控制台輸出
```

#### 3. 檢查前端控制台
- 打開瀏覽器開發者工具
- 查看 Console 和 Network 標籤

## 🚀 高級功能

### 1. 實時訂閱

```typescript
// 訂閱會話變化
const subscription = supabase
  .channel('sessions')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'sessions' },
    (payload) => {
      console.log('會話變化:', payload);
    }
  )
  .subscribe();
```

### 2. 存儲功能

```typescript
// 上傳文件
const { data, error } = await supabase.storage
  .from('videos')
  .upload('video.mp4', file);
```

### 3. 認證功能

```typescript
// 獲取當前用戶
const { data: { user } } = await supabase.auth.getUser();

// 登出
await supabase.auth.signOut();
```

## 📊 監控和維護

### 1. 數據庫性能
- 使用 Supabase Dashboard 監控查詢性能
- 檢查慢查詢和索引使用情況

### 2. 存儲使用
- 監控數據庫存儲使用量
- 定期清理過期數據

### 3. 用戶管理
- 監控用戶註冊和登錄情況
- 檢查異常登錄行為

## 🎉 總結

Supabase配置已完成，系統現在具備：

- ✅ **PostgreSQL數據庫**：高性能、可擴展
- ✅ **實時訂閱**：即時數據同步
- ✅ **行級安全**：數據安全保護
- ✅ **認證系統**：用戶管理
- ✅ **存儲功能**：文件上傳下載
- ✅ **API接口**：RESTful API

現在您可以享受完整的雲端數據庫功能！🎯



