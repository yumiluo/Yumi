#!/usr/bin/env node

const io = require('socket.io-client');

console.log('🧪 測試設備顯示功能...\n');

// 測試1: 連接Socket.io
console.log('1️⃣ 測試Socket.io連接...');
const socket = io('http://localhost:5001', {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  reconnection: false
});

let testPassed = 0;
let testTotal = 0;

socket.on('connect', () => {
  console.log('✅ Socket.io連接成功');
  testPassed++;
  testTotal++;
  
  // 測試2: 創建會話
  console.log('\n2️⃣ 測試會話創建...');
  socket.emit('session-created', {
    sessionId: 'test-session-display',
    joinCode: 'DISPLAY123',
    theme: '設備顯示測試'
  });
});

// 測試3: 會話創建確認
socket.on('session-created', (data) => {
  console.log('✅ 會話創建確認:', data);
  testPassed++;
  testTotal++;
  
  // 測試4: 模擬設備加入
  console.log('\n3️⃣ 測試設備加入...');
  socket.emit('join-session', {
    joinCode: 'DISPLAY123',
    deviceId: 'test-iphone-001',
    deviceName: 'Test iPhone',
    deviceType: 'mobile',
    deviceModel: 'iPhone 14',
    connectionMethod: 'wifi'
  });
});

// 測試5: 設備加入確認
socket.on('device-joined', (data) => {
  console.log('✅ 設備加入確認:', data);
  testPassed++;
  testTotal++;
  
  // 測試6: 獲取設備列表
  console.log('\n4️⃣ 測試獲取設備列表...');
  socket.emit('get-session-devices', { sessionCode: 'DISPLAY123' });
});

// 測試7: 設備列表響應
socket.on('session-devices', (data) => {
  console.log('✅ 收到設備列表:', data);
  testPassed++;
  testTotal++;
  
  if (data.devices && data.devices.length > 0) {
    console.log('📱 設備列表內容:');
    data.devices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.deviceName} (${device.deviceModel}) - ${device.deviceType}`);
    });
  } else {
    console.log('⚠️  設備列表為空');
  }
  
  // 測試8: 模擬第二個設備加入
  console.log('\n5️⃣ 測試第二個設備加入...');
  socket.emit('join-session', {
    joinCode: 'DISPLAY123',
    deviceId: 'test-vr-002',
    deviceName: 'Test VR Headset',
    deviceType: 'vr',
    deviceModel: 'Meta Quest 3',
    connectionMethod: 'wifi'
  });
});

// 測試9: 第二個設備加入確認
socket.on('device-joined', (data) => {
  if (data.deviceId === 'test-vr-002') {
    console.log('✅ 第二個設備加入確認:', data);
    testPassed++;
    testTotal++;
    
    // 測試10: 再次獲取設備列表
    console.log('\n6️⃣ 測試更新後的設備列表...');
    setTimeout(() => {
      socket.emit('get-session-devices', { sessionCode: 'DISPLAY123' });
    }, 1000);
  }
});

// 測試11: 更新的設備列表
socket.on('session-devices', (data) => {
  if (data.devices && data.devices.length >= 2) {
    console.log('✅ 設備列表已更新，包含2個設備');
    testPassed++;
    testTotal++;
    
    console.log('📱 最終設備列表:');
    data.devices.forEach((device, index) => {
      console.log(`   ${index + 1}. ${device.deviceName} (${device.deviceModel}) - ${device.deviceType}`);
    });
    
    // 測試完成
    console.log('\n🎉 所有測試完成！');
    console.log(`📊 測試結果: ${testPassed}/${testTotal} 通過`);
    
    if (testPassed === testTotal) {
      console.log('✅ 設備顯示功能測試通過！');
      console.log('💡 現在可以在前端查看設備列表了');
    } else {
      console.log('❌ 部分測試失敗，請檢查後端邏輯');
    }
    
    socket.disconnect();
    process.exit(0);
  }
});

// 錯誤處理
socket.on('error', (error) => {
  console.log('❌ Socket.io錯誤:', error);
  testTotal++;
});

socket.on('connect_error', (error) => {
  console.log('❌ 連接錯誤:', error.message);
  testTotal++;
});

// 斷開連接
socket.on('disconnect', () => {
  console.log('🔌 斷開連接');
});

// 超時處理
setTimeout(() => {
  console.log('⏰ 測試超時');
  console.log(`📊 測試結果: ${testPassed}/${testTotal} 通過`);
  socket.disconnect();
  process.exit(1);
}, 20000);
