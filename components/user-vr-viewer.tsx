"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Play, 
  Pause, 
  Square, 
  QrCode, 
  Smartphone, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Monitor,
  Wifi,
  X
} from "lucide-react"
import { io, Socket } from 'socket.io-client'
// 聲明YouTube IFrame API
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface UserVRViewerProps {
  onClose?: () => void
}

interface VideoState {
  isPlaying: boolean
  currentTime: number
  videoUrl: string | null
  videoId: string | null
}

export function UserVRViewer({ onClose }: UserVRViewerProps) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [sessionCode, setSessionCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [videoState, setVideoState] = useState<VideoState>({
    isPlaying: false,
    currentTime: 0,
    videoUrl: null,
    videoId: null
  })
  const [deviceInfo, setDeviceInfo] = useState({
    id: '',
    name: '',
    type: '',
    model: ''
  })
  
  const videoRef = useRef<HTMLVideoElement>(null)

  // 初始化設備信息
  useEffect(() => {
    // 簡單的設備檢測（不使用ua-parser-js）
    const userAgent = navigator.userAgent
    let deviceType = 'mobile'
    let deviceModel = '未知設備'
    
    if (userAgent.includes('iPhone')) {
      deviceModel = 'iPhone'
      if (userAgent.includes('OS 17')) deviceModel += ' 17'
      else if (userAgent.includes('OS 16')) deviceModel += ' 16'
      else if (userAgent.includes('OS 15')) deviceModel += ' 15'
    } else if (userAgent.includes('Android')) {
      if (userAgent.includes('Samsung')) {
        deviceModel = 'Samsung Galaxy'
      } else if (userAgent.includes('Xiaomi')) {
        deviceModel = 'Xiaomi'
      } else if (userAgent.includes('Huawei')) {
        deviceModel = 'Huawei'
      } else {
        deviceModel = 'Android Device'
      }
    } else if (userAgent.includes('iPad')) {
      deviceType = 'tablet'
      deviceModel = 'iPad'
    } else if (userAgent.includes('Mac')) {
      deviceType = 'desktop'
      deviceModel = 'Mac'
    } else if (userAgent.includes('Windows')) {
      deviceType = 'desktop'
      deviceModel = 'Windows PC'
    }
    
    // 生成唯一設備ID
    const deviceId = 'DEVICE-' + Math.random().toString(36).substr(2, 8).toUpperCase()
    
    setDeviceInfo({
      id: deviceId,
      name: `${deviceType} ${deviceId}`,
      type: deviceType,
      model: deviceModel
    })
    
    console.log('設備信息:', {
      id: deviceId,
      name: `${deviceType} ${deviceId}`,
      type: deviceType,
      model: deviceModel,
      userAgent: navigator.userAgent
    })
  }, [])

  // 初始化Socket.io連接
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true
    })
    
    newSocket.on('connect', () => {
      console.log('已連接到Socket.io服務器')
      setIsConnected(true)
      setError('')
    })
    
    newSocket.on('disconnect', () => {
      console.log('與Socket.io服務器斷開連接')
      setIsConnected(false)
      setError('與服務器斷開連接')
    })
    
    newSocket.on('connect_error', (error) => {
      console.error('Socket.io連接錯誤:', error)
      setError(`連接錯誤: ${error.message}`)
      setIsConnected(false)
    })
    
    // 監聽會話狀態更新
    newSocket.on('session-state', (data) => {
      console.log('收到會話狀態:', data)
      setSuccess(`已加入會話 ${data.sessionCode}`)
    })
    
      // 監聽視頻同步事件
  newSocket.on('video-sync', (data) => {
    console.log('收到視頻同步:', data)
    
    const { type, videoId, videoUrl, startTime, currentTime, timestamp } = data
    const serverTimestamp = timestamp || Date.now()
    const clientTimestamp = Date.now()
    const networkDelay = clientTimestamp - serverTimestamp
    
    console.log(`⏱️ 網絡延遲: ${networkDelay}ms`)
    
    switch (type) {
      case 'play':
        setVideoState(prev => ({
          ...prev,
          isPlaying: true,
          videoUrl: data.videoUrl,
          videoId: data.videoId,
          currentTime: data.startTime || 0
        }))
        
        if (videoRef.current) {
          const adjustedTime = Math.max(0, (data.startTime || 0) + (networkDelay / 1000))
          videoRef.current.currentTime = adjustedTime
          videoRef.current.play().catch(err => {
            console.error('播放視頻失敗:', err)
            setError('播放視頻失敗')
          })
        }
        break
        
      case 'pause':
        setVideoState(prev => ({ ...prev, isPlaying: false }))
        if (videoRef.current) {
          videoRef.current.pause()
        }
        break
        
      case 'stop':
        setVideoState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0,
          videoUrl: null,
          videoId: null
        }))
        if (videoRef.current) {
          videoRef.current.pause()
          videoRef.current.currentTime = 0
        }
        break
        
      case 'time-sync':
        if (Math.abs(currentTime - videoState.currentTime) > 1) {
          const adjustedTime = Math.max(0, currentTime + (networkDelay / 1000))
          setVideoState(prev => ({ ...prev, currentTime: adjustedTime }))
          if (videoRef.current) {
            videoRef.current.currentTime = adjustedTime
          }
          console.log(`🔄 時間同步: ${adjustedTime}s`)
        }
        break
    }
  })
    
    // 監聽錯誤事件
    newSocket.on('error', (data) => {
      console.error('服務器錯誤:', data)
      setError(data.message || '服務器錯誤')
    })
    
    setSocket(newSocket)
    
    return () => {
      newSocket.close()
    }
  }, [])

  // 加入會話
  const joinSession = async () => {
    if (!socket || !sessionCode.trim()) return
    
    setIsJoining(true)
    setError('')
    setSuccess('')
    
    try {
      console.log('嘗試加入會話:', sessionCode)
      
      socket.emit('join-session', {
        joinCode: sessionCode.trim(),
        deviceId: deviceInfo.id,
        deviceName: deviceInfo.name,
        deviceType: deviceInfo.type,
        deviceModel: deviceInfo.model,
        connectionMethod: 'network',
        timestamp: Date.now()
      })
      
      setSuccess('正在加入會話...')
      
    } catch (err: any) {
      setError('加入會話失敗: ' + err.message)
    } finally {
      setIsJoining(false)
    }
  }

  // 處理視頻時間更新
  const handleTimeUpdate = () => {
    if (videoRef.current && socket && sessionCode) {
      const currentTime = videoRef.current.currentTime
      setVideoState(prev => ({ ...prev, currentTime }))
      
      // 發送時間同步到服務器
      socket.emit('sync-time', {
        sessionCode: sessionCode,
        currentTime,
        timestamp: Date.now()
      })
    }
  }

  // 處理視頻播放
  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('播放失敗:', err)
        setError('播放失敗')
      })
    }
  }

  // 處理視頻暫停
  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  // 處理視頻停止
  const handleStop = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 頂部導航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Smartphone className="h-8 w-8 text-green-600" />
              <h1 className="text-xl font-semibold text-gray-900">VR視頻觀看器</h1>
              <Badge variant="secondary" className="hidden md:inline-flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                用戶模式
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {onClose && (
                <Button variant="outline" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                  關閉
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 連接控制 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="h-5 w-5" />
                會話連接
              </CardTitle>
              <CardDescription>
                連接到控制器會話以同步觀看VR視頻
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 連接狀態 */}
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm">
                  {isConnected ? '已連接到服務器' : '未連接'}
                </span>
              </div>
              
              {/* 設備信息 */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">設備信息</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>設備ID:</strong> {deviceInfo.id}</p>
                  <p><strong>設備名稱:</strong> {deviceInfo.name}</p>
                  <p><strong>設備類型:</strong> {deviceInfo.type}</p>
                  <p><strong>設備型號:</strong> {deviceInfo.model}</p>
                </div>
              </div>
              
              {/* 會話代碼輸入 */}
              <div className="space-y-2">
                <label htmlFor="sessionCode" className="text-sm font-medium text-gray-700">
                  會話代碼
                </label>
                <div className="flex gap-2">
                  <Input
                    id="sessionCode"
                    placeholder="輸入會話代碼，如：SESSION-ABC123"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && joinSession()}
                  />
                  <Button
                    onClick={joinSession}
                    disabled={!isConnected || isJoining || !sessionCode.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isJoining ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    加入會話
                  </Button>
                </div>
              </div>
              
              {/* 連接說明 */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">連接說明</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 確保與控制器在同一Wi-Fi網絡</li>
                  <li>• 從控制器獲取會話代碼</li>
                  <li>• 輸入會話代碼並點擊"加入會話"</li>
                  <li>• 連接成功後將自動同步視頻播放</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 視頻播放器 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                視頻播放器
              </CardTitle>
              <CardDescription>
                {videoState.videoUrl ? '正在播放同步視頻' : '等待控制器發送視頻'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {videoState.videoUrl ? (
                <>
                  {/* 視頻播放器 */}
                  <div className="relative">
                    <video
                      ref={videoRef}
                      className="w-full h-64 object-cover rounded-lg"
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      src={videoState.videoUrl}
                    />
                  </div>
                  
                  {/* 播放控制 */}
                  <div className="flex justify-center gap-2">
                    <Button
                      onClick={handlePlay}
                      disabled={videoState.isPlaying}
                      size="sm"
                    >
                      <Play className="mr-2 h-4 w-4" />
                      播放
                    </Button>
                    <Button
                      onClick={handlePause}
                      disabled={!videoState.isPlaying}
                      size="sm"
                      variant="outline"
                    >
                      <Pause className="mr-2 h-4 w-4" />
                      暫停
                    </Button>
                    <Button
                      onClick={handleStop}
                      size="sm"
                      variant="outline"
                    >
                      <Square className="mr-2 h-4 w-4" />
                      停止
                    </Button>
                  </div>
                  
                  {/* 播放狀態 */}
                  <div className="text-center">
                    <Badge variant="default" className="text-sm">
                      {videoState.isPlaying ? '正在播放中' : '已暫停'} - 與控制器同步
                    </Badge>
                    <div className="text-xs text-gray-500 mt-1">
                      當前時間: {Math.floor(videoState.currentTime / 60)}:{(videoState.currentTime % 60).toFixed(0).padStart(2, '0')}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Monitor className="mx-auto h-16 w-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">等待視頻</h3>
                  <p className="text-sm">請先加入會話，控制器將發送視頻進行同步播放</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 錯誤和成功提示 */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mt-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </main>
    </div>
  )
}
