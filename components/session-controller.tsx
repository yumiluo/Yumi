"use client"

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Play, 
  Pause, 
  Square, 
  Users, 
  QrCode, 
  Copy, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Monitor,
  Smartphone,
  Plus,
  Globe,
  Calendar
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import { DeviceManagementModal } from './device-management-modal';
import { YouTube360Player } from './youtube-360-player';

interface SessionControllerProps {
  onSessionCreated?: (sessionCode: string) => void;
}

interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
  lastSeen: Date;
  connectionMethod: string;
  deviceModel?: string;
}

interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  videoId: string | null;
  videoUrl: string | null;
}

interface Session {
  sessionId: string;
  joinCode: string;
  theme: string;
  createdAt: string;
  connectedDevices: number;
}

export function SessionController({ onSessionCreated }: SessionControllerProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [sessionCode, setSessionCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [devices, setDevices] = useState<Device[]>([]);
  const [videoState, setVideoState] = useState<VideoState>({
    isPlaying: false,
    currentTime: 0,
    videoId: null,
    videoUrl: null
  });
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [joinUrl, setJoinUrl] = useState<string>('');
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionTheme, setSessionTheme] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // 初始化Socket.io連接
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true
    });
    
    newSocket.on('connect', () => {
      console.log('已連接到Socket.io服務器');
      setIsConnected(true);
      setError('');
    });
    
    newSocket.on('disconnect', () => {
      console.log('與Socket.io服務器斷開連接');
      setIsConnected(false);
      setError('與服務器斷開連接');
    });
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket.io連接錯誤:', error);
      setError(`連接錯誤: ${error.message}`);
      setIsConnected(false);
    });
    
    // 監聽設備加入事件
    newSocket.on('device-joined', (data) => {
      console.log('新設備加入:', data);
      const newDevice: Device = {
        id: data.deviceId,
        name: data.deviceName || '未知設備',
        type: data.deviceType || 'unknown',
        status: 'connected',
        lastSeen: new Date(),
        connectionMethod: data.connectionMethod || 'network',
        deviceModel: data.deviceModel // 包含設備型號
      };
      
      setDevices(prev => {
        // 檢查設備是否已存在，避免重複
        const exists = prev.find(d => d.id === data.deviceId);
        if (exists) {
          return prev.map(d => d.id === data.deviceId ? { ...d, ...newDevice, lastSeen: new Date() } : d);
        }
        return [...prev, newDevice];
      });
      
      setSuccess(`設備 ${data.deviceModel || data.deviceName || '未知設備'} 已加入會話`);
    });
    
    // 監聽設備離開事件
    newSocket.on('device-left', (data) => {
      console.log('設備離開:', data);
      setDevices(prev => prev.filter(d => d.id !== data.deviceId));
      setSuccess('設備已離開會話');
    });
    
    // 監聽會話創建成功事件
    newSocket.on('session-created', (data) => {
      console.log('會話創建成功:', data);
      setSessionCode(data.joinCode);
      setJoinUrl(`http://localhost:3000/join?code=${data.joinCode}`);
      setSuccess('會話創建成功！其他設備可以使用QR碼加入');
      onSessionCreated?.(data.joinCode);
      
      // 更新當前會話信息
      setCurrentSession({
        sessionId: data.sessionId,
        joinCode: data.joinCode,
        theme: data.theme,
        createdAt: new Date().toLocaleString(),
        connectedDevices: 0
      });
      
      // 關閉創建會話表單
      setShowCreateSession(false);
      setSessionTheme('');
    });
    
    // 監聽視頻同步事件
    newSocket.on('video-sync', (data) => {
      console.log('收到視頻同步:', data);
      if (videoRef.current) {
        videoRef.current.currentTime = data.currentTime || 0;
        if (data.isPlaying) {
          videoRef.current.play();
        } else {
          videoRef.current.pause();
        }
      }
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [onSessionCreated]);

  // 創建新會話
  const createSession = async () => {
    if (!sessionTheme.trim()) {
      setError('請輸入旅遊主題');
      return;
    }
    
    setIsCreating(true);
    setError('');
    setSuccess('');
    
    try {
      console.log('Creating session with theme:', sessionTheme);
      
      // 從localStorage獲取JWT token
      const token = localStorage.getItem('jwt_token') || localStorage.getItem('auth_token');
      
      if (!token) {
        setError('請先登入系統');
        return;
      }
      
      // 調用後端API創建會話
      const response = await axios.post('http://localhost:5001/api/create-session', {
        theme: sessionTheme.trim()
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data.success) {
        const { sessionId, joinCode, theme } = response.data;
        
        // 通過Socket.io通知其他客戶端
        if (socket) {
          socket.emit('session-created', {
            sessionId,
            joinCode,
            theme,
            timestamp: Date.now()
          });
        }
        
        setSuccess('會話創建成功！其他設備可以使用QR碼加入');
        
        // 更新當前會話信息
        setCurrentSession({
          sessionId,
          joinCode,
          theme,
          createdAt: new Date().toLocaleString(),
          connectedDevices: 0
        });
        
        // 關閉創建會話表單
        setShowCreateSession(false);
        setSessionTheme('');
        
      } else {
        setError(response.data.message || '創建會話失敗');
      }
      
    } catch (err: any) {
      console.error('創建會話失敗:', err);
      if (err.response?.status === 401) {
        setError('認證失敗，請重新登入');
      } else if (err.response?.status === 400) {
        setError(err.response.data.message || '請求參數錯誤');
      } else {
        setError('創建會話失敗，請檢查網絡或重新登入');
      }
    } finally {
      setIsCreating(false);
    }
  };

  // 複製會話代碼
  const copySessionCode = () => {
    if (currentSession?.joinCode) {
      navigator.clipboard.writeText(currentSession.joinCode);
      setSuccess('會話代碼已複製到剪貼板');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  // 處理設備連接
  const handleDeviceConnected = (device: any) => {
    const newDevice: Device = {
      id: device.id,
      name: device.name,
      type: device.type || device.deviceType || 'mobile',
      status: 'connected',
      lastSeen: new Date(),
      connectionMethod: device.connectionMethod || 'wifi',
      deviceModel: device.deviceModel
    };
    
    setDevices(prev => {
      const exists = prev.find(d => d.id === device.id);
      if (exists) {
        return prev.map(d => d.id === device.id ? { ...d, ...newDevice, lastSeen: new Date() } : d);
      }
      return [...prev, newDevice];
    });
    
    setSuccess(`設備 ${device.deviceModel || device.name} 已通過${device.connectionMethod === 'wifi' ? 'Wi-Fi' : 'QR碼'}連接`);
    
    // 如果設備通過Wi-Fi連接，發送Socket.io事件
    if (device.connectionMethod === 'wifi' && socket) {
      console.log('發送Wi-Fi設備連接事件:', device);
      socket.emit('device-joined', {
        deviceId: device.id,
        deviceName: device.name,
        deviceType: device.type || device.deviceType || 'mobile',
        connectionMethod: 'wifi',
        deviceModel: device.deviceModel,
        timestamp: Date.now()
      });
    }
  };

  // 處理設備斷開
  const handleDeviceDisconnected = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    setSuccess('設備已斷開連接');
    
    // 通知服務器設備離開
    if (socket) {
      socket.emit('device-left', {
        deviceId,
        timestamp: Date.now()
      });
    }
  };

  // 播放視頻
  const playVideo = () => {
    if (!socket || !sessionCode) return;
    
    const videoUrl = videoRef.current?.src || 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
    const videoId = 'demo-video';
    
    socket.emit('play-video', {
      sessionCode,
      videoId,
      videoUrl,
      startTime: videoRef.current?.currentTime || 0,
      timestamp: Date.now()
    });
    
    setVideoState(prev => ({ ...prev, isPlaying: true }));
    setSuccess('開始播放視頻');
  };

  // 暫停視頻
  const pauseVideo = () => {
    if (!socket || !sessionCode) return;
    
    socket.emit('pause-video', {
      sessionCode,
      timestamp: Date.now()
    });
    
    setVideoState(prev => ({ ...prev, isPlaying: false }));
    setSuccess('視頻已暫停');
  };

  // 停止視頻
  const stopVideo = () => {
    if (!socket || !sessionCode) return;
    
    socket.emit('stop-video', {
      sessionCode,
      timestamp: Date.now()
    });
    
    setVideoState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    setSuccess('視頻已停止');
  };

  // 複製Join URL
  const copyJoinUrl = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setSuccess('Join URL已複製到剪貼板');
    } catch (err) {
      setError('複製失敗');
    }
  };

  // 視頻時間同步
  const handleTimeUpdate = () => {
    if (videoRef.current && socket && sessionCode) {
      const currentTime = videoRef.current.currentTime;
      setVideoState(prev => ({ ...prev, currentTime }));
      
      socket.emit('sync-time', {
        currentTime,
        sessionCode,
        timestamp: Date.now()
      });
    }
  };

  // 獲取設備顯示名稱（包含型號）
  const getDeviceDisplayName = (device: Device) => {
    if (device.deviceModel) {
      return `${device.name} (${device.deviceModel})`;
    }
    return device.name;
  };

  return (
    <div className="space-y-6">
      {/* 錯誤和成功提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* 會話創建區域 */}
      {!currentSession ? (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Globe className="h-5 w-5" />
              創建旅遊團會話
            </CardTitle>
            <CardDescription className="text-blue-700">
              創建一個新的旅遊團會話，讓其他設備可以加入並同步觀看視頻
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showCreateSession ? (
              <Button 
                onClick={() => setShowCreateSession(true)}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!isConnected}
              >
                <Plus className="mr-2 h-4 w-4" />
                創建旅遊團
              </Button>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="session-theme">旅遊主題</Label>
                  <Input
                    id="session-theme"
                    placeholder="例如：Paris Tour, Tokyo Adventure, New York City"
                    value={sessionTheme}
                    onChange={(e) => setSessionTheme(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={createSession}
                    disabled={isCreating || !sessionTheme.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Calendar className="mr-2 h-4 w-4" />
                    )}
                    {isCreating ? '創建中...' : '創建會話'}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setShowCreateSession(false);
                      setSessionTheme('');
                    }}
                  >
                    取消
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* 當前會話信息 */
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              當前會話：{currentSession.theme}
            </CardTitle>
            <CardDescription className="text-green-700">
              會話已創建，其他設備可以使用以下信息加入
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">會話ID</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono text-sm">
                    {currentSession.sessionId}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={copySessionCode}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">加入代碼</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-mono text-sm">
                    {currentSession.joinCode}
                  </Badge>
                  <Button size="sm" variant="outline" onClick={copySessionCode}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-sm font-medium">QR碼</Label>
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG 
                  value={joinUrl}
                  size={200}
                  level="M"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-600 text-center">
                掃描此QR碼加入會話
              </p>
            </div>
            
            <div className="flex items-center justify-between text-sm text-green-700">
              <span>創建時間：{currentSession.createdAt}</span>
              <span>連接設備：{currentSession.connectedDevices} 個</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 設備管理 */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              設備管理
            </CardTitle>
            <CardDescription>
              管理已連接的設備，支持Wi-Fi掃描和QR碼連接
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DeviceManagementModal
              sessionCode={sessionCode}
              onDeviceConnected={handleDeviceConnected}
              onDeviceDisconnected={handleDeviceDisconnected}
              connectedDevices={devices.map(d => ({
                id: d.id,
                name: d.name,
                type: d.type,
                connectionMethod: (d.connectionMethod === 'bluetooth' ? 'wifi' : d.connectionMethod) as 'wifi' | 'qr' | 'network',
                status: d.status as 'connected' | 'disconnected' | 'playing' | 'paused' | 'error',
                lastSeen: d.lastSeen.toLocaleString()
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* 視頻播放控制 */}
      {currentSession && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              視頻播放控制
            </CardTitle>
            <CardDescription>
              控制所有連接設備的視頻播放
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={playVideo} disabled={!sessionCode}>
                <Play className="mr-2 h-4 w-4" />
                播放
              </Button>
              <Button onClick={pauseVideo} disabled={!sessionCode} variant="outline">
                <Pause className="mr-2 h-4 w-4" />
                暫停
              </Button>
              <Button onClick={stopVideo} disabled={!sessionCode} variant="outline">
                <Square className="mr-2 h-4 w-4" />
                停止
              </Button>
            </div>
            
            {/* 視頻播放器 */}
            <div className="border rounded-lg p-4">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded"
                controls
                onTimeUpdate={() => {
                  if (videoRef.current) {
                    setVideoState(prev => ({ ...prev, currentTime: videoRef.current!.currentTime }));
                  }
                }}
              >
                <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" type="video/mp4" />
                您的瀏覽器不支持視頻播放
              </video>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 連接狀態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            連接狀態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? '已連接到服務器' : '未連接到服務器'}
              </span>
            </div>
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? '在線' : '離線'}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

