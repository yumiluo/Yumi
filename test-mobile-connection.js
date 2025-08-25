#!/usr/bin/env node

const axios = require('axios');

const COMPUTER_IP = '192.168.31.207';
const FRONTEND_PORT = 3000;
const BACKEND_PORT = 5001;

console.log('📱 手機連接測試腳本\n');

console.log('🌐 連接信息:');
console.log(`電腦IP地址: ${COMPUTER_IP}`);
console.log(`前端地址: http://${COMPUTER_IP}:${FRONTEND_PORT}`);
console.log(`後端地址: http://${COMPUTER_IP}:${BACKEND_PORT}\n`);

// 測試後端連接
async function testBackendConnection() {
  console.log('🔍 測試後端連接...');
  try {
    const response = await axios.get(`http://${COMPUTER_IP}:${BACKEND_PORT}/api/health`, {
      timeout: 5000
    });
    console.log('✅ 後端連接成功:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ 後端連接失敗:', error.message);
    return false;
  }
}

// 測試前端連接
async function testFrontendConnection() {
  console.log('🔍 測試前端連接...');
  try {
    const response = await axios.get(`http://${COMPUTER_IP}:${FRONTEND_PORT}`, {
      timeout: 10000
    });
    if (response.status === 200) {
      console.log('✅ 前端連接成功 (狀態碼:', response.status, ')');
      return true;
    } else {
      console.log('❌ 前端連接失敗 (狀態碼:', response.status, ')');
      return false;
    }
  } catch (error) {
    console.log('❌ 前端連接失敗:', error.message);
    return false;
  }
}

// 測試網絡延遲
async function testNetworkLatency() {
  console.log('🔍 測試網絡延遲...');
  const startTime = Date.now();
  try {
    await axios.get(`http://${COMPUTER_IP}:${BACKEND_PORT}/api/health`, {
      timeout: 5000
    });
    const latency = Date.now() - startTime;
    console.log(`✅ 網絡延遲: ${latency}ms`);
    if (latency < 100) {
      console.log('   🟢 延遲很低，適合實時同步');
    } else if (latency < 300) {
      console.log('   🟡 延遲適中，同步效果良好');
    } else {
      console.log('   🔴 延遲較高，可能影響同步效果');
    }
    return latency;
  } catch (error) {
    console.log('❌ 無法測試網絡延遲:', error.message);
    return null;
  }
}

// 生成手機測試指令
function generateMobileInstructions() {
  console.log('\n📱 手機測試指令:');
  console.log('1. 確保手機和電腦連接同一個Wi-Fi');
  console.log('2. 打開手機瀏覽器');
  console.log('3. 輸入地址:', `http://${COMPUTER_IP}:${FRONTEND_PORT}`);
  console.log('4. 測試以下功能:');
  console.log('   - 頁面加載');
  console.log('   - 用戶註冊');
  console.log('   - 用戶登錄');
  console.log('   - 會話創建');
  console.log('   - 會話加入');
  console.log('   - 視頻同步');
}

// 主測試函數
async function runMobileTests() {
  console.log('🚀 開始手機連接測試...\n');
  
  // 測試後端
  const backendOk = await testBackendConnection();
  if (!backendOk) {
    console.log('\n❌ 後端連接失敗，手機無法使用系統');
    return;
  }
  
  // 測試前端
  const frontendOk = await testFrontendConnection();
  if (!frontendOk) {
    console.log('\n❌ 前端連接失敗，手機無法訪問界面');
    return;
  }
  
  // 測試網絡延遲
  await testNetworkLatency();
  
  console.log('\n✅ 所有連接測試通過！');
  console.log('📱 手機可以正常使用系統');
  
  // 生成測試指令
  generateMobileInstructions();
  
  console.log('\n🎯 測試完成！');
  console.log('💡 現在可以用手機測試系統功能了');
}

// 運行測試
runMobileTests().catch(console.error);
