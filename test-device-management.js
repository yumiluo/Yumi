#!/usr/bin/env node

const axios = require('axios');
const io = require('socket.io-client');

const BASE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3000';

console.log('🧪 測試修復後的設備管理功能...\n');

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

// 測試Socket.io連接和設備管理
async function testSocketIODeviceManagement() {
  console.log('🔍 測試Socket.io設備管理...');
  
  return new Promise((resolve) => {
    const socket = io(BASE_URL, {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: false
    });

    let testResults = {
      connection: false,
      sessionCreation: false,
      deviceJoin: false,
      deviceList: false
    };

    // 連接事件
    socket.on('connect', () => {
      console.log('✅ Socket.io連接成功');
      testResults.connection = true;
      
      // 測試會話創建
      socket.emit('session-created', {
        sessionId: 'test-session-123',
        joinCode: 'TEST123',
        theme: '旅遊'
      });
    });

    // 會話創建確認
    socket.on('session-created', (data) => {
      console.log('✅ 會話創建確認成功:', data.joinCode);
      testResults.sessionCreation = true;
      
      // 測試設備加入
      socket.emit('join-session', {
        joinCode: 'TEST123',
        deviceId: 'test-device-456',
        deviceName: 'Test iPhone',
        deviceType: 'mobile',
        deviceModel: 'iPhone 14',
        connectionMethod: 'wifi'
      });
    });

    // 設備加入確認
    socket.on('device-joined', (data) => {
      console.log('✅ 設備加入成功:', data);
      testResults.deviceJoin = true;
      
      // 測試獲取設備列表
      socket.emit('get-session-devices', { sessionCode: 'TEST123' });
    });

    // 設備列表響應
    socket.on('session-devices', (data) => {
      console.log('✅ 獲取設備列表成功:', data);
      testResults.deviceList = true;
      
      // 測試完成，關閉連接
      socket.disconnect();
      resolve(testResults);
    });

    // 錯誤處理
    socket.on('error', (error) => {
      console.log('❌ Socket.io錯誤:', error);
      socket.disconnect();
      resolve(testResults);
    });

    // 連接錯誤
    socket.on('connect_error', (error) => {
      console.log('❌ Socket.io連接錯誤:', error.message);
      resolve(testResults);
    });

    // 超時處理
    setTimeout(() => {
      console.log('⏰ Socket.io測試超時');
      socket.disconnect();
      resolve(testResults);
    }, 10000);
  });
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
    
    // 測試2: 模擬手機User-Agent
    const response2 = await axios.get(`${BASE_URL}/api/discover`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
      }
    });
    console.log('✅ 手機User-Agent檢測成功:');
    console.log('   檢測到的設備類型:', response2.data.deviceType);
    console.log('   檢測到的設備型號:', response2.data.deviceModel);
    
    return true;
  } catch (error) {
    console.log('❌ 設備發現測試失敗:', error.message);
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
  console.log('🚀 開始設備管理功能測試...\n');
  
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
  
  // 測試Socket.io設備管理
  console.log('\n🔌 測試Socket.io設備管理...');
  const socketResults = await testSocketIODeviceManagement();
  
  console.log('\n📊 Socket.io測試結果:');
  console.log('   連接:', socketResults.connection ? '✅' : '❌');
  console.log('   會話創建:', socketResults.sessionCreation ? '✅' : '❌');
  console.log('   設備加入:', socketResults.deviceJoin ? '✅' : '❌');
  console.log('   設備列表:', socketResults.deviceList ? '✅' : '❌');
  
  console.log('\n🎯 設備管理功能測試完成！');
  console.log('💡 現在你可以在前端測試設備管理功能了');
  console.log('📱 手機測試地址: http://192.168.31.207:3000');
  console.log('🔧 設備列表會實時更新，顯示真實連接的設備');
}

// 運行測試
runTests().catch(console.error);
