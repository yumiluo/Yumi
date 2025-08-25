const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vdeiwyqicpkfvqntxczj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWl3eXFpY3BrZnZxbnR4Y3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzE1NTAsImV4cCI6MjA3MTQwNzU1MH0.M-1yPcuKfNPUyAWVPCyx1hA7zEvGb-tPbwxizo96R4E';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 測試Supabase連接...');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseKey.substring(0, 20) + '...');
    
    // 測試基本連接
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ 連接失敗:', error.message);
      console.log('💡 這表示表還不存在，需要在Supabase Dashboard中創建');
      return false;
    }
    
    console.log('✅ 連接成功！');
    console.log('📊 用戶數據:', data);
    return true;
  } catch (error) {
    console.error('❌ 連接異常:', error);
    return false;
  }
}

console.log('🚀 Supabase連接測試');
console.log('========================================');
testConnection().then(() => {
  console.log('========================================');
  console.log('🎯 測試完成！');
});


