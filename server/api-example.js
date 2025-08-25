// 後端API示例 - 支持Wi-Fi設備發現
// 這個文件展示了如何實現 /discover 端點

const express = require('express');
const cors = require('cors');
const app = express();

// 啟用CORS，允許本地IP訪問
app.use(cors({
  origin: function (origin, callback) {
    // 允許本地網絡訪問
    if (!origin || 
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.') ||
        origin.startsWith('http://172.')) {
      callback(null, true);
    } else {
      callback(new Error('不允許的來源'));
    }
  },
  credentials: true
}));

app.use(express.json());

// 模擬設備數據庫
const devices = [
  {
    id: 'device-001',
    deviceName: 'VR Headset Quest 2',
    deviceType: 'vr',
    ip: '192.168.1.100',
    port: 5000,
    status: 'available'
  },
  {
    id: 'device-002',
    deviceName: 'iPhone 15 Pro',
    deviceType: 'mobile',
    ip: '192.168.1.101',
    port: 5000,
    status: 'available'
  },
  {
    id: 'device-003',
    deviceName: 'Samsung Galaxy S24',
    deviceType: 'mobile',
    ip: '192.168.1.102',
    port: 5000,
    status: 'available'
  }
];

// 設備發現端點
app.get('/discover', (req, res) => {
  try {
    // 獲取請求的IP地址
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    console.log(`收到設備發現請求，來自: ${clientIP}`);
    
    // 返回設備信息
    res.json({
      status: 'available',
      sessionId: 'session-' + Date.now(),
      deviceName: 'VR Controller',
      deviceType: 'controller',
      timestamp: new Date().toISOString(),
      message: '設備可用，可以加入會話'
    });
  } catch (error) {
    console.error('設備發現錯誤:', error);
    res.status(500).json({
      status: 'error',
      message: '設備發現失敗'
    });
  }
});

// 獲取所有設備列表
app.get('/api/devices', (req, res) => {
  try {
    res.json({
      success: true,
      devices: devices,
      count: devices.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '獲取設備列表失敗'
    });
  }
});

// 設備連接端點
app.post('/api/connect', (req, res) => {
  try {
    const { deviceId, deviceType, deviceIP } = req.body;
    
    console.log(`設備連接請求: ${deviceId} (${deviceType}) 來自 ${deviceIP}`);
    
    // 這裡可以添加設備到會話的邏輯
    res.json({
      success: true,
      message: '設備連接成功',
      sessionId: 'session-' + Date.now()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '設備連接失敗'
    });
  }
});

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 錯誤處理中間件
app.use((error, req, res, next) => {
  console.error('API錯誤:', error);
  res.status(500).json({
    status: 'error',
    message: '內部服務器錯誤'
  });
});

// 404處理
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: '端點不存在'
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 後端API服務器運行在端口 ${PORT}`);
  console.log(`📱 設備發現端點: http://localhost:${PORT}/discover`);
  console.log(`🔍 健康檢查: http://localhost:${PORT}/health`);
  console.log(`📋 設備列表: http://localhost:${PORT}/api/devices`);
  console.log('');
  console.log('💡 使用說明:');
  console.log('1. 確保前端和後端在同一網絡中');
  console.log('2. 前端會掃描 192.168.x.x 範圍的IP地址');
  console.log('3. 每個設備需要響應 /discover 端點');
  console.log('4. 設備連接後會發送 add-device-wifi 事件');
});

module.exports = app;
