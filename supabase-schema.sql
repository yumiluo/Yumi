-- Supabase數據庫表結構
-- 在Supabase SQL編輯器中執行此腳本

-- 啟用UUID擴展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 用戶表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('controller', 'user', 'guest')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 會話表
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  join_code VARCHAR(100) UNIQUE NOT NULL,
  theme VARCHAR(255) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_by_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  current_video VARCHAR(500),
  playback_state VARCHAR(50) DEFAULT 'stopped',
  current_time DECIMAL(10,3) DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- 設備表
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  device_id VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  model VARCHAR(255),
  connection_method VARCHAR(50) DEFAULT 'network',
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'connected',
  socket_id VARCHAR(100)
);

-- 視頻表
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  type VARCHAR(50) DEFAULT 'youtube',
  duration VARCHAR(50),
  thumbnail VARCHAR(500),
  url VARCHAR(500),
  embed_url VARCHAR(500),
  country VARCHAR(100),
  tags TEXT[],
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0
);

-- 創建索引以提高查詢性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON sessions(join_code);
CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_devices_session_id ON devices(session_id);
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
CREATE INDEX IF NOT EXISTS idx_videos_added_by ON videos(added_by);

-- 創建更新時間的觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 為users表添加更新時間觸發器
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 為sessions表添加更新時間觸發器
CREATE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 為devices表添加更新時間觸發器
CREATE TRIGGER update_devices_updated_at 
  BEFORE UPDATE ON devices 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 為videos表添加更新時間觸發器
CREATE TRIGGER update_videos_updated_at 
  BEFORE UPDATE ON videos 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 啟用行級安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- 用戶表策略
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- 會話表策略
CREATE POLICY "Anyone can view active sessions" ON sessions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Users can create sessions" ON sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Session creators can update their sessions" ON sessions
  FOR UPDATE USING (created_by::text = auth.uid()::text);

-- 設備表策略
CREATE POLICY "Anyone can view devices in active sessions" ON devices
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert devices" ON devices
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update devices" ON devices
  FOR UPDATE USING (true);

-- 視頻表策略
CREATE POLICY "Anyone can view videos" ON videos
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add videos" ON videos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Video owners can update their videos" ON videos
  FOR UPDATE USING (added_by::text = auth.uid()::text);

-- 插入一些示例數據（可選）
INSERT INTO users (email, password_hash, role) VALUES 
  ('admin@vr-travel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', 'controller'),
  ('demo@vr-travel.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq', 'user')
ON CONFLICT (email) DO NOTHING;

-- 顯示表結構
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'sessions', 'devices', 'videos')
ORDER BY table_name, ordinal_position;



