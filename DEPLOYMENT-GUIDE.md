# 🚀 VR系統部署指南

## 🌍 部署選項概覽

| 平台 | 難度 | 成本 | 推薦度 | 說明 |
|------|------|------|--------|------|
| **Vercel** | ⭐ | 免費 | ⭐⭐⭐⭐⭐ | 最簡單，Next.js官方支持 |
| **Netlify** | ⭐⭐ | 免費 | ⭐⭐⭐⭐ | 靜態網站部署，配置簡單 |
| **Docker** | ⭐⭐⭐ | 免費 | ⭐⭐⭐⭐ | 本地部署，完全控制 |
| **雲服務器** | ⭐⭐⭐⭐ | 付費 | ⭐⭐⭐ | 專業部署，完全控制 |

## 🚀 1. Vercel部署（推薦新手）

### 優點
- ✅ 完全免費
- ✅ 自動部署
- ✅ 全球CDN
- ✅ 自動HTTPS
- ✅ 零配置

### 步驟

#### 1.1 安裝Vercel CLI
```bash
npm install -g vercel
```

#### 1.2 登錄Vercel
```bash
vercel login
```

#### 1.3 部署
```bash
# 使用部署腳本
./deploy.sh vercel

# 或手動部署
npm run deploy:vercel
```

#### 1.4 配置自定義域名（可選）
```bash
vercel domains add your-domain.com
```

### 注意事項
- Vercel主要支持靜態網站，後端API需要額外配置
- WebSocket功能可能受限
- 適合前端展示，不適合複雜後端

---

## 🐳 2. Docker部署

### 優點
- ✅ 完全控制
- ✅ 跨平台兼容
- ✅ 易於擴展
- ✅ 支持完整功能

### 步驟

#### 2.1 安裝Docker
```bash
# macOS
brew install docker

# Ubuntu
sudo apt update
sudo apt install docker.io docker-compose
```

#### 2.2 構建和運行
```bash
# 使用部署腳本
./deploy.sh docker

# 或手動部署
npm run docker:build
npm run docker:run
```

#### 2.3 使用Docker Compose
```bash
docker-compose up -d
```

#### 2.4 查看日誌
```bash
npm run docker:logs
# 或
docker logs -f vr-system
```

---

## ☁️ 3. 雲服務器部署

### 推薦服務商
- **DigitalOcean**: $5/月，簡單易用
- **Linode**: $5/月，性能穩定
- **Vultr**: $2.5/月，價格實惠
- **阿里雲**: 國內服務器，速度快

### 步驟

#### 3.1 購買服務器
- 選擇Ubuntu 20.04 LTS
- 至少1GB RAM
- 至少25GB硬盤

#### 3.2 連接服務器
```bash
ssh root@your-server-ip
```

#### 3.3 安裝必要軟件
```bash
# 更新系統
sudo apt update && sudo apt upgrade -y

# 安裝Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安裝PM2
sudo npm install -g pm2

# 安裝Nginx
sudo apt install nginx -y
```

#### 3.4 部署應用
```bash
# 設置環境變量
export SERVER_HOST=your-server-ip
export SERVER_USER=root

# 部署
./deploy.sh server
```

#### 3.5 配置Nginx反向代理
```bash
sudo nano /etc/nginx/sites-available/vr-system
```

添加以下配置：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

啟用站點：
```bash
sudo ln -s /etc/nginx/sites-available/vr-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 3.6 配置SSL（可選）
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 4. 環境配置

### 4.1 環境變量
創建 `.env.production` 文件：
```bash
# 複製模板
cp env.production .env.production

# 編輯配置
nano .env.production
```

### 4.2 數據庫配置
如果使用Supabase：
1. 在Supabase Dashboard創建項目
2. 獲取API密鑰
3. 更新環境變量

### 4.3 域名配置
1. 購買域名（如：Godaddy、阿里雲）
2. 設置DNS記錄指向服務器IP
3. 等待DNS傳播（通常24小時）

---

## 📊 5. 監控和維護

### 5.1 使用PM2監控
```bash
# 查看進程狀態
pm2 status

# 查看日誌
pm2 logs vr-system

# 重啟服務
pm2 restart vr-system

# 設置開機自啟
pm2 startup
pm2 save
```

### 5.2 日誌管理
```bash
# 查看應用日誌
tail -f logs/app.log

# 查看Nginx日誌
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 5.3 備份策略
```bash
# 創建備份腳本
nano backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backup/vr-system"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR
tar -czf $BACKUP_DIR/vr-system-$DATE.tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    .

# 保留最近7天的備份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

---

## 🚨 6. 故障排除

### 6.1 常見問題

#### 端口被佔用
```bash
# 檢查端口
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3001

# 殺死進程
sudo kill -9 <PID>
```

#### 權限問題
```bash
# 修復文件權限
sudo chown -R $USER:$USER /path/to/vr-system
sudo chmod -R 755 /path/to/vr-system
```

#### 內存不足
```bash
# 查看內存使用
free -h

# 清理內存
sudo sync && sudo sysctl -w vm.drop_caches=3
```

### 6.2 性能優化

#### 啟用Gzip壓縮
```nginx
# 在Nginx配置中添加
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

#### 啟用緩存
```nginx
# 靜態資源緩存
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## 🎯 7. 部署檢查清單

### 部署前檢查
- [ ] 代碼已測試通過
- [ ] 環境變量已配置
- [ ] 數據庫連接正常
- [ ] 依賴已安裝

### 部署後檢查
- [ ] 網站可以正常訪問
- [ ] API端點響應正常
- [ ] WebSocket連接正常
- [ ] 數據庫操作正常
- [ ] 日誌記錄正常

### 性能檢查
- [ ] 頁面加載速度
- [ ] API響應時間
- [ ] 內存使用情況
- [ ] CPU使用情況

---

## 🆘 8. 獲取幫助

### 官方文檔
- [Next.js部署指南](https://nextjs.org/docs/deployment)
- [Vercel文檔](https://vercel.com/docs)
- [Docker文檔](https://docs.docker.com/)

### 社區支持
- [GitHub Issues](https://github.com/your-repo/issues)
- [Stack Overflow](https://stackoverflow.com/)
- [Next.js Discord](https://discord.gg/nextjs)

---

**🎉 恭喜！您的VR系統現在已經部署到公網上了！**

記得：
1. 定期備份數據
2. 監控系統性能
3. 及時更新依賴
4. 關注安全更新
