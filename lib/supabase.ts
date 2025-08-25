import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdeiwyqicpkfvqntxczj.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWl3eXFpY3BrZnZxbnR4Y3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzE1NTAsImV4cCI6MjA3MTQwNzU1MH0.M-1yPcuKfNPUyAWVPCyx1hA7zEvGb-tPbwxizo96R4E'
const supabase = createClient(supabaseUrl, supabaseKey)

// 數據庫表名
export const TABLES = {
  USERS: 'users',
  SESSIONS: 'sessions',
  DEVICES: 'devices',
  VIDEOS: 'videos'
} as const;

// 用戶角色
export const USER_ROLES = {
  CONTROLLER: 'controller',
  USER: 'user',
  GUEST: 'guest'
} as const;

// 導出類型
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// 測試連接
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from(TABLES.USERS).select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase連接測試失敗:', error);
      return false;
    }
    
    console.log('✅ Supabase連接成功');
    return true;
  } catch (error) {
    console.error('❌ Supabase連接異常:', error);
    return false;
  }
}

export { supabase };
export default supabase;

