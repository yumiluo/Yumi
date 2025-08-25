#!/usr/bin/env node

// 真實Wi-Fi連接測試腳本
const http = require('http');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🌐 真實Wi-Fi連接測試腳本');
console.log('========================');

const PORT = 3001;
const TIMEOUT = 2000;

// 獲取本地IP地址
async function getLocalIP() {
  try {
    const { stdout } = await execAsync('ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1');
    const match = stdout.match(/inet\s+(\d+\.\d+\.\d+\.\d+)/);
    if (match) {
      return match[1];
    }
  } catch (error) {
    console.log('無法獲取本地IP地址');
  }
  return null;
}

// 掃描單個IP
async function scanIP(ip) {
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

// 掃描網絡範圍
async function scanNetwork(baseIP) {
  console.log(`\n🔍 掃描網絡 ${baseIP}.x`);
  console.log('====================');
  
  const results = [];
  const testIPs = [1, 2, 10, 100, 200, 207, 254, 255];
  
  for (const i of testIPs) {
    const ip = `${baseIP}.${i}`;
    console.log(`正在測試 ${ip}...`);
    
    const result = await scanIP(ip);
    results.push(result);
    
    if (result.status === 'success') {
      console.log(`✅ ${ip}: 成功 - ${result.data.deviceName}`);
    } else if (result.status === 'timeout') {
      console.log(`⏰ ${ip}: 超時`);
    } else {
      console.log(`❌ ${ip}: ${result.error}`);
    }
    
    // 小延遲
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// 主測試函數
async function runTest() {
  console.log(`📡 開始測試端口 ${PORT} 的設備發現...`);
  console.log(`⏱️  超時設置: ${TIMEOUT}ms`);
  
  // 獲取本地IP
  const localIP = await getLocalIP();
  if (localIP) {
    console.log(`📍 檢測到本地IP: ${localIP}`);
    
    // 提取網絡範圍
    const networkParts = localIP.split('.');
    const baseNetwork = `${networkParts[0]}.${networkParts[1]}.${networkParts[2]}`;
    console.log(`🌐 網絡範圍: ${baseNetwork}.x`);
    
    // 測試localhost
    console.log('\n🔍 測試localhost連接...');
    const localhostResult = await scanIP('localhost');
    if (localhostResult.status === 'success') {
      console.log(`✅ localhost: 成功 - ${localhostResult.data.deviceName}`);
    } else {
      console.log(`❌ localhost: ${localhostResult.error}`);
    }
    
    // 掃描本地網絡
    const networkResults = await scanNetwork(baseNetwork);
    
    // 總結結果
    console.log('\n📊 測試結果總結:');
    console.log('====================');
    
    const allResults = [localhostResult, ...networkResults];
    const successful = allResults.filter(r => r.status === 'success');
    const failed = allResults.filter(r => r.status !== 'success');
    
    console.log(`✅ 成功: ${successful.length}`);
    console.log(`❌ 失敗: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n🎉 發現的設備:');
      successful.forEach(result => {
        console.log(`   📱 ${result.ip}: ${result.data.deviceName} (${result.data.deviceType})`);
      });
    }
    
    console.log('\n💡 建議:');
    if (successful.length === 0) {
      console.log('   • 檢查後端服務是否正在運行');
      console.log('   • 確認防火牆設置');
      console.log('   • 檢查網絡配置');
      console.log('   • 嘗試使用localhost:3001測試');
    } else if (successful.length === 1 && successful[0].ip === 'localhost') {
      console.log('   • 只有localhost可以連接');
      console.log('   • 需要配置網絡訪問權限');
      console.log('   • 檢查macOS防火牆設置');
    } else {
      console.log('   • 網絡掃描正常工作');
      console.log('   • 可以進行Wi-Fi設備發現');
    }
  } else {
    console.log('❌ 無法檢測到本地IP地址');
  }
}

// 運行測試
runTest().catch(console.error);

