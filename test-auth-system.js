#!/usr/bin/env node

/**
 * 🧪 VR系統認證功能測試腳本
 * 測試註冊、登錄、JWT驗證等功能
 */

const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'test123456';

// 測試用戶數據
let testUser = null;
let authToken = null;

// 顏色輸出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function logInfo(message) {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bright}${colors.blue}${message}${colors.reset}`);
  console.log('='.repeat(message.length));
}

// 測試後端健康狀態
async function testBackendHealth() {
  logHeader('測試後端健康狀態');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    logSuccess(`後端健康檢查: ${response.data.status}`);
    logInfo(`服務器: ${response.data.server}`);
    logInfo(`版本: ${response.data.version}`);
    return true;
  } catch (error) {
    logError(`後端健康檢查失敗: ${error.message}`);
    return false;
  }
}

// 測試用戶註冊
async function testUserRegistration() {
  logHeader('測試用戶註冊');
  
  try {
    logInfo(`註冊測試用戶: ${TEST_EMAIL}`);
    
    const response = await axios.post(`${BASE_URL}/api/register`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.data.success) {
      logSuccess(`註冊成功: ${response.data.message}`);
      return true;
    } else {
      logError(`註冊失敗: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('已被註冊')) {
      logWarning(`用戶已存在: ${TEST_EMAIL}`);
      return true; // 用戶已存在也算成功
    }
    logError(`註冊請求失敗: ${error.message}`);
    return false;
  }
}

// 測試用戶登錄
async function testUserLogin() {
  logHeader('測試用戶登錄');
  
  try {
    logInfo(`登錄測試用戶: ${TEST_EMAIL}`);
    
    const response = await axios.post(`${BASE_URL}/api/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    if (response.data.success) {
      logSuccess(`登錄成功: ${response.data.message}`);
      logInfo(`用戶ID: ${response.data.user.id}`);
      logInfo(`用戶角色: ${response.data.user.role}`);
      logInfo(`JWT Token: ${response.data.token.substring(0, 50)}...`);
      
      // 保存測試用戶和token
      testUser = response.data.user;
      authToken = response.data.token;
      
      return true;
    } else {
      logError(`登錄失敗: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    logError(`登錄請求失敗: ${error.message}`);
    return false;
  }
}

// 測試JWT認證
async function testJWTAuthentication() {
  logHeader('測試JWT認證');
  
  if (!authToken) {
    logError('沒有可用的JWT token');
    return false;
  }
  
  try {
    logInfo('測試會話創建API（需要JWT認證）');
    
    const response = await axios.post(`${BASE_URL}/api/create-session`, {
      theme: 'Test Tour'
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      logSuccess(`會話創建成功: ${response.data.message}`);
      logInfo(`會話ID: ${response.data.sessionId}`);
      logInfo(`加入代碼: ${response.data.joinCode}`);
      logInfo(`主題: ${response.data.theme}`);
      return true;
    } else {
      logError(`會話創建失敗: ${response.data.message}`);
      return false;
    }
  } catch (error) {
    if (error.response?.status === 401) {
      logError('JWT認證失敗: 無效的token');
    } else {
      logError(`會話創建請求失敗: ${error.message}`);
    }
    return false;
  }
}

// 測試無效JWT
async function testInvalidJWT() {
  logHeader('測試無效JWT');
  
  try {
    logInfo('使用無效token測試會話創建');
    
    const response = await axios.post(`${BASE_URL}/api/create-session`, {
      theme: 'Test Tour'
    }, {
      headers: {
        'Authorization': 'Bearer invalid-token',
        'Content-Type': 'application/json'
      }
    });
    
    logError('應該返回401錯誤，但請求成功了');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('無效JWT正確返回401錯誤');
      return true;
    } else {
      logError(`意外的錯誤: ${error.message}`);
      return false;
    }
  }
}

// 測試缺少JWT
async function testMissingJWT() {
  logHeader('測試缺少JWT');
  
  try {
    logInfo('不使用Authorization頭測試會話創建');
    
    const response = await axios.post(`${BASE_URL}/api/create-session`, {
      theme: 'Test Tour'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    logError('應該返回401錯誤，但請求成功了');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('缺少JWT正確返回401錯誤');
      return true;
    } else {
      logError(`意外的錯誤: ${error.message}`);
      return false;
    }
  }
}

// 測試輸入驗證
async function testInputValidation() {
  logHeader('測試輸入驗證');
  
  const testCases = [
    {
      name: '空郵箱',
      data: { email: '', password: 'test123' },
      expectedStatus: 400
    },
    {
      name: '空密碼',
      data: { email: 'test@example.com', password: '' },
      expectedStatus: 400
    },
    {
      name: '無效郵箱格式',
      data: { email: 'invalid-email', password: 'test123' },
      expectedStatus: 400
    },
    {
      name: '密碼太短',
      data: { email: 'test@example.com', password: '123' },
      expectedStatus: 400
    }
  ];
  
  let passedTests = 0;
  
  for (const testCase of testCases) {
    try {
      logInfo(`測試: ${testCase.name}`);
      
      const response = await axios.post(`${BASE_URL}/api/register`, testCase.data);
      
      if (response.status === testCase.expectedStatus) {
        logSuccess(`${testCase.name}: 正確返回${testCase.expectedStatus}`);
        passedTests++;
      } else {
        logError(`${testCase.name}: 期望${testCase.expectedStatus}，實際${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === testCase.expectedStatus) {
        logSuccess(`${testCase.name}: 正確返回${testCase.expectedStatus}`);
        passedTests++;
      } else {
        logError(`${testCase.name}: 期望${testCase.expectedStatus}，實際${error.response?.status || 'unknown'}`);
      }
    }
  }
  
  return passedTests === testCases.length;
}

// 主測試函數
async function runAllTests() {
  logHeader('🚀 開始VR系統認證功能測試');
  
  const tests = [
    { name: '後端健康檢查', fn: testBackendHealth },
    { name: '用戶註冊', fn: testUserRegistration },
    { name: '用戶登錄', fn: testUserLogin },
    { name: 'JWT認證', fn: testJWTAuthentication },
    { name: '無效JWT測試', fn: testInvalidJWT },
    { name: '缺少JWT測試', fn: testMissingJWT },
    { name: '輸入驗證', fn: testInputValidation }
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      logInfo(`\n開始測試: ${test.name}`);
      const result = await test.fn();
      
      if (result) {
        passedTests++;
        logSuccess(`${test.name} 測試通過`);
      } else {
        logError(`${test.name} 測試失敗`);
      }
    } catch (error) {
      logError(`${test.name} 測試異常: ${error.message}`);
    }
  }
  
  // 測試結果總結
  logHeader('📊 測試結果總結');
  
  if (passedTests === totalTests) {
    logSuccess(`🎉 所有測試通過！ (${passedTests}/${totalTests})`);
  } else {
    logWarning(`⚠️  部分測試失敗 (${passedTests}/${totalTests})`);
  }
  
  logInfo(`測試用戶: ${TEST_EMAIL}`);
  if (testUser) {
    logInfo(`用戶ID: ${testUser.id}`);
    logInfo(`用戶角色: ${testUser.role}`);
  }
  
  return passedTests === totalTests;
}

// 清理測試數據
async function cleanupTestData() {
  logHeader('🧹 清理測試數據');
  
  if (testUser) {
    logInfo(`測試用戶: ${testUser.email} (ID: ${testUser.id})`);
    logInfo('注意: 測試用戶數據保留在MongoDB中，可手動清理');
  }
}

// 運行測試
async function main() {
  try {
    const success = await runAllTests();
    await cleanupTestData();
    
    if (success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  } catch (error) {
    logError(`測試運行失敗: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接運行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  runAllTests,
  testBackendHealth,
  testUserRegistration,
  testUserLogin,
  testJWTAuthentication
};



