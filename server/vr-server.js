const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const validator = require('validator');
const { createClient } = require('@supabase/supabase-js');

// 創建Express應用
const app = express();
const server = http.createServer(app);

// 配置Socket.io
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 中間件
app.use(cors());
app.use(express.json());

// Supabase配置
const supabaseUrl = 'https://vdeiwyqicpkfvqntxczj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkZWl3eXFpY3BrZnZxbnR4Y3pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4MzE1NTAsImV4cCI6MjA3MTQwNzU1MH0.M-1yPcuKfNPUyAWVPCyx1hA7zEvGb-tPbwxizo96R4E';

// 創建Supabase客戶端
const supabase = createClient(supabaseUrl, supabaseKey);

// 數據庫表名
const TABLES = {
  USERS: 'users',
  SESSIONS: 'sessions',
  DEVICES: 'devices',
  VIDEOS: 'videos'
};

// 內存存儲（用於緩存和會話管理）
const sessionsCache = new Map();
const devicesCache = new Map();
const usersCache = new Map(); // 內存用戶存儲，當數據庫表不存在時使用

// 測試Supabase連接
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from(TABLES.USERS).select('count').limit(1);
    
    if (error) {
      if (error.code === 'PGRST205') {
        console.log('⚠️  Supabase連接成功，但數據庫表尚未創建');
        console.log('💡 請在Supabase Dashboard中創建必要的表，或使用內存模式運行');
        return true; // 允許系統繼續運行
      } else {
        console.error('❌ Supabase連接測試失敗:', error);
        return false;
      }
    }
    
    console.log('✅ Supabase連接成功，數據庫表已就緒');
    return true;
  } catch (error) {
    console.error('❌ Supabase連接異常:', error);
    return false;
  }
}

// 初始化時測試連接
testSupabaseConnection();

// 用戶相關函數
async function findUserByEmail(email) {
  try {
    // 首先嘗試從數據庫查找
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error) {
      if (error.code === 'PGRST205') {
        // 數據庫表不存在，使用內存存儲
        console.log('📝 使用內存用戶存儲（數據庫表尚未創建）');
        return usersCache.get(email.toLowerCase()) || null;
      } else {
        console.error('查找用戶失敗:', error);
        return null;
      }
    }
    
    return data;
  } catch (error) {
    console.error('查找用戶異常:', error);
    return null;
  }
}

async function createUser(userData) {
  try {
    // 首先嘗試保存到數據庫
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert([userData])
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST205') {
        // 數據庫表不存在，使用內存存儲
        console.log('📝 使用內存用戶存儲（數據庫表尚未創建）');
        const newUser = {
          id: Date.now().toString(),
          ...userData,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        };
        usersCache.set(userData.email.toLowerCase(), newUser);
        return newUser;
      } else {
        console.error('創建用戶失敗:', error);
        return null;
      }
    }
    
    return data;
  } catch (error) {
    console.error('創建用戶異常:', error);
    return null;
  }
}

async function updateUserLastLogin(userId) {
  try {
    // 首先嘗試更新數據庫
    const { error } = await supabase
      .from(TABLES.USERS)
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
    
    if (error) {
      if (error.code === 'PGRST205') {
        // 數據庫表不存在，更新內存存儲
        console.log('📝 更新內存用戶存儲（數據庫表尚未創建）');
        for (const [email, user] of usersCache.entries()) {
          if (user.id === userId) {
            user.last_login = new Date().toISOString();
            break;
          }
        }
      } else {
        console.error('更新用戶最後登錄時間失敗:', error);
      }
    }
  } catch (error) {
    console.error('更新用戶最後登錄時間異常:', error);
  }
}

// JWT密鑰
const JWT_SECRET = process.env.JWT_SECRET || 'vr-travel-secret-key-2024';

// 內存存儲已在上方定義（sessionsCache 和 devicesCache）

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    server: 'VR一體化服務器',
    version: '2.0.0',
    message: '前後端一體化，新手友好！'
  });
});

// 設備發現端點
app.get('/api/discover', (req, res) => {
  try {
    // 獲取當前會話信息
    const currentSessions = Array.from(sessionsCache.keys())
    const activeSession = currentSessions.length > 0 ? currentSessions[0] : null
    
    // 從請求中獲取設備信息
    const deviceName = req.query.deviceName || req.headers['user-agent'] || 'Unknown Device'
    const deviceType = req.query.deviceType || 'unknown'
    const deviceModel = req.query.deviceModel || 'Unknown Model'
    
    // 嘗試從User-Agent解析設備類型
    let detectedDeviceType = deviceType
    let detectedDeviceModel = deviceModel
    
    if (req.headers['user-agent']) {
      const userAgent = req.headers['user-agent'].toLowerCase()
      
      // 檢測VR設備
      if (userAgent.includes('quest') || userAgent.includes('vive') || userAgent.includes('pico') || 
          userAgent.includes('oculus') || userAgent.includes('vr') || userAgent.includes('headset')) {
        detectedDeviceType = 'vr'
        detectedDeviceModel = 'VR Headset'
      }
      // 檢測手機設備
      else if (userAgent.includes('iphone') || userAgent.includes('android') || userAgent.includes('mobile')) {
        detectedDeviceType = 'mobile'
        if (userAgent.includes('iphone')) {
          detectedDeviceModel = 'iPhone'
        } else if (userAgent.includes('samsung')) {
          detectedDeviceModel = 'Samsung Galaxy'
        } else if (userAgent.includes('xiaomi')) {
          detectedDeviceModel = 'Xiaomi'
        } else if (userAgent.includes('huawei')) {
          detectedDeviceModel = 'Huawei'
        } else {
          detectedDeviceModel = 'Android Device'
        }
      }
      // 檢測桌面設備
      else if (userAgent.includes('windows') || userAgent.includes('macintosh') || userAgent.includes('linux')) {
        detectedDeviceType = 'desktop'
        if (userAgent.includes('macintosh')) {
          detectedDeviceModel = 'Mac'
        } else if (userAgent.includes('windows')) {
          detectedDeviceModel = 'Windows PC'
        } else {
          detectedDeviceModel = 'Linux PC'
        }
      }
    }
    
    const deviceInfo = {
      deviceName: deviceName,
      deviceType: detectedDeviceType,
      deviceModel: detectedDeviceModel,
      status: 'available',
      sessionId: activeSession,
      timestamp: Date.now(),
      server: 'VR一體化服務器',
      version: '2.0.0',
      features: ['Socket.io', 'YouTube 360°', '設備同步', '快速掃描'],
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      port: req.connection.remotePort || 'unknown'
    };
    
    console.log(`🔍 設備發現請求: ${req.ip} -> ${JSON.stringify(deviceInfo)}`)
    res.json(deviceInfo);
  } catch (error) {
    console.error('❌ 設備發現錯誤:', error)
    res.status(500).json({ error: '設備發現失敗' })
  }
});

// 獲取系統狀態
app.get('/api/status', (req, res) => {
  const status = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    sessions: Array.from(sessionsCache.keys()),
    totalDevices: devicesCache.size,
    activeConnections: io.engine.clientsCount,
    message: '系統運行正常！'
  };
  
  res.json(status);
});

// 用戶註冊
app.post('/api/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 驗證輸入
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '電子郵件和密碼都是必需的'
      });
    }
    
    // 驗證郵箱格式
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: '請輸入有效的電子郵件地址'
      });
    }
    
    // 驗證密碼長度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密碼至少需要6個字符'
      });
    }
    
    // 檢查郵箱是否已存在
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '該電子郵件已被註冊'
      });
    }
    
    // 創建新用戶（使用Supabase）
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const newUser = {
      email: email.toLowerCase(),
      password_hash: hashedPassword,
      role: 'user'
    };
    
    const createdUser = await createUser(newUser);
    
    if (createdUser) {
      console.log(`🎉 新用戶註冊成功: ${email} (ID: ${createdUser.id})`);
      
      res.status(201).json({
        success: true,
        message: '註冊成功，請登錄'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '註冊失敗，請稍後重試'
      });
    }
    
  } catch (error) {
    console.error('❌ 用戶註冊失敗:', error);
    res.status(500).json({
      success: false,
      message: '註冊失敗，請稍後重試'
    });
  }
});

// 用戶登錄
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 驗證輸入
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '電子郵件和密碼都是必需的'
      });
    }
    
    // 查找用戶
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '無效的電子郵件或密碼'
      });
    }
    
    // 驗證密碼
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: '無效的電子郵件或密碼'
      });
    }
    
    // 更新最後登錄時間
    await updateUserLastLogin(user.id);
    
    // 生成JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      {
        expiresIn: '24h',
        issuer: 'vr-travel-system',
        audience: 'vr-travel-users'
      }
    );
    
    console.log(`🔑 用戶登錄成功: ${email} (${user.role})`);
    
    res.json({
      success: true,
      token: token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      message: '登錄成功'
    });
    
  } catch (error) {
    console.error('❌ 用戶登錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '登錄失敗，請稍後重試'
    });
  }
});

// JWT認證中間件
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '缺少認證token'
      });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: '無效的token'
        });
      }
      
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '認證失敗'
    });
  }
};

// 創建新會話
app.post('/api/create-session', authenticateToken, async (req, res) => {
  try {
    const { theme } = req.body;
    
    // 驗證請求參數
    if (!theme || typeof theme !== 'string' || theme.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '旅遊主題不能為空'
      });
    }
    
    // 生成唯一的會話ID和加入代碼
    const sessionId = 'SESSION-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const joinCode = 'JOIN-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    // 創建新會話
    const newSession = {
      id: sessionId,
      joinCode: joinCode,
      theme: theme.trim(),
      createdAt: new Date(),
      createdBy: req.user.userId, // 從JWT中獲取用戶ID
      createdByEmail: req.user.email, // 從JWT中獲取用戶郵箱
      devices: new Map(),
      currentVideo: null,
      playbackState: 'stopped',
      currentTime: 0
    };
    
    // 保存會話到Supabase
    try {
      const { data, error } = await supabase
        .from(TABLES.SESSIONS)
        .insert([{
          session_id: sessionId,
          join_code: joinCode,
          theme: theme.trim(),
          created_by: req.user.userId,
          created_by_email: req.user.email,
          current_video: null,
          playback_state: 'stopped',
          current_time: 0,
          is_active: true
        }])
        .select()
        .single();
      
      if (error) {
        if (error.code === 'PGRST205') {
          // 數據庫表不存在，只保存到內存緩存
          console.log('📝 使用內存會話存儲（數據庫表尚未創建）');
          sessionsCache.set(joinCode, newSession);
        } else {
          console.error('保存會話到Supabase失敗:', error);
          return res.status(500).json({
            success: false,
            message: '創建會話失敗，請稍後重試'
          });
        }
      } else {
        // 同時保存到內存緩存
        sessionsCache.set(joinCode, newSession);
      }
    } catch (dbError) {
      console.error('保存會話到數據庫異常:', dbError);
      // 即使數據庫失敗，也保存到內存緩存
      sessionsCache.set(joinCode, newSession);
    }
    
    console.log(`🎉 新會話已創建: ${sessionId} (${theme})`);
    
    // 返回會話信息
    res.json({
      success: true,
      sessionId: sessionId,
      joinCode: joinCode,
      theme: theme.trim(),
      message: '會話創建成功'
    });
    
  } catch (error) {
    console.error('❌ 創建會話失敗:', error);
    res.status(500).json({
      success: false,
      message: '創建會話失敗，請稍後重試'
    });
  }
});

// 獲取會話信息
app.get('/api/sessions/:sessionCode', (req, res) => {
  const { sessionCode } = req.params;
  
  if (!sessionsCache.has(sessionCode)) {
    return res.status(404).json({ error: '會話不存在' });
  }
  
  const session = sessionsCache.get(sessionCode);
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

// 提供靜態文件（用於開發）
app.use('/static', express.static(path.join(__dirname, '../public')));

// Socket.io連接處理
io.on('connection', (socket) => {
  console.log('🎉 新設備連接:', socket.id);
  
  let currentSession = null;
  let currentDevice = null;

  // 處理設備加入會話
  socket.on('join-session', (data) => {
    try {
      const { joinCode, deviceId, deviceName, deviceType, deviceModel, connectionMethod } = data;
      
      console.log('📱 設備嘗試加入會話:', {
        joinCode,
        deviceId,
        deviceName,
        deviceType,
        deviceModel,
        connectionMethod
      });

      // 檢查會話是否存在
      if (!sessionsCache.has(joinCode)) {
        socket.emit('error', { 
          message: '會話不存在或已過期',
          code: 'SESSION_NOT_FOUND'
        });
        return;
      }

      const session = sessionsCache.get(joinCode);
      
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
      devicesCache.set(deviceId, device);
      
      // 設置socket關聯
      socket.sessionCode = joinCode;
      socket.deviceId = deviceId;
      currentSession = joinCode;
      currentDevice = deviceId;

      // 確認設備加入
      socket.emit('device-joined', {
        joinCode,
        deviceId,
        status: 'connected',
        message: '🎉 成功加入會話！'
      });

      // 廣播設備加入事件到會話中的其他設備
      socket.to(joinCode).emit('device-joined', {
        deviceId,
        deviceName: device.name,
        deviceType: device.type,
        deviceModel: device.model,
        connectionMethod: device.connectionMethod,
        timestamp: Date.now()
      });

      // 同時廣播到控制器（如果存在）
      socket.emit('device-joined', {
        deviceId,
        deviceName: device.name,
        deviceType: device.type,
        deviceModel: device.model,
        connectionMethod: device.connectionMethod,
        timestamp: Date.now()
      });

      // 發送當前會話狀態
      socket.emit('session-state', {
        joinCode,
        deviceCount: session.devices.size,
        currentVideo: session.currentVideo,
        playbackState: session.playbackState,
        currentTime: session.currentTime
      });

      console.log(`✅ 設備 ${deviceName} (${deviceModel}) 成功加入會話 ${sessionCode}`);
      console.log(`📊 會話 ${sessionCode} 當前設備數量: ${session.devices.size}`);

    } catch (error) {
      console.error('❌ 處理設備加入會話時出錯:', error);
      socket.emit('error', {
        message: '加入會話失敗',
        error: error.message
      });
    }
  });

  // 處理會話創建確認（通過API創建後的通知）
  socket.on('session-created', (data) => {
    try {
      const { sessionId, joinCode, theme } = data;
      
      console.log('🎬 會話創建確認:', joinCode);

      // 創建會話記錄（如果不存在）
      if (!sessionsCache.has(joinCode)) {
        const newSession = {
          id: sessionId || `session-${Date.now()}`,
          joinCode,
          theme: theme || '旅遊',
          createdAt: new Date().toISOString(),
          devices: new Map(),
          currentVideo: null,
          playbackState: 'stopped',
          currentTime: 0
        };
        
        sessionsCache.set(joinCode, newSession);
        console.log(`📝 創建新會話: ${joinCode}`);
      }

      // 加入會話房間
      socket.join(joinCode);
      socket.sessionCode = joinCode;
      currentSession = joinCode;

      // 廣播會話創建成功事件
      socket.broadcast.emit('session-created', {
        sessionId,
        joinCode,
        theme,
        timestamp: Date.now()
      });

      // 向發送者發送確認事件
      socket.emit('session-created', {
        sessionId,
        joinCode,
        theme,
        timestamp: Date.now()
      });

      console.log(`✅ 會話 ${joinCode} 創建確認成功`);

    } catch (error) {
      console.error('❌ 會話創建確認時出錯:', error);
      socket.emit('error', {
        message: '會話創建確認失敗',
        error: error.message
      });
    }
  });

  // 處理獲取會話設備列表請求
  socket.on('get-session-devices', (data) => {
    try {
      const { sessionCode } = data;
      
      if (!sessionCode || !sessionsCache.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessionsCache.get(sessionCode);
      const devices = Array.from(session.devices.values());
      
      console.log(`📱 發送會話 ${sessionCode} 的設備列表:`, devices.length, '個設備');
      
      socket.emit('session-devices', {
        sessionCode,
        devices: devices.map(device => ({
          deviceId: device.id,
          deviceName: device.name,
          deviceType: device.type,
          deviceModel: device.model,
          connectionMethod: device.connectionMethod,
          joinedAt: device.joinedAt,
          lastSeen: device.lastSeen,
          status: device.status
        }))
      });

    } catch (error) {
      console.error('❌ 獲取會話設備列表時出錯:', error);
      socket.emit('error', {
        message: '獲取設備列表失敗',
        error: error.message
      });
    }
  });

  // 處理設備斷開連接請求
  socket.on('disconnect-device', (data) => {
    try {
      const { sessionCode, deviceId } = data;
      
      if (!sessionCode || !sessionsCache.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessionsCache.get(sessionCode);
      const device = session.devices.get(deviceId);
      
      if (!device) {
        socket.emit('error', { message: '設備不存在' });
        return;
      }

      // 從會話中移除設備
      session.devices.delete(deviceId);
      devicesCache.delete(deviceId);
      
      console.log(`📱 手動斷開設備 ${device.name} (${deviceId})`);

      // 廣播設備離開事件
      socket.to(sessionCode).emit('device-left', {
        deviceId,
        timestamp: Date.now()
      });

      // 同時發送到控制器
      socket.emit('device-left', {
        deviceId,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ 斷開設備連接時出錯:', error);
      socket.emit('error', {
        message: '斷開設備失敗',
        error: error.message
      });
    }
  });

  // 處理視頻播放
  socket.on('play-video', (data) => {
    try {
      const { sessionCode, videoId, videoUrl, startTime } = data;
      
      if (!sessionCode || !sessionsCache.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessionsCache.get(sessionCode);
      session.currentVideo = videoUrl;
      session.playbackState = 'playing';
      session.currentTime = startTime || 0;

      console.log(`🎥 會話 ${sessionCode} 開始播放視頻:`, videoUrl);
      console.log(`📱 視頻ID: ${videoId}, 開始時間: ${startTime}s`);

      // 廣播播放命令到會話中的所有設備
      socket.to(sessionCode).emit('video-sync', {
        type: 'play',
        videoId,
        videoUrl,
        startTime: session.currentTime,
        serverTimestamp: Date.now()
      });

      console.log(`📡 已廣播播放命令到 ${session.devices.size} 個設備`);

    } catch (error) {
      console.error('❌ 處理視頻播放時出錯:', error);
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
      
      if (!sessionCode || !sessionsCache.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessionsCache.get(sessionCode);
      session.playbackState = 'paused';

      console.log(`⏸️ 會話 ${sessionCode} 暫停播放`);

      // 廣播暫停命令
      socket.to(sessionCode).emit('video-sync', {
        type: 'pause',
        serverTimestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ 處理視頻暫停時出錯:', error);
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
      
      if (!sessionCode || !sessionsCache.has(sessionCode)) {
        socket.emit('error', { message: '無效的會話' });
        return;
      }

      const session = sessionsCache.get(sessionCode);
      session.playbackState = 'stopped';
      session.currentVideo = null;
      session.currentTime = 0;

      console.log(`⏹️ 會話 ${sessionCode} 停止播放`);

      // 廣播停止命令
      socket.to(sessionCode).emit('video-sync', {
        type: 'stop',
        serverTimestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ 處理視頻停止時出錯:', error);
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
      
      if (!sessionCode || !sessionsCache.has(sessionCode)) {
        return;
      }

      const session = sessionsCache.get(sessionCode);
      session.currentTime = currentTime;

      // 廣播時間同步到其他設備
      socket.to(sessionCode).emit('video-sync', {
        type: 'time-sync',
        currentTime,
        serverTimestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ 處理時間同步時出錯:', error);
    }
  });

  // 處理設備離開
  socket.on('device-left', (data) => {
    try {
      const { deviceId } = data;
      
      if (deviceId && devicesCache.has(deviceId)) {
        const device = devicesCache.get(deviceId);
        console.log(`👋 設備 ${device.name} 主動離開`);
        
        // 從會話中移除設備
        if (currentSession && sessionsCache.has(currentSession)) {
          const session = sessionsCache.get(currentSession);
          session.devices.delete(deviceId);
          
          // 廣播設備離開事件
          socket.to(currentSession).emit('device-left', {
            deviceId,
            timestamp: Date.now()
          });
          
          console.log(`✅ 設備已從會話 ${currentSession} 中移除`);
        }
        
        // 清理設備記錄
        devicesCache.delete(deviceId);
      }
    } catch (error) {
      console.error('❌ 處理設備離開時出錯:', error);
    }
  });

  // 處理斷開連接
  socket.on('disconnect', () => {
    console.log('🔌 設備斷開連接:', socket.id);
    
    try {
      // 清理設備記錄
      if (currentDevice && devicesCache.has(currentDevice)) {
        const device = devicesCache.get(currentDevice);
        console.log(`👋 設備 ${device.name} 斷開連接`);
        
        // 從會話中移除設備
        if (currentSession && sessionsCache.has(currentSession)) {
          const session = sessionsCache.get(currentSession);
          session.devices.delete(currentDevice);
          
          // 廣播設備離開事件
          socket.to(currentSession).emit('device-left', {
            deviceId: currentDevice,
            timestamp: Date.now()
          });
          
          console.log(`✅ 設備已從會話 ${currentSession} 中移除`);
          
          // 如果會話中沒有設備了，清理會話
          if (session.devices.size === 0) {
            sessionsCache.delete(currentSession);
            console.log(`🗑️ 會話 ${currentSession} 中移除`);
          }
        }
        
        // 清理設備記錄
        devicesCache.delete(currentDevice);
      }
    } catch (error) {
      console.error('❌ 處理斷開連接時出錯:', error);
    }
  });

  // 處理錯誤
  socket.on('error', (error) => {
    console.error('🚨 Socket錯誤:', error);
  });
});

// 定期清理離線設備
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5分鐘超時
  
  for (const [deviceId, device] of devicesCache.entries()) {
    if (now - device.lastSeen > timeout) {
      console.log(`⏰ 設備 ${device.name} 超時，標記為離線`);
      device.status = 'offline';
      
      // 從會話中移除離線設備
      if (device.sessionCode && sessionsCache.has(device.sessionCode)) {
        const session = sessionsCache.get(device.sessionCode);
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

// 啟動服務器
const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log('🎉 ========================================');
  console.log('🚀 VR多設備視頻播放系統 - 一體化版本');
  console.log('🎯 新手友好，一鍵啟動！');
  console.log('========================================');
  console.log(`📱 前端地址: http://localhost:3000`);
  console.log(`🔧 後端地址: http://localhost:${PORT}`);
  console.log(`📊 系統狀態: http://localhost:${PORT}/api/status`);
  console.log(`🔍 健康檢查: http://localhost:${PORT}/api/health`);
  console.log('========================================');
  console.log('💡 使用說明:');
  console.log('1. 前端已自動啟動在端口3000');
  console.log('2. 後端Socket.io服務運行在端口5001');
  console.log('3. 手機和電腦在同一Wi-Fi網絡即可使用');
  console.log('4. 無需複雜配置，開箱即用！');
  console.log('========================================');
});

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉VR系統...');
  server.close(() => {
    console.log('✅ VR系統已關閉');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n🛑 正在關閉VR系統...');
  server.close(() => {
    console.log('✅ VR系統已關閉');
    process.exit(0);
  });
});
