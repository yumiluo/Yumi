#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3000';

console.log('🧪 測試修復後的設備掃描功能...\n');

// 測試後端健康檢查
async function testBackendHealth() {
  console.log('🔍 測試後端健康檢查...');
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ 後端健康檢查成功:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ 後端健康檢查失敗:', error.message);
    return false;
  }
}

// 測試設備發現API
async function testDeviceDiscovery() {
  console.log('🔍 測試設備發現API...');
  try {
    // 測試1: 默認請求
    const response1 = await axios.get(`${BASE_URL}/api/discover`);
    console.log('✅ 默認設備發現成功:');
    console.log('   設備名稱:', response1.data.deviceName);
    console.log('   設備類型:', response1.data.deviceType);
    console.log('   設備型號:', response1.data.deviceModel);
    console.log('   狀態:', response1.data.status);
    
    // 測試2: 帶參數的請求
    const response2 = await axios.get(`${BASE_URL}/api/discover`, {
      params: {
        deviceName: 'Test iPhone',
        deviceType: 'mobile',
        deviceModel: 'iPhone 14'
      }
    });
    console.log('✅ 參數化設備發現成功:');
    console.log('   設備名稱:', response2.data.deviceName);
    console.log('   設備類型:', response2.data.deviceType);
    console.log('   設備型號:', response2.data.deviceModel);
    
    // 測試3: 模擬手機User-Agent
    const response3 = await axios.get(`${BASE_URL}/api/discover`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      }
    });
    console.log('✅ 手機User-Agent檢測成功:');
    console.log('   檢測到的設備類型:', response3.data.deviceType);
    console.log('   檢測到的設備型號:', response3.data.deviceModel);
    
    // 測試4: 模擬VR設備User-Agent
    const response4 = await axios.get(`${BASE_URL}/api/discover`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; Quest 2) AppleWebKit/537.36 (KHTML, like Gecko) OculusBrowser/15.0.0.2.30.0'
      }
    });
    console.log('✅ VR設備User-Agent檢測成功:');
    console.log('   檢測到的設備類型:', response4.data.deviceType);
    console.log('   檢測到的設備型號:', response4.data.deviceModel);
    
    return true;
  } catch (error) {
    console.log('❌ 設備發現測試失敗:', error.message);
    return false;
  }
}

// 測試前端連接
async function testFrontend() {
  console.log('🔍 測試前端連接...');
  try {
    const response = await axios.get(FRONTEND_URL);
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

// 測試網絡掃描模擬
async function testNetworkScanSimulation() {
  console.log('🔍 測試網絡掃描模擬...');
  try {
    // 模擬掃描多個IP地址
    const testIPs = ['localhost', '127.0.0.1', '192.168.31.207'];
    const results = [];
    
    for (const ip of testIPs) {
      try {
        const response = await axios.get(`http://${ip}:5001/api/discover`, {
          timeout: 1000
        });
        results.push({
          ip,
          success: true,
          device: response.data
        });
      } catch (error) {
        results.push({
          ip,
          success: false,
          error: error.message
        });
      }
    }
    
    console.log('✅ 網絡掃描模擬完成:');
    results.forEach(result => {
      if (result.success) {
        console.log(`   ${result.ip}: ✅ 發現設備 - ${result.device.deviceName} (${result.device.deviceType})`);
      } else {
        console.log(`   ${result.ip}: ❌ 無法連接 - ${result.error}`);
      }
    });
    
    return true;
  } catch (error) {
    console.log('❌ 網絡掃描模擬失敗:', error.message);
    return false;
  }
}

// 主測試函數
async function runTests() {
  console.log('🚀 開始設備掃描功能測試...\n');
  
  // 測試後端
  const backendOk = await testBackendHealth();
  if (!backendOk) {
    console.log('\n❌ 後端測試失敗，停止測試');
    return;
  }
  
  // 測試前端
  const frontendOk = await testFrontend();
  if (!frontendOk) {
    console.log('\n❌ 前端測試失敗，停止測試');
    return;
  }
  
  console.log('\n✅ 基礎服務測試通過！\n');
  
  // 測試設備發現
  await testDeviceDiscovery();
  
  // 測試網絡掃描模擬
  await testNetworkScanSimulation();
  
  console.log('\n🎯 設備掃描功能測試完成！');
  console.log('💡 現在你可以在前端測試設備掃描功能了');
  console.log('📱 手機測試地址: http://192.168.31.207:3000');
}

// 運行測試
runTests().catch(console.error);
