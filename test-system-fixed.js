#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const FRONTEND_URL = 'http://localhost:3000';

console.log('🧪 測試修復版VR系統...\n');

// 測試後端健康檢查
async function testBackendHealth() {
  console.log('🔍 測試後端健康檢查...');
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ 後端健康檢查成功:', response.data);
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

// 測試註冊功能
async function testRegistration() {
  console.log('🔍 測試用戶註冊...');
  try {
    const testUser = {
      email: `test${Date.now()}@example.com`,
      password: 'testpassword123'
    };
    
    const response = await axios.post(`${BASE_URL}/api/register`, testUser);
    console.log('✅ 用戶註冊成功:', response.data.message);
    return response.data.token;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('⚠️  註冊測試結果:', error.response.data.message);
      return null;
    } else {
      console.log('❌ 註冊測試失敗:', error.message);
      return null;
    }
  }
}

// 測試登錄功能
async function testLogin() {
  console.log('🔍 測試用戶登錄...');
  try {
    const testUser = {
      email: 'test@example.com',
      password: 'testpassword123'
    };
    
    const response = await axios.post(`${BASE_URL}/api/login`, testUser);
    console.log('✅ 用戶登錄成功:', response.data.message);
    return response.data.token;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('⚠️  登錄測試結果:', error.response.data.message);
      return null;
    } else {
      console.log('❌ 登錄測試失敗:', error.message);
      return null;
    }
  }
}

// 測試會話創建
async function testSessionCreation(token) {
  if (!token) {
    console.log('⚠️  跳過會話創建測試（需要有效token）');
    return false;
  }
  
  console.log('🔍 測試會話創建...');
  try {
    const sessionData = {
      theme: '測試旅遊主題'
    };
    
    const response = await axios.post(`${BASE_URL}/api/create-session`, sessionData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ 會話創建成功:', response.data.message);
    console.log('   會話ID:', response.data.sessionId);
    console.log('   加入代碼:', response.data.joinCode);
    return true;
  } catch (error) {
    if (error.response && error.response.data) {
      console.log('❌ 會話創建失敗:', error.response.data.message);
    } else {
      console.log('❌ 會話創建失敗:', error.message);
    }
    return false;
  }
}

// 主測試函數
async function runTests() {
  console.log('🚀 開始系統測試...\n');
  
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
  
  // 測試註冊
  const registerToken = await testRegistration();
  
  // 測試登錄
  const loginToken = await testLogin();
  
  // 測試會話創建
  const token = registerToken || loginToken;
  await testSessionCreation(token);
  
  console.log('\n🎯 系統測試完成！');
  console.log('💡 現在你可以在瀏覽器中打開 http://localhost:3000 來使用系統');
}

// 運行測試
runTests().catch(console.error);
