const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// 文件上傳配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只允許上傳視頻文件'));
    }
  }
});

// 數據存儲
let devices = [];
let videos = [];
let connectedClients = new Map();
let activeSessions = new Map();
let users = new Map();

// 視頻分類
const videoCategories = [
  '亞洲', '歐洲', '中東', '非洲', '北美洲', '南美洲', '大洋洲', '北極', '南極'
];

// 初始化真實的視頻數據
const initializeVideos = () => {
  videos = [
    {
      id: '1',
      title: '東京街頭漫步',
      category: '亞洲',
      type: 'local',
      duration: '5:30',
      thumbnail: '/api/thumbnail/1',
      url: '/api/video/1',
      description: '體驗東京繁華街頭的VR全景視角',
      tags: ['城市', '文化', '現代'],
      vrMode: '360',
      resolution: '4K',
      fps: 30,
      projection: 'equirectangular',
      spatialAudio: true
    },
    {
      id: '2',
      title: '巴黎鐵塔夜景',
      category: '歐洲',
      type: 'local',
      duration: '4:15',
      thumbnail: '/api/thumbnail/2',
      url: '/api/video/2',
      description: '從巴黎鐵塔頂部俯瞰浪漫夜景',
      tags: ['地標', '夜景', '浪漫'],
      vrMode: '360',
      resolution: '4K',
      fps: 30,
      projection: 'equirectangular',
      spatialAudio: true
    },
    {
      id: '3',
      title: '開羅金字塔',
      category: '中東',
      type: 'local',
      duration: '6:20',
      thumbnail: '/api/thumbnail/3',
      url: '/api/video/3',
      description: '探索古埃及金字塔的神秘內部',
      tags: ['古蹟', '歷史', '神秘'],
      vrMode: '180',
      resolution: '8K',
      fps: 60,
      projection: 'equirectangular',
      spatialAudio: true
    },
    {
      id: '4',
      title: '撒哈拉沙漠日落',
      category: '非洲',
      type: 'local',
      duration: '3:45',
      thumbnail: '/api/thumbnail/4',
      url: '/api/video/4',
      description: '在撒哈拉沙漠中觀看壯麗日落',
      tags: ['自然', '沙漠', '日落'],
      vrMode: '360',
      resolution: '4K',
      fps: 30,
      projection: 'equirectangular',
      spatialAudio: false
    },
    {
      id: '5',
      title: '紐約時代廣場',
      category: '北美洲',
      type: 'local',
      duration: '5:10',
      thumbnail: '/api/thumbnail/5',
      url: '/api/video/5',
      description: '感受紐約時代廣場的繁華與活力',
      tags: ['城市', '現代', '繁華'],
      vrMode: '360',
      resolution: '4K',
      fps: 30,
      projection: 'equirectangular',
      spatialAudio: true
    }
  ];
};

// 初始化用戶數據
const initializeUsers = () => {
  users.set('admin@example.com', {
    id: 'admin001',
    email: 'admin@example.com',
    password: '123456',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin'],
    preferences: {
      defaultVRMode: '360',
      defaultResolution: '4K',
      autoPlay: false,
      spatialAudio: true
    }
  });
  
  users.set('user@example.com', {
    id: 'user001',
    email: 'user@example.com',
    password: '123456',
    role: 'user',
    permissions: ['read', 'write'],
    preferences: {
      defaultVRMode: '180',
      defaultResolution: '2K',
      autoPlay: true,
      spatialAudio: false
    }
  });
};

// WebSocket連接處理
wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  connectedClients.set(clientId, {
    ws,
    deviceId: null,
    sessionId: null,
    lastSeen: Date.now()
  });

  console.log(`新客戶端連接: ${clientId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(clientId, data);
    } catch (error) {
      console.error('WebSocket消息解析錯誤:', error);
    }
  });

  ws.on('close', () => {
    console.log(`客戶端斷開連接: ${clientId}`);
    connectedClients.delete(clientId);
  });
});

// 處理WebSocket消息
const handleWebSocketMessage = (clientId, data) => {
  const client = connectedClients.get(clientId);
  if (!client) return;

  console.log(`收到WebSocket消息: ${data.type}`, data);

  switch (data.type) {
    case 'create-session':
      handleCreateSession(clientId, data);
      break;
      
    case 'device_connect':
      client.deviceId = data.deviceId;
      client.sessionId = data.sessionId;
      console.log(`設備 ${data.deviceId} 連接到會話 ${data.sessionId}`);
      break;
      
    case 'add-device-wifi':
      handleWiFiDeviceConnected(clientId, data);
      break;
      
    case 'play-video':
      handlePlayVideo(clientId, data);
      break;
      
    case 'pause-video':
      handlePauseVideo(clientId, data);
      break;
      
    case 'stop-video':
      handleStopVideo(clientId, data);
      break;
      
    case 'sync-time':
      handleSyncTime(clientId, data);
      break;
      
    case 'vr_control':
      handleVRControl(data);
      break;
      
    case 'session_sync':
      handleSessionSync(data);
      break;
      
    case 'device_status':
      handleDeviceStatus(data);
      break;
      
    default:
      console.log('未知消息類型:', data.type);
  }
};

// VR控制處理
const handleVRControl = (data) => {
  const { sessionId, deviceId, control, value } = data;
  
  // 廣播控制命令到所有相關設備
  broadcastToSession(sessionId, {
    type: 'vr_control',
    deviceId,
    control,
    value,
    timestamp: Date.now()
  });
  
  console.log(`VR控制: ${control} = ${value} (設備: ${deviceId})`);
};

// 會話同步處理
const handleSessionSync = (data) => {
  const { sessionId, videoId, position, playState } = data;
  
  // 更新會話狀態
  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      id: sessionId,
      videoId,
      devices: [],
      playState: 'stopped',
      position: 0,
      startTime: Date.now()
    });
  }
  
  const session = activeSessions.get(sessionId);
  session.videoId = videoId;
  session.playState = playState;
  session.position = position;
  
  // 廣播同步信息
  broadcastToSession(sessionId, {
    type: 'session_sync',
    videoId,
    position,
    playState,
    timestamp: Date.now()
  });
};

// 處理創建會話
const handleCreateSession = (clientId, data) => {
  try {
    const sessionCode = `session-${Date.now()}`;
    const client = connectedClients.get(clientId);
    
    if (client) {
      client.sessionId = sessionCode;
      console.log(`創建會話: ${sessionCode} (客戶端: ${clientId})`);
      
      // 發送會話創建成功消息
      client.ws.send(JSON.stringify({
        type: 'session-created',
        sessionCode,
        joinUrl: `http://localhost:3000/join?session=${sessionCode}`
      }));
    }
  } catch (error) {
    console.error('創建會話錯誤:', error);
  }
};

// 處理播放視頻
const handlePlayVideo = (clientId, data) => {
  try {
    const { videoId, videoUrl, startTime } = data;
    console.log(`播放視頻: ${videoId} (開始時間: ${startTime})`);
    
    // 廣播播放命令到所有客戶端
    broadcastToAll({
      type: 'play-video',
      videoId,
      videoUrl,
      startTime,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('播放視頻錯誤:', error);
  }
};

// 處理暫停視頻
const handlePauseVideo = (clientId, data) => {
  try {
    console.log('暫停視頻');
    
    // 廣播暫停命令到所有客戶端
    broadcastToAll({
      type: 'pause-video',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('暫停視頻錯誤:', error);
  }
};

// 處理停止視頻
const handleStopVideo = (clientId, data) => {
  try {
    console.log('停止視頻');
    
    // 廣播停止命令到所有客戶端
    broadcastToAll({
      type: 'stop-video',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('停止視頻錯誤:', error);
  }
};

// 處理時間同步
const handleSyncTime = (clientId, data) => {
  try {
    const { currentTime } = data;
    console.log(`同步時間: ${currentTime}`);
    
    // 廣播時間同步到所有客戶端
    broadcastToAll({
      type: 'sync-time',
      currentTime,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('時間同步錯誤:', error);
  }
};

// 處理Wi-Fi設備連接
const handleWiFiDeviceConnected = (clientId, data) => {
  try {
    const { deviceId, deviceName, deviceType, connectionMethod, ip, port } = data;
    
    console.log(`Wi-Fi設備連接: ${deviceName} (${ip}:${port})`);
    
    // 創建新設備記錄
    const newDevice = {
      id: deviceId || `wifi-${ip}-${port}`,
      name: deviceName || `Wi-Fi設備 ${ip}`,
      type: deviceType || 'mobile',
      connectionMethod: connectionMethod || 'wifi',
      status: 'connected',
      lastSeen: new Date().toLocaleString(),
      batteryLevel: Math.floor(Math.random() * 30 + 70),
      capabilities: deviceType === 'vr' ? ['vr', 'hand_tracking'] : ['mobile_vr', 'gyroscope'],
      ip: ip,
      port: port
    };
    
    // 檢查設備是否已存在
    const existingDeviceIndex = devices.findIndex(d => d.id === newDevice.id);
    if (existingDeviceIndex >= 0) {
      // 更新現有設備
      devices[existingDeviceIndex] = { ...devices[existingDeviceIndex], ...newDevice };
      console.log(`更新現有設備: ${newDevice.name}`);
    } else {
      // 添加新設備
      devices.push(newDevice);
      console.log(`添加新設備: ${newDevice.name}`);
    }
    
    // 廣播設備更新
    broadcastToAll({
      type: 'devices_updated',
      data: devices
    });
    
    // 廣播設備加入事件
    broadcastToAll({
      type: 'device-joined',
      device: newDevice
    });
    
    console.log('當前連接的設備數量:', devices.length);
    
  } catch (error) {
    console.error('Wi-Fi設備連接處理錯誤:', error);
  }
};

// 設備狀態處理
const handleDeviceStatus = (data) => {
  const { deviceId, status, battery, orientation } = data;
  
  // 更新設備狀態
  const device = devices.find(d => d.id === deviceId);
  if (device) {
    device.status = status;
    device.batteryLevel = battery;
    device.orientation = orientation;
    device.lastSeen = Date.now();
    
    // 廣播設備狀態更新
    broadcastToAll({
      type: 'device_status_updated',
      deviceId,
      status,
      battery,
      orientation
    });
  }
};

// 廣播到特定會話
const broadcastToSession = (sessionId, message) => {
  connectedClients.forEach((client, clientId) => {
    if (client.sessionId === sessionId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
};

// 廣播到所有客戶端
const broadcastToAll = (message) => {
  connectedClients.forEach((client, clientId) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  });
};

// API路由

// 獲取所有視頻
app.get('/api/videos', (req, res) => {
  const { category, vrMode, resolution } = req.query;
  let filteredVideos = videos;
  
  if (category) {
    filteredVideos = filteredVideos.filter(v => v.category === category);
  }
  
  if (vrMode) {
    filteredVideos = filteredVideos.filter(v => v.vrMode === vrMode);
  }
  
  if (resolution) {
    filteredVideos = filteredVideos.filter(v => v.resolution === resolution);
  }

  res.json({
    success: true,
    data: filteredVideos,
    categories: videoCategories
  });
});

// 獲取所有設備
app.get('/api/devices', (req, res) => {
  res.json({
    success: true,
    data: devices
  });
});

// Wi-Fi設備發現端點
app.get('/discover', (req, res) => {
  try {
    // 獲取請求的IP地址
    const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    console.log(`收到Wi-Fi設備發現請求，來自: ${clientIP}`);
    
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
    console.error('Wi-Fi設備發現錯誤:', error);
    res.status(500).json({
      status: 'error',
      message: '設備發現失敗'
    });
  }
});

// 上傳視頻
app.post('/api/videos/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '沒有上傳文件'
      });
    }
    
    const { title, category, description, vrMode, resolution } = req.body;
    
    const newVideo = {
      id: uuidv4(),
      title: title || req.file.originalname,
      category: category || '未分類',
      type: 'uploaded',
      duration: '00:00', // 需要解析視頻獲取時長
      thumbnail: `/api/thumbnail/${req.file.filename}`,
      url: `/api/video/${req.file.filename}`,
      description: description || '',
      tags: [],
      vrMode: vrMode || '360',
      resolution: resolution || '4K',
      fps: 30,
      projection: 'equirectangular',
      spatialAudio: false,
      filePath: req.file.path
    };
    
    videos.push(newVideo);
    
    res.json({
      success: true,
      data: newVideo
    });
    
  } catch (error) {
    console.error('視頻上傳錯誤:', error);
    res.status(500).json({
      success: false,
      message: '視頻上傳失敗',
      error: error.message
    });
  }
});

// 獲取視頻文件
app.get('/api/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const filepath = path.join(__dirname, 'uploads', filename);
  
  if (fs.existsSync(filepath)) {
    res.sendFile(filepath);
  } else {
    res.status(404).json({ success: false, message: '視頻文件不存在' });
  }
});

// 獲取縮略圖
app.get('/api/thumbnail/:filename', (req, res) => {
  const filename = req.params.filename;
  const thumbnailPath = path.join(__dirname, 'thumbnails', filename + '.jpg');
  
  if (fs.existsSync(thumbnailPath)) {
    res.sendFile(thumbnailPath);
  } else {
    // 返回默認縮略圖
    res.sendFile(path.join(__dirname, 'public', 'default-thumbnail.jpg'));
  }
});

// 掃描設備
app.post('/api/scan-devices', (req, res) => {
  // 返回當前已連接的設備列表
  res.json({
    success: true,
    message: '設備掃描完成',
    devices: devices,
    count: devices.length
  });
});

// 播放控制
app.post('/api/play', (req, res) => {
  const { deviceId, videoId } = req.body;
  
  if (!deviceId || !videoId) {
    return res.status(400).json({
      success: false,
      message: '缺少必要參數'
    });
  }

  handleVideoPlay(null, { deviceId, videoId });
  
  res.json({
    success: true,
    message: '開始播放'
  });
});

app.post('/api/pause', (req, res) => {
  handleVideoPause();
  res.json({
    success: true,
    message: '視頻已暫停'
  });
});

app.post('/api/stop', (req, res) => {
  handleVideoStop();
  res.json({
    success: true,
    message: '視頻已停止'
  });
});

// 設備連接API
app.post('/api/device-connected', (req, res) => {
  try {
    const { deviceId, deviceName, deviceType, connectionMethod } = req.body;
    
    console.log('新設備連接:', { deviceId, deviceName, deviceType, connectionMethod });
    
    // 創建新設備記錄
    const newDevice = {
      id: deviceId,
      name: deviceName || '未知設備',
      type: deviceType || 'mobile',
      connectionMethod: connectionMethod || 'bluetooth',
      status: 'connected',
      lastSeen: new Date().toLocaleString(),
      batteryLevel: Math.floor(Math.random() * 30 + 70), // 模擬電量
      capabilities: deviceType === 'vr' ? ['vr', 'hand_tracking'] : ['mobile_vr', 'gyroscope']
    };
    
    // 檢查設備是否已存在
    const existingDeviceIndex = devices.findIndex(d => d.id === deviceId);
    if (existingDeviceIndex >= 0) {
      // 更新現有設備
      devices[existingDeviceIndex] = { ...devices[existingDeviceIndex], ...newDevice };
    } else {
      // 添加新設備
      devices.push(newDevice);
    }
    
    // 廣播設備更新
    broadcastToAll({
      type: 'devices_updated',
      data: devices
    });
    
    res.json({
      success: true,
      message: '設備連接成功',
      device: newDevice
    });
    
    console.log('當前連接的設備數量:', devices.length);
    
  } catch (error) {
    console.error('設備連接API錯誤:', error);
    res.status(500).json({
      success: false,
      message: '設備連接失敗',
      error: error.message
    });
  }
});

// 創建會話API
app.post('/api/sessions', (req, res) => {
  const { videoId, deviceIds, userId } = req.body;
  
  if (!videoId || !deviceIds || !Array.isArray(deviceIds)) {
    return res.status(400).json({
      success: false,
      message: '缺少必要參數'
    });
  }
  
  const sessionId = uuidv4();
  const session = {
    id: sessionId,
    videoId,
    deviceIds,
    userId,
    status: 'active',
    createdAt: Date.now(),
    playState: 'stopped',
    position: 0
  };
  
  activeSessions.set(sessionId, session);
  
  res.json({
    success: true,
    data: session
  });
});

// 會話控制API
app.post('/api/sessions/:sessionId/control', (req, res) => {
  const { sessionId } = req.params;
  const { action, value } = req.body;
  
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({
      success: false,
      message: '會話不存在'
    });
  }
  
  switch (action) {
    case 'play':
      session.playState = 'playing';
      session.startTime = Date.now();
      break;
    case 'pause':
      session.playState = 'paused';
      break;
    case 'stop':
      session.playState = 'stopped';
      session.position = 0;
      break;
    case 'seek':
      session.position = value;
      break;
    default:
      return res.status(400).json({
        success: false,
        message: '無效的操作'
      });
  }
  
  // 廣播控制命令
  broadcastToSession(sessionId, {
    type: 'session_control',
    action,
    value,
    timestamp: Date.now()
  });
  
  res.json({
    success: true,
    message: `操作 ${action} 執行成功`
  });
});

// 用戶認證API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({
      success: false,
      message: '用戶名或密碼錯誤'
    });
  }
  
  const token = uuidv4();
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        preferences: user.preferences
      },
      token
    }
  });
});

// 用戶偏好設置API
app.put('/api/users/:userId/preferences', (req, res) => {
  const { userId } = req.params;
  const { preferences } = req.body;
  
  // 這裡應該驗證用戶身份和權限
  const user = Array.from(users.values()).find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '用戶不存在'
    });
  }
  
  user.preferences = { ...user.preferences, ...preferences };
  
  res.json({
    success: true,
    data: user.preferences
  });
});

// 設備管理API
app.post('/api/devices', (req, res) => {
  const { deviceId, name, type, capabilities } = req.body;
  
  const device = {
    id: deviceId,
    name: name || '未知設備',
    type: type || 'mobile',
    status: 'connected',
    capabilities: capabilities || [],
    lastSeen: Date.now(),
    batteryLevel: Math.floor(Math.random() * 30 + 70)
  };
  
  devices.push(device);
  
  // 廣播設備更新
  broadcastToAll({
    type: 'devices_updated',
    data: devices
  });
  
  res.json({
    success: true,
    data: device
  });
});

// 設備斷開API
app.delete('/api/devices/:deviceId', (req, res) => {
  const { deviceId } = req.params;
  
  const deviceIndex = devices.findIndex(d => d.id === deviceId);
  if (deviceIndex === -1) {
    return res.status(404).json({
      success: false,
      message: '設備不存在'
    });
  }
  
  devices.splice(deviceIndex, 1);
  
  // 廣播設備更新
  broadcastToAll({
    type: 'devices_updated',
    data: devices
  });
  
  res.json({
    success: true,
    message: '設備已斷開'
  });
});

// 統計數據API
app.get('/api/stats', (req, res) => {
  const stats = {
    totalDevices: devices.length,
    connectedDevices: devices.filter(d => d.status === 'connected').length,
    totalVideos: videos.length,
    activeSessions: activeSessions.size,
    totalUsers: users.size,
    categories: videoCategories.map(cat => ({
      name: cat,
      count: videos.filter(v => v.category === cat).length
    }))
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// 初始化數據
initializeVideos();
initializeUsers();

// 啟動服務器
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 專業VR播放器服務器運行在端口 ${PORT}`);
  console.log(`🔌 WebSocket服務器已啟動`);
  console.log(`📹 視頻分類: ${videoCategories.join(', ')}`);
  console.log(`👥 用戶數量: ${users.size}`);
  console.log(`📱 支持功能: 360°視頻、設備同步、WebRTC、用戶管理`);
  console.log(`🌐 綁定到所有網絡接口 (0.0.0.0:${PORT})`);
});
