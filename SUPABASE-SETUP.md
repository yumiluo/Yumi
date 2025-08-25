# 🚀 Supabase設置指南

## 快速設置步驟

1. 訪問 https://supabase.com/dashboard
2. 選擇項目：`vdeiwyqicpkfvqntxczj`
3. 點擊左側 "SQL Editor"
4. 執行以下SQL：

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  join_code VARCHAR(100) UNIQUE NOT NULL,
  theme VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_by_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO users (email, password_hash, role) VALUES 
  ('admin@vr-travel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', 'controller');
```

5. 點擊 "Run" 執行
6. 完成後測試連接：`node init-supabase-db.js`


