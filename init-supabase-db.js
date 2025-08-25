const { createClient } = require('@supabase/supabase-js');

// Supabase配置
const supabaseUrl = 'https://vdeiwyqicpkfvqntxczj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWl3eXFpY3BrZnZxbnR4Y3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzE1NTAsImV4cCI6MjA3MTQwNzU1MH0.M-1yPcuKfNPUyAWVPCyx1hA7zEvGb-tPbwxizo96R4E';

// 創建Supabase客戶端
const supabase = createClient(supabaseUrl, supabaseKey);

// 數據庫表結構
const createTables = async () => {
  console.log('🚀 開始初始化Supabase數據庫...');
  
  try {
    // 1. 創建users表
    console.log('📝 創建users表...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('controller', 'user', 'guest')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_login TIMESTAMP WITH TIME ZONE,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    });
    
    if (usersError) {
      console.log('⚠️ users表可能已存在或創建失敗:', usersError.message);
    } else {
      console.log('✅ users表創建成功');
    }
    
    // 2. 創建sessions表
    console.log('📝 創建sessions表...');
    const { error: sessionsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
      `
    });
    
    if (sessionsError) {
      console.log('⚠️ sessions表可能已存在或創建失敗:', sessionsError.message);
    } else {
      console.log('✅ sessions表創建成功');
    }
    
    // 3. 創建devices表
    console.log('📝 創建devices表...');
    const { error: devicesError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS devices (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
      `
    });
    
    if (devicesError) {
      console.log('⚠️ devices表可能已存在或創建失敗:', devicesError.message);
    } else {
      console.log('✅ devices表創建成功');
    }
    
    // 4. 創建videos表
    console.log('📝 創建videos表...');
    const { error: videosError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS videos (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
      `
    });
    
    if (videosError) {
      console.log('⚠️ videos表可能已存在或創建失敗:', videosError.message);
    } else {
      console.log('✅ videos表創建成功');
    }
    
    // 5. 創建索引
    console.log('📝 創建索引...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_sessions_join_code ON sessions(join_code);
        CREATE INDEX IF NOT EXISTS idx_sessions_created_by ON sessions(created_by);
        CREATE INDEX IF NOT EXISTS idx_devices_session_id ON devices(session_id);
        CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);
        CREATE INDEX IF NOT EXISTS idx_videos_category ON videos(category);
        CREATE INDEX IF NOT EXISTS idx_videos_added_by ON videos(added_by);
      `
    });
    
    if (indexError) {
      console.log('⚠️ 索引創建可能失敗:', indexError.message);
    } else {
      console.log('✅ 索引創建成功');
    }
    
    // 6. 插入測試用戶
    console.log('📝 插入測試用戶...');
    const { error: insertError } = await supabase
      .from('users')
      .upsert([
        {
          email: 'admin@vr-travel.com',
          password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq',
          role: 'controller'
        },
        {
          email: 'demo@vr-travel.com',
          password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8KqKqKq',
          role: 'user'
        }
      ], { onConflict: 'email' });
    
    if (insertError) {
      console.log('⚠️ 測試用戶插入失敗:', insertError.message);
    } else {
      console.log('✅ 測試用戶插入成功');
    }
    
    console.log('🎉 Supabase數據庫初始化完成！');
    
  } catch (error) {
    console.error('❌ 數據庫初始化失敗:', error);
  }
};

// 測試連接
const testConnection = async () => {
  try {
    console.log('🔍 測試Supabase連接...');
    
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ 連接測試失敗:', error.message);
      console.log('💡 這可能是因為表還不存在，我們將創建它們...');
      return false;
    }
    
    console.log('✅ 連接測試成功');
    return true;
  } catch (error) {
    console.error('❌ 連接異常:', error);
    return false;
  }
};

// 主函數
const main = async () => {
  console.log('🚀 ========================================');
  console.log('🔧 Supabase數據庫初始化工具');
  console.log('========================================');
  
  const isConnected = await testConnection();
  
  if (!isConnected) {
    await createTables();
  } else {
    console.log('✅ 數據庫已存在，無需初始化');
  }
  
  console.log('========================================');
  console.log('🎯 初始化完成！');
  console.log('========================================');
};

// 運行主函數
main().catch(console.error);


