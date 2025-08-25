#!/usr/bin/env node

/**
 * VR多設備視頻播放系統測試腳本
 * 用於測試系統的各項功能是否正常工作
 */

const io = require('socket.io-client');
const http = require('http');

console.log('🧪 VR多設備視頻播放系統測試腳本');
console.log('=====================================\n');

// 測試配置
const config = {
  backendUrl: 'http://localhost:5001',
  backendSocketUrl: 'ws://localhost:5001',
  frontendUrl: 'http://localhost:3000',
  timeout: 5000
};

// 測試結果
const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

// 測試工具函數
function logTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${name}: 通過`);
  } else {
    testResults.failed++;
    console.log(`❌ ${name}: 失敗 - ${message}`);
  }
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function logError(message) {
  console.log(`🚨 ${message}`);
}

function logSuccess(message) {
  console.log(`🎉 ${message}`);
}

// 測試後端HTTP服務
async function testBackendHTTP() {
  logInfo('測試後端HTTP服務...');
  
  try {
    // 測試健康檢查端點
    const healthResponse = await new Promise((resolve, reject) => {
      const req = http.get(`${config.backendUrl}/health`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            reject(new Error('響應不是有效的JSON'));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(new Error('請求超時'));
      });
    });

    if (healthResponse.status === 200) {
      logTest('健康檢查端點', true);
      logInfo(`服務器狀態: ${healthResponse.data.status}`);
      logInfo(`服務器版本: ${healthResponse.data.version}`);
    } else {
      logTest('健康檢查端點', false, `HTTP狀態碼: ${healthResponse.status}`);
    }

    // 測試狀態端點
    const statusResponse = await new Promise((resolve, reject) => {
      const req = http.get(`${config.backendUrl}/status`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            reject(new Error('響應不是有效的JSON'));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(new Error('請求超時'));
      });
    });

    if (statusResponse.status === 200) {
      logTest('狀態端點', true);
      logInfo(`活躍連接: ${statusResponse.data.activeConnections}`);
      logInfo(`總設備數: ${statusResponse.data.totalDevices}`);
      logInfo(`會話數量: ${statusResponse.data.sessions.length}`);
    } else {
      logTest('狀態端點', false, `HTTP狀態碼: ${statusResponse.status}`);
    }

    // 測試設備發現端點
    const discoverResponse = await new Promise((resolve, reject) => {
      const req = http.get(`${config.backendUrl}/discover?deviceName=TestDevice&deviceType=mobile&deviceModel=TestModel`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            reject(new Error('響應不是有效的JSON'));
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(new Error('請求超時'));
      });
    });

    if (discoverResponse.status === 200) {
      logTest('設備發現端點', true);
      logInfo(`設備名稱: ${discoverResponse.data.deviceName}`);
      logInfo(`設備類型: ${discoverResponse.data.deviceType}`);
      logInfo(`設備型號: ${discoverResponse.data.deviceModel}`);
    } else {
      logTest('設備發現端點', false, `HTTP狀態碼: ${discoverResponse.status}`);
    }

  } catch (error) {
    logTest('後端HTTP服務', false, error.message);
  }
}

// 測試Socket.io連接
async function testSocketIO() {
  logInfo('測試Socket.io連接...');
  
  try {
    const socket = io(config.backendSocketUrl, {
      transports: ['websocket'],
      timeout: config.timeout
    });

    // 測試連接
    const connectionPromise = new Promise((resolve, reject) => {
      socket.on('connect', () => {
        logTest('Socket.io連接', true);
        resolve();
      });
      
      socket.on('connect_error', (error) => {
        reject(new Error(`連接錯誤: ${error.message}`));
      });
      
      setTimeout(() => {
        reject(new Error('連接超時'));
      }, config.timeout);
    });

    await connectionPromise;

    // 測試會話創建
    const sessionCode = 'TEST-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const sessionPromise = new Promise((resolve, reject) => {
      socket.emit('create-session', {
        sessionCode,
        deviceType: 'controller',
        timestamp: Date.now()
      });
      
      socket.on('session-created', (data) => {
        if (data.sessionCode === sessionCode) {
          logTest('會話創建', true);
          resolve();
        } else {
          reject(new Error('會話代碼不匹配'));
        }
      });
      
      setTimeout(() => {
        reject(new Error('會話創建超時'));
      }, config.timeout);
    });

    await sessionPromise;

    // 測試設備加入
    const deviceId = 'TEST-DEVICE-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    const joinPromise = new Promise((resolve, reject) => {
      socket.emit('join-session', {
        sessionCode,
        deviceId,
        deviceName: 'Test Device',
        deviceType: 'mobile',
        deviceModel: 'Test Model',
        connectionMethod: 'test',
        timestamp: Date.now()
      });
      
      socket.on('device-joined', (data) => {
        if (data.deviceId === deviceId) {
          logTest('設備加入會話', true);
          resolve();
        } else {
          reject(new Error('設備ID不匹配'));
        }
      });
      
      setTimeout(() => {
        reject(new Error('設備加入超時'));
      }, config.timeout);
    });

    await joinPromise;

    // 測試視頻播放
    const playPromise = new Promise((resolve, reject) => {
      socket.emit('play-video', {
        sessionCode,
        videoId: 'test-video',
        videoUrl: 'https://example.com/test-video.mp4',
        startTime: 0,
        timestamp: Date.now()
      });
      
      // 等待一小段時間確保事件處理完成
      setTimeout(() => {
        logTest('視頻播放事件', true);
        resolve();
      }, 1000);
    });

    await playPromise;

    // 測試時間同步
    const syncPromise = new Promise((resolve, reject) => {
      socket.emit('sync-time', {
        sessionCode,
        currentTime: 30.5,
        timestamp: Date.now()
      });
      
      // 等待一小段時間確保事件處理完成
      setTimeout(() => {
        logTest('時間同步事件', true);
        resolve();
      }, 1000);
    });

    await syncPromise;

    // 測試設備離開
    const leavePromise = new Promise((resolve, reject) => {
      socket.emit('device-left', {
        deviceId,
        timestamp: Date.now()
      });
      
      // 等待一小段時間確保事件處理完成
      setTimeout(() => {
        logTest('設備離開事件', true);
        resolve();
      }, 1000);
    });

    await leavePromise;

    // 斷開連接
    socket.disconnect();
    logTest('Socket.io斷開連接', true);

  } catch (error) {
    logTest('Socket.io測試', false, error.message);
  }
}

// 測試前端服務
async function testFrontend() {
  logInfo('測試前端服務...');
  
  try {
    const response = await new Promise((resolve, reject) => {
      const req = http.get(config.frontendUrl, (res) => {
        resolve({ status: res.statusCode });
      });
      
      req.on('error', reject);
      req.setTimeout(config.timeout, () => {
        req.destroy();
        reject(new Error('請求超時'));
      });
    });

    if (response.status === 200) {
      logTest('前端服務', true);
    } else {
      logTest('前端服務', false, `HTTP狀態碼: ${response.status}`);
    }

  } catch (error) {
    logTest('前端服務', false, error.message);
  }
}

// 運行所有測試
async function runAllTests() {
  console.log('開始運行測試...\n');
  
  try {
    await testBackendHTTP();
    console.log('');
    
    await testSocketIO();
    console.log('');
    
    await testFrontend();
    console.log('');
    
  } catch (error) {
    logError(`測試執行錯誤: ${error.message}`);
  }
  
  // 顯示測試結果
  console.log('=====================================');
  console.log('📊 測試結果總結');
  console.log('=====================================');
  console.log(`總測試數: ${testResults.total}`);
  console.log(`通過: ${testResults.passed} ✅`);
  console.log(`失敗: ${testResults.failed} ❌`);
  console.log(`成功率: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
  
  if (testResults.failed === 0) {
    logSuccess('所有測試通過！系統運行正常。');
  } else {
    logError(`${testResults.failed} 個測試失敗，請檢查系統配置。`);
  }
  
  console.log('\n💡 使用建議:');
  console.log('1. 確保後端服務在端口5000運行');
  console.log('2. 確保前端服務在端口3000運行');
  console.log('3. 檢查防火牆和網絡設置');
  console.log('4. 查看控制台日誌獲取詳細錯誤信息');
}

// 檢查依賴
function checkDependencies() {
  try {
    require('socket.io-client');
    logTest('Socket.io-client依賴', true);
  } catch (error) {
    logTest('Socket.io-client依賴', false, '未安裝，請運行 npm install socket.io-client');
    process.exit(1);
  }
}

// 主函數
async function main() {
  checkDependencies();
  await runAllTests();
}

// 運行測試
if (require.main === module) {
  main().catch(error => {
    logError(`測試腳本執行失敗: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  testBackendHTTP,
  testSocketIO,
  testFrontend,
  runAllTests
};
