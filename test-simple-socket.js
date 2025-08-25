#!/usr/bin/env node

const io = require('socket.io-client');

console.log('🧪 簡單Socket.io測試...\n');

const socket = io('http://localhost:5001', {
  transports: ['polling', 'websocket'],
  timeout: 10000,
  reconnection: false
});

// 連接事件
socket.on('connect', () => {
  console.log('✅ 連接成功');
  
  // 發送會話創建事件
  console.log('📤 發送會話創建事件...');
  socket.emit('session-created', {
    sessionId: 'test-session-123',
    joinCode: 'TEST123',
    theme: '旅遊'
  });
});

// 會話創建確認
socket.on('session-created', (data) => {
  console.log('✅ 收到會話創建確認:', data);
  
  // 發送設備加入事件
  console.log('📤 發送設備加入事件...');
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
  console.log('✅ 收到設備加入確認:', data);
  
  // 獲取設備列表
  console.log('📤 請求設備列表...');
  socket.emit('get-session-devices', { sessionCode: 'TEST123' });
});

// 設備列表響應
socket.on('session-devices', (data) => {
  console.log('✅ 收到設備列表:', data);
  socket.disconnect();
});

// 錯誤處理
socket.on('error', (error) => {
  console.log('❌ 錯誤:', error);
  socket.disconnect();
});

// 連接錯誤
socket.on('connect_error', (error) => {
  console.log('❌ 連接錯誤:', error.message);
});

// 斷開連接
socket.on('disconnect', () => {
  console.log('🔌 斷開連接');
});

// 超時處理
setTimeout(() => {
  console.log('⏰ 測試超時');
  socket.disconnect();
  process.exit(0);
}, 15000);
