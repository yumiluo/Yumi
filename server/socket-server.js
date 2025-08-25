const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 存儲會話和設備信息
const sessions = new Map();
const devices = new Map();

// 健康檢查端點
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    server: 'VR Socket.io Server',
    version: '1.0.0'
  });
});

// 設備發現端點
app.get('/discover', (req, res) => {
  const deviceInfo = {
    deviceName: req.query.deviceName || 'Unknown Device',
    deviceType: req.query.deviceType || 'unknown',
    deviceModel: req.query.deviceModel || 'Unknown Model',
    timestamp: Date.now()
  };
  
  res.json(deviceInfo);
});

// Socket.io連接處理
io.on('connection', (socket) => {
  console.log('新設備連接:', socket.id);
  
  let currentSession = null;
  let currentDevice = null;

  // 處理設備加入會話
  socket.on('join-session', (data) => {
    try {
      const { sessionCode, deviceId, deviceName, deviceType, deviceModel, connectionMethod } = data;
      
      console.log('設備嘗試加入會話:', {
        sessionCode,
        deviceId,
        deviceName,
        deviceType,
        deviceModel,
        connectionMethod
      });

      // 創建或獲取會話
      if (!sessions.has(sessionCode)) {
        sessions.set(sessionCode, {
          id: sessionCode,
          devices: new Map(),
          createdAt: Date.now(),
          currentVideo: null,
          playbackState: 'stopped',
          currentTime: 0
        });
      }

      const session = sessions.get(sessionCode);
      
      // 創建設備記錄
      const device = {
        id: deviceId,
        name: deviceName || 'Unknown Device',
        type: deviceType || 'unknown',
        model: deviceModel || 'Unknown Model',
        connectionMethod: connectionMethod || 'network',
        socketId: socket.id,
        joinedAt: Date.now(),
        lastSeen: Date.now(),
        status: 'connected'
      };

      // 添加到會話
      session.devices.set(deviceId, device);
      devices.set(deviceId, device);
      
      // 設置socket關聯
      socket.sessionCode = sessionCode;
      socket.deviceId = deviceId;
      currentSession = sessionCode;
      currentDevice = deviceId;

      // 確認設備加入
      socket.emit('device-joined', {
        sessionCode,
        deviceId,
        status: 'connected',
        message: '成功加入會話'
      });

      // 廣播設備加入事件到會話中的其他設備
      socket.to(sessionCode).emit('device-joined', {
        deviceId,
        deviceName: device.name,
        deviceType: device.type,
        deviceModel: device.model,
        connectionMethod: device.connectionMethod,
        timestamp: Date.now()
      });

      // 發送當前會話狀態
      socket.emit('session-state', {
        sessionCode,
        deviceCount: session.devices.size,
        currentVideo: session.currentVideo,
        playbackState: session.playbackState,
        currentTime: session.currentTime
      });

      console.log(`設備 ${deviceName} (${deviceModel}) 成功加入會話 ${sessionCode}`);
      console.log(`會話 ${sessionCode} 當前設備數量: ${session.devices.size}`);

    } catch (error) {
      console.error('處理設備加入會話時出錯:', error);
      socket.emit('error', {
        message: '加入會話失敗',
        error: error.message
      });
    }
  });

  // 處理會話創建
  socket.on('create-session', (data) => {
    try {
      const { sessionCode, deviceType } = data;
      
      console.log('創建新會話:', sessionCode);

      if (!sessions.has(sessionCode)) {
        sessions.set(sessionCode, {
          id: sessionCode,
          devices: new Map(),
          createdAt: Date.now(),
          currentVideo: null,
          playbackState: 'stopped',
          currentTime: 0
        });
      }

      const session = sessions.get(sessionCode);
      
      // 加入會話房間
      socket.join(sessionCode);
      socket.sessionCode = sessionCode;
      currentSession = sessionCode;

      // 確認會話創建
      socket.emit('session-created', {
        sessionCode,
        status: 'created',
        message: '會話創建成功'
      });

      console.log(`會話 ${sessionCode} 創建成功`);

    } catch (error) {
      console.error('創建會話時出錯:', error);
      socket.emit('error', {
        message: '創建會話失敗',
        error: error.message
      });
    }
  });

  // 處理視頻播放
  socket.on('play-video', (data) => {
    try {
      const { sessionCode, videoId, videoUrl, startTime } = data;
      
      if (!sessionCode || !sessions.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessions.get(sessionCode);
      session.currentVideo = videoUrl;
      session.playbackState = 'playing';
      session.currentTime = startTime || 0;

      console.log(`會話 ${sessionCode} 開始播放視頻:`, videoUrl);

      // 廣播播放命令到會話中的所有設備
      socket.to(sessionCode).emit('video-sync', {
        type: 'play',
        videoId,
        videoUrl,
        startTime: session.currentTime,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('處理視頻播放時出錯:', error);
      socket.emit('error', {
        message: '播放視頻失敗',
        error: error.message
      });
    }
  });

  // 處理視頻暫停
  socket.on('pause-video', (data) => {
    try {
      const { sessionCode } = data;
      
      if (!sessionCode || !sessions.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessions.get(sessionCode);
      session.playbackState = 'paused';

      console.log(`會話 ${sessionCode} 暫停播放`);

      // 廣播暫停命令
      socket.to(sessionCode).emit('video-sync', {
        type: 'pause',
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('處理視頻暫停時出錯:', error);
      socket.emit('error', {
        message: '暫停視頻失敗',
        error: error.message
      });
    }
  });

  // 處理視頻停止
  socket.on('stop-video', (data) => {
    try {
      const { sessionCode } = data;
      
      if (!sessionCode || !sessions.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessions.get(sessionCode);
      session.playbackState = 'stopped';
      session.currentVideo = null;
      session.currentTime = 0;

      console.log(`會話 ${sessionCode} 停止播放`);

      // 廣播停止命令
      socket.to(sessionCode).emit('video-sync', {
        type: 'stop',
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('處理視頻停止時出錯:', error);
      socket.emit('error', {
        message: '停止視頻失敗',
        error: error.message
      });
    }
  });

  // 處理時間同步
  socket.on('sync-time', (data) => {
    try {
      const { sessionCode, currentTime } = data;
      
      if (!sessionCode || !sessions.has(sessionCode)) {
        return;
      }

      const session = sessions.get(sessionCode);
      session.currentTime = currentTime;

      // 廣播時間同步到其他設備
      socket.to(sessionCode).emit('video-sync', {
        type: 'time-sync',
        currentTime,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('處理時間同步時出錯:', error);
    }
  });

  // 處理設備離開
  socket.on('device-left', (data) => {
    try {
      const { deviceId } = data;
      
      if (deviceId && devices.has(deviceId)) {
        const device = devices.get(deviceId);
        console.log(`設備 ${device.name} 主動離開`);
        
        // 從會話中移除設備
        if (currentSession && sessions.has(currentSession)) {
          const session = sessions.get(currentSession);
          session.devices.delete(deviceId);
          
          // 廣播設備離開事件
          socket.to(currentSession).emit('device-left', {
            deviceId,
            timestamp: Date.now()
          });
          
          console.log(`設備已從會話 ${currentSession} 中移除`);
        }
        
        // 清理設備記錄
        devices.delete(deviceId);
      }
    } catch (error) {
      console.error('處理設備離開時出錯:', error);
    }
  });

  // 處理斷開連接
  socket.on('disconnect', () => {
    console.log('設備斷開連接:', socket.id);
    
    try {
      // 清理設備記錄
      if (currentDevice && devices.has(currentDevice)) {
        const device = devices.get(currentDevice);
        console.log(`設備 ${device.name} 斷開連接`);
        
        // 從會話中移除設備
        if (currentSession && sessions.has(currentSession)) {
          const session = sessions.get(currentSession);
          session.devices.delete(currentDevice);
          
          // 廣播設備離開事件
          socket.to(currentSession).emit('device-left', {
            deviceId: currentDevice,
            timestamp: Date.now()
          });
          
          console.log(`設備已從會話 ${currentSession} 中移除`);
          
          // 如果會話中沒有設備了，清理會話
          if (session.devices.size === 0) {
            sessions.delete(currentSession);
            console.log(`會話 ${currentSession} 已清理`);
          }
        }
        
        // 清理設備記錄
        devices.delete(currentDevice);
      }
    } catch (error) {
      console.error('處理斷開連接時出錯:', error);
    }
  });

  // 處理錯誤
  socket.on('error', (error) => {
    console.error('Socket錯誤:', error);
  });
});

// 定期清理離線設備
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5分鐘超時
  
  for (const [deviceId, device] of devices.entries()) {
    if (now - device.lastSeen > timeout) {
      console.log(`設備 ${device.name} 超時，標記為離線`);
      device.status = 'offline';
      
      // 從會話中移除離線設備
      if (device.sessionCode && sessions.has(device.sessionCode)) {
        const session = sessions.get(device.sessionCode);
        session.devices.delete(deviceId);
        
        // 廣播設備離線事件
        io.to(device.sessionCode).emit('device-left', {
          deviceId,
          timestamp: now
        });
      }
    }
  }
}, 30000); // 每30秒檢查一次

// 獲取服務器狀態
app.get('/status', (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    sessions: Array.from(sessions.keys()),
    totalDevices: devices.size,
    activeConnections: io.engine.clientsCount
  };
  
  res.json(status);
});

// 獲取會話信息
app.get('/sessions/:sessionCode', (req, res) => {
  const { sessionCode } = req.params;
  
  if (!sessions.has(sessionCode)) {
    return res.status(404).json({ error: '會話不存在' });
  }
  
  const session = sessions.get(sessionCode);
  const sessionInfo = {
    id: session.id,
    deviceCount: session.devices.size,
    devices: Array.from(session.devices.values()).map(device => ({
      id: device.id,
      name: device.name,
      type: device.type,
      model: device.model,
      status: device.status,
      connectionMethod: device.connectionMethod,
      joinedAt: device.joinedAt,
      lastSeen: device.lastSeen
    })),
    currentVideo: session.currentVideo,
    playbackState: session.playbackState,
    currentTime: session.currentTime,
    createdAt: session.createdAt
  };
  
  res.json(sessionInfo);
});

// 啟動服務器
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`🚀 VR Socket.io 服務器運行在端口 ${PORT}`);
  console.log(`📱 健康檢查: http://localhost:${PORT}/health`);
  console.log(`📊 服務器狀態: http://localhost:${PORT}/status`);
  console.log(`🔍 設備發現: http://localhost:${PORT}/discover`);
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉服務器...');
  server.close(() => {
    console.log('✅ 服務器已關閉');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在關閉服務器...');
  server.close(() => {
    console.log('✅ 服務器已關閉');
    process.exit(0);
  });
});
