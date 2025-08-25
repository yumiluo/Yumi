#!/usr/bin/env node

// Wi-Fi掃描測試腳本
const http = require('http');

console.log('🧪 Wi-Fi掃描測試腳本');
console.log('====================');

// 測試的IP範圍
const testIPs = [
  '192.168.31.1',   // 網關
  '192.168.31.2',   // 常見設備
  '192.168.31.10',  // 常見設備
  '192.168.31.100', // 常見設備
  '192.168.31.200', // 常見設備
  '192.168.31.207', // 您的設備
  '192.168.31.254', // 常見設備
  '192.168.31.255'  // 廣播地址
];

const PORT = 3001;
const TIMEOUT = 3000;

async function testIP(ip) {
  return new Promise((resolve) => {
    const options = {
      hostname: ip,
      port: PORT,
      path: '/discover',
      method: 'GET',
      timeout: TIMEOUT
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            resolve({
              ip,
              status: 'success',
              data: response,
              statusCode: res.statusCode
            });
          } catch (e) {
            resolve({
              ip,
              status: 'error',
              error: 'Invalid JSON response',
              statusCode: res.statusCode
            });
          }
        } else {
          resolve({
            ip,
            status: 'error',
            error: `HTTP ${res.statusCode}`,
            statusCode: res.statusCode
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({
        ip,
        status: 'error',
        error: err.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ip,
        status: 'timeout',
        error: 'Request timeout'
      });
    });

    req.end();
  });
}

async function runTest() {
  console.log(`\n🔍 開始測試端口 ${PORT} 的設備發現...`);
  console.log(`📡 測試IP範圍: ${testIPs.join(', ')}`);
  console.log(`⏱️  超時設置: ${TIMEOUT}ms`);
  console.log('');

  const results = [];
  
  for (const ip of testIPs) {
    console.log(`正在測試 ${ip}...`);
    const result = await testIP(ip);
    results.push(result);
    
    if (result.status === 'success') {
      console.log(`✅ ${ip}: 成功 - ${result.data.deviceName}`);
    } else if (result.status === 'timeout') {
      console.log(`⏰ ${ip}: 超時`);
    } else {
      console.log(`❌ ${ip}: 失敗 - ${result.error}`);
    }
    
    // 小延遲避免過於激進
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 測試結果總結:');
  console.log('====================');
  
  const successful = results.filter(r => r.status === 'success');
  const failed = results.filter(r => r.status !== 'success');
  
  console.log(`✅ 成功: ${successful.length}`);
  console.log(`❌ 失敗: ${failed.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 發現的設備:');
    successful.forEach(result => {
      console.log(`   📱 ${result.ip}: ${result.data.deviceName} (${result.data.deviceType})`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n⚠️  失敗的連接:');
    failed.forEach(result => {
      console.log(`   ❌ ${result.ip}: ${result.error}`);
    });
  }

  console.log('\n💡 建議:');
  if (successful.length === 0) {
    console.log('   • 檢查後端服務是否正在運行');
    console.log('   • 確認防火牆設置');
    console.log('   • 檢查網絡配置');
    console.log('   • 嘗試使用localhost:3001測試');
  } else {
    console.log('   • 後端服務正常運行');
    console.log('   • 可以進行Wi-Fi設備掃描');
  }
}

// 運行測試
runTest().catch(console.error);

