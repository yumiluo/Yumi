const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const os = require('os');
const { networkInterfaces } = require('os');

// 創建Express應用
const app = express();
const server = http.createServer(app);

// 配置Socket.io with性能優化
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e8, // 100MB
  allowEIO3: true
});

// 中間件配置
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 性能優化中間件
app.use((req, res, next) => {
  res.setHeader('X-Response-Time', '0');
  res.setHeader('X-Powered-By', 'VR-System');
  next();
});

// Supabase配置
const supabaseUrl = 'https://vdeiwyqicpkfvqntxczj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWl3eXFpY3BrZnZxbnR4Y3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzE1NTAsImV4cCI6MjA3MTQwNzU1MH0.M-1yPcuKfNPUyAWVPCyx1hA7zEvGb-tPbwxizo96R4E';

const supabase = createClient(supabaseUrl, supabaseKey);

// 數據庫表名
const TABLES = {
  USERS: 'users',
  SESSIONS: 'sessions',
  DEVICES: 'devices',
  VIDEOS: 'videos'
};

// 內存存儲和緩存
const sessionsCache = new Map();
const devicesCache = new Map();
const usersCache = new Map();
const connectionPool = new Map();

// 設備發現和連接管理
class DeviceManager {
  constructor() {
    this.devices = new Map();
    this.activeConnections = new Map();
    this.scanInProgress = false;
  }

  // 掃描網絡設備
  async scanNetworkDevices() {
    if (this.scanInProgress) {
      throw new Error('Scan already in progress');
    }

    this.scanInProgress = true;
    const discoveredDevices = [];

    try {
      // 獲取本機網絡接口
      const interfaces = networkInterfaces();
      
      for (const [name, nets] of Object.entries(interfaces)) {
        for (const net of nets) {
          if (net.family === 'IPv4' && !net.internal) {
            // 掃描同網段設備
            const subnet = net.address.substring(0, net.address.lastIndexOf('.'));
            const devices = await this.scanSubnet(subnet);
            discoveredDevices.push(...devices);
          }
        }
      }

      // 模擬發現一些VR設備
      const mockDevices = this.generateMockDevices();
      discoveredDevices.push(...mockDevices);

      return discoveredDevices;
    } finally {
      this.scanInProgress = false;
    }
  }

  // 掃描子網
  async scanSubnet(subnet) {
    const devices = [];
    const promises = [];

    for (let i = 1; i <= 254; i++) {
      const ip = `${subnet}.${i}`;
      promises.push(this.pingDevice(ip));
    }

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const ip = `${subnet}.${index + 1}`;
        devices.push({
          id: `network_${ip.replace(/\./g, '_')}`,
          name: `Device_${ip}`,
          type: 'desktop',
          ip: ip,
          status: 'discovered',
          capabilities: ['network', 'http', 'websocket'],
          connectionMethod: 'wifi',
          lastSeen: new Date()
        });
      }
    });

    return devices;
  }

  // Ping設備
  async pingDevice(ip) {
    return new Promise((resolve) => {
      const net = require('net');
      const socket = new net.Socket();
      
      socket.setTimeout(1000);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });
      
      socket.connect(80, ip);
    });
  }

  // 生成模擬VR設備
  generateMockDevices() {
    return [
      {
        id: 'vr_headset_001',
        name: 'VR Headset Pro',
        type: 'vr',
        ip: '192.168.1.100',
        status: 'discovered',
        capabilities: ['vr', '360_video', 'spatial_audio'],
        connectionMethod: 'wifi',
        lastSeen: new Date()
      },
      {
        id: 'mobile_vr_001',
        name: 'Mobile VR Device',
        type: 'mobile',
        ip: '192.168.1.101',
        status: 'discovered',
        capabilities: ['mobile_vr', 'touch', 'gyroscope'],
        connectionMethod: 'bluetooth',
        lastSeen: new Date()
      }
    ];
  }

  // 連接設備
  async connectDevice(deviceId, connectionMethod) {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error('Device not found');
    }

    try {
      device.status = 'connecting';
      
      // 模擬連接過程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      device.status = 'connected';
      this.activeConnections.set(deviceId, device);
      
      return {
        success: true,
        connectionId: `conn_${deviceId}_${Date.now()}`
      };
    } catch (error) {
      device.status = 'error';
      throw error;
    }
  }

  // 斷開設備
  async disconnectDevice(deviceId) {
    const device = this.devices.get(deviceId);
    if (device) {
      device.status = 'disconnected';
      this.activeConnections.delete(deviceId);
      return true;
    }
    return false;
  }

  // 獲取設備列表
  getDevices() {
    return Array.from(this.devices.values());
  }

  // 獲取連接狀態
  getConnectionStats() {
    const devices = Array.from(this.devices.values());
    return {
      total: devices.length,
      connected: devices.filter(d => d.status === 'connected').length,
      disconnected: devices.filter(d => d.status === 'disconnected').length,
      error: devices.filter(d => d.status === 'error').length
    };
  }
}

// 創建設備管理器實例
const deviceManager = new DeviceManager();

// Socket.io連接管理
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // 發送歡迎消息
  socket.emit('welcome', {
    message: 'Welcome to VR System',
    socketId: socket.id,
    timestamp: new Date().toISOString()
  });

  // 處理設備掃描請求
  socket.on('scanDevices', async (data, callback) => {
    try {
      console.log('Device scan requested');
      const devices = await deviceManager.scanNetworkDevices();
      
      // 更新設備緩存
      devices.forEach(device => {
        devicesCache.set(device.id, device);
      });
      
      // 發送設備發現事件
      socket.emit('deviceList', devices);
      
      if (callback) {
        callback({ success: true, devices });
      }
    } catch (error) {
      console.error('Device scan error:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 處理設備連接請求
  socket.on('connectDevice', async (data, callback) => {
    try {
      const result = await deviceManager.connectDevice(data.deviceId, data.connectionMethod);
      
      // 發送設備狀態更新
      socket.emit('deviceStatusChanged', {
        deviceId: data.deviceId,
        status: 'connected',
        connectionId: result.connectionId
      });
      
      if (callback) {
        callback(result);
      }
    } catch (error) {
      console.error('Device connection error:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 處理設備斷開請求
  socket.on('disconnectDevice', async (data, callback) => {
    try {
      const result = await deviceManager.disconnectDevice(data.deviceId);
      
      if (result) {
        socket.emit('deviceStatusChanged', {
          deviceId: data.deviceId,
          status: 'disconnected'
        });
      }
      
      if (callback) {
        callback({ success: result });
      }
    } catch (error) {
      console.error('Device disconnection error:', error);
      if (callback) {
        callback({ success: false, error: error.message });
      }
    }
  });

  // 處理心跳
  socket.on('heartbeat', (data) => {
    socket.emit('heartbeat', {
      timestamp: Date.now(),
      serverTime: new Date().toISOString()
    });
  });

  // 斷開連接
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// API路由

// 健康檢查
app.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    platform: process.platform,
    nodeVersion: process.version,
    connections: io.engine.clientsCount,
    devices: deviceManager.getConnectionStats()
  };
  
  res.json(health);
});

// 獲取設備列表
app.get('/api/devices', (req, res) => {
  const devices = deviceManager.getDevices();
  res.json({
    success: true,
    devices,
    stats: deviceManager.getConnectionStats()
  });
});

// 掃描設備
app.post('/api/devices/scan', async (req, res) => {
  try {
    const devices = await deviceManager.scanNetworkDevices();
    res.json({
      success: true,
      devices,
      message: `Found ${devices.length} devices`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 連接設備
app.post('/api/devices/:deviceId/connect', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { connectionMethod } = req.body;
    
    const result = await deviceManager.connectDevice(deviceId, connectionMethod);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 斷開設備
app.post('/api/devices/:deviceId/disconnect', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const result = await deviceManager.disconnectDevice(deviceId);
    res.json({ success: result });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 系統信息
app.get('/api/system/info', (req, res) => {
  const systemInfo = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem()
    },
    cpu: os.cpus()[0],
    uptime: os.uptime(),
    network: networkInterfaces()
  };
  
  res.json(systemInfo);
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404處理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// 啟動服務器
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🚀 Enhanced VR Server running on port ${PORT}`);
  console.log(`📱 WebSocket server ready for connections`);
  console.log(`🔍 Device discovery service active`);
  console.log(`🌐 API endpoints available at http://localhost:${PORT}/api`);
  
  // 顯示網絡接口信息
  const interfaces = networkInterfaces();
  console.log('\n🌍 Network Interfaces:');
  Object.keys(interfaces).forEach((name) => {
    interfaces[name].forEach((interface) => {
      if (interface.family === 'IPv4' && !interface.internal) {
        console.log(`   ${name}: ${interface.address}`);
      }
    });
  });
});

// 優雅關閉
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io, deviceManager };
