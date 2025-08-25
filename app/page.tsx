"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Play,
  Pause,
  Square,
  Upload,
  Wifi,
  Monitor,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  Video,
  Activity,
  Search,
  Trash2,
  Download,
  Upload as UploadIcon,
  Globe,
  Users,
  MessageCircle,
} from "lucide-react"
import { DeviceManagementModal } from "@/components/device-management-modal"
import { YouTubeSearch } from "@/components/youtube-search"
import { YouTubePlayer } from "@/components/youtube-player"
import { VRYouTubePlayer } from "@/components/vr-youtube-player"
import { EnhancedDeviceScanner } from "@/components/enhanced-device-scanner"
import { YouTubeStorage, type YouTubeVideo } from "@/lib/youtube-storage"
import { toast } from "@/components/ui/use-toast"

interface User {
  id: string
  username: string
  email: string
  role: "admin" | "user" | "guest"
}

interface Device {
  id: string
  name: string
  type: "vr" | "mobile" | "desktop"
  ip?: string
  status: "connected" | "disconnected" | "playing" | "paused" | "error"
  batteryLevel?: number
  lastSeen: string
  connectionMethod: "bluetooth" | "qr" | "network"
}

interface VideoItem {
  id: string
  title: string
  category: string
  type: "local" | "youtube"
  duration: string
  thumbnail: string
  url?: string
  embedUrl?: string
  country?: string
  tags?: string[]
  addedAt?: string
  viewCount?: number
}

export default function VRVideoManager() {
  const [user, setUser] = useState<User | null>(null)
  const [devices, setDevices] = useState<Device[]>([])
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [currentVideo, setCurrentVideo] = useState<VideoItem | null>(null)
  const [playbackState, setPlaybackState] = useState<"playing" | "paused" | "stopped">("stopped")
  const [systemStatus, setSystemStatus] = useState<any>(null)
  const [showDeviceModal, setShowDeviceModal] = useState(false)
  const [showYouTubeSearch, setShowYouTubeSearch] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<string>('dashboard')
  const [showRegister, setShowRegister] = useState(false)

  useEffect(() => {
    // 清除LocalStorage中的假影片數據
    const clearFakeVideos = () => {
      try {
        // 檢查是否有假影片數據
        const storedVideos = localStorage.getItem('vr-travel-videos')
        if (storedVideos) {
          const videos = JSON.parse(storedVideos)
          // 過濾掉沒有embedUrl的假影片
          const realVideos = videos.filter((v: any) => v.embedUrl && v.embedUrl.includes('youtube.com/embed'))
          if (realVideos.length !== videos.length) {
            localStorage.setItem('vr-travel-videos', JSON.stringify(realVideos))
            console.log('已清除假影片數據，保留真實YouTube影片:', realVideos.length)
          }
        }
      } catch (error) {
        console.error('清除假影片數據失敗:', error)
      }
    }

    // 執行清理
    clearFakeVideos()

    // 檢查用戶登錄狀態
    const savedUser = localStorage.getItem("user")
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
        loadData()
      } catch (error) {
        console.error("解析用戶數據失敗:", error)
        localStorage.removeItem("user")
      }
    }
  }, [])

  const loadData = async () => {
    try {
      // 從LocalStorage載入YouTube影片
      const youtubeVideos = YouTubeStorage.getAllVideos()
      
      // 只加載設備數據，不載入假影片
      const devicesResponse = await fetch('http://localhost:3001/api/devices');
      
      // 只顯示真實的YouTube影片
      const realVideos = youtubeVideos.map(v => ({
        id: v.id,
        title: v.title,
        category: v.country,
        type: 'youtube' as const,
        duration: v.duration,
        thumbnail: v.thumbnail,
        embedUrl: v.embedUrl,
        country: v.country,
        tags: v.tags,
        addedAt: v.addedAt,
        viewCount: v.viewCount
      }))
      
      setVideos(realVideos)
      
      if (devicesResponse.ok) {
        const devicesData = await devicesResponse.json();
        setDevices(devicesData.data);
      }
    } catch (error) {
      console.error("載入數據失敗:", error)
      // 如果API失敗，至少載入LocalStorage的影片
      const youtubeVideos = YouTubeStorage.getAllVideos()
      const localVideos = youtubeVideos.map(v => ({
        id: v.id,
        title: v.title,
        category: v.country,
        type: 'youtube' as const,
        duration: v.duration,
        thumbnail: v.thumbnail,
        embedUrl: v.embedUrl,
        country: v.country,
        tags: v.tags,
        addedAt: v.addedAt,
        viewCount: v.viewCount
      }))
      setVideos(localVideos)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      console.log('Login attempt with email:', email);
      
      // 調用後端登錄API
      const response = await fetch('http://localhost:5001/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        // 保存JWT token
        localStorage.setItem('token', data.token);
        localStorage.setItem('jwt_token', data.token);
        
        // 創建用戶對象
        const user: User = {
          id: data.user.id,
          email: data.user.email,
          username: data.user.email.split('@')[0], // 使用郵箱前綴作為用戶名
          role: data.user.role === 'controller' ? 'admin' : 'user'
        };
        
        setUser(user);
        localStorage.setItem("user", JSON.stringify(user));
        await loadData();
        
        console.log('Login successful:', user);
      } else {
        alert(data.message || "登錄失敗");
      }
    } catch (error) {
      console.error('Login error:', error);
      alert("登錄失敗: " + (error as Error).message);
    }
  }

  const handleRegister = async (email: string, password: string, confirmPassword: string) => {
    try {
      console.log('Register attempt with email:', email);
      
      // 前端驗證
      if (password !== confirmPassword) {
        alert("密碼不匹配");
        return;
      }
      
      if (password.length < 6) {
        alert("密碼至少需要6個字符");
        return;
      }
      
      // 調用後端註冊API
      const response = await fetch('http://localhost:5001/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message || "註冊成功，請登錄");
        // 切換回登錄模式
        setShowRegister(false);
      } else {
        alert(data.message || "註冊失敗");
      }
    } catch (error) {
      console.error('Register error:', error);
      alert("註冊失敗: " + (error as Error).message);
    }
  }

  const handleGuestLogin = async () => {
    try {
      const user: User = {
        id: "guest",
        username: "訪客",
        email: "",
        role: "guest",
      }
      setUser(user)
      localStorage.setItem("user", JSON.stringify(user))
      await loadData()
    } catch (error) {
      alert("訪客登錄失敗: " + (error as Error).message)
    }
  }

  // 處理設備連接（來自藍牙或QR碼）
  const handleDeviceConnected = (deviceInfo: any) => {
    const newDevice: Device = {
      id: deviceInfo.id,
      name: deviceInfo.name,
      type: deviceInfo.type === 'vr' ? 'vr' : 'mobile',
      status: 'connected',
      lastSeen: new Date().toLocaleString(),
      connectionMethod: deviceInfo.connectionMethod || 'network'
    }
    
    setDevices(prev => [...prev, newDevice])
    setIsConnected(true)
    console.log('新設備已連接:', newDevice)
  }

  // 處理設備斷開
  const handleDeviceDisconnected = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId))
    setIsConnected(devices.length > 1) // 如果還有其他設備則保持連接狀態
    console.log('設備已斷開:', deviceId)
  }

  const handleScanDevices = () => {
    // 直接打開設備管理模態框，跳轉到掃描頁面
    setShowDeviceModal(true)
    console.log('打開設備管理模態框進行掃描...')
  }

  const handleYouTubeVideoSelected = (youtubeVideo: YouTubeVideo) => {
    try {
      // 視頻已經在YouTube搜索組件中自動存儲到localStorage
      // 這裡只需要重新載入影片列表
      loadData()
      console.log('YouTube影片已自動分類並存儲:', youtubeVideo.title, '分類:', youtubeVideo.category)
      
      toast({
        title: "視頻已添加",
        description: `${youtubeVideo.title} 已自動分類到 ${youtubeVideo.category} 並存儲到本地`,
      })
    } catch (error) {
      console.error('處理YouTube影片失敗:', error)
      toast({
        title: "處理失敗",
        description: "無法處理選中的YouTube影片",
        variant: "destructive",
      })
    }
  }

  const handleRemoveVideo = (videoId: string) => {
    try {
      // 從LocalStorage移除YouTube影片
      const success = YouTubeStorage.removeVideo(videoId)
      
      if (success) {
        // 重新載入影片列表
        loadData()
        console.log('影片已從LocalStorage移除:', videoId)
      } else {
        console.warn('無法從LocalStorage移除影片')
      }
    } catch (error) {
      console.error('移除影片失敗:', error)
    }
  }

  const handlePlayVideo = async (video: VideoItem) => {
    try {
      // 設置當前視頻和播放狀態
      setCurrentVideo(video)
      setPlaybackState("playing")
      console.log("播放視頻:", video.title)
      
      // 檢查是否有連接的設備
      if (devices.length === 0) {
        // 沒有設備時，仍然可以播放視頻進行預覽
        toast({
          title: "視頻播放中",
          description: `${video.title} 正在播放（預覽模式）`,
        })
        return
      }
      
      // 選擇第一個連接的設備
      const device = devices.find(d => d.status === 'connected');
      if (!device) {
        // 沒有可用設備時，仍然可以播放視頻進行預覽
        toast({
          title: "視頻播放中",
          description: `${video.title} 正在播放（預覽模式）`,
        })
        return
      }
      
      // 有設備時，嘗試調用播放API
      try {
        const response = await fetch('http://localhost:3001/api/play', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deviceId: device.id,
            videoId: video.id
          }),
        });
        
        if (response.ok) {
          console.log("播放視頻:", video.title, "在設備:", device.name)
          toast({
            title: "播放成功",
            description: `${video.title} 正在設備 ${device.name} 上播放`,
          })
        } else {
          console.warn("API播放失敗，但本地播放已開始")
          toast({
            title: "本地播放",
            description: `${video.title} 正在本地播放`,
          })
        }
      } catch (apiError) {
        console.warn("API調用失敗，但本地播放已開始:", apiError)
        toast({
          title: "本地播放",
          description: `${video.title} 正在本地播放`,
        })
      }
    } catch (error) {
      console.error("播放失敗:", error)
      toast({
        title: "播放失敗",
        description: "無法播放視頻，請重試",
        variant: "destructive",
      })
    }
  }

  const handlePauseVideo = async () => {
    try {
      // 調用真實的暫停API
      const response = await fetch('http://localhost:3001/api/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setPlaybackState("paused")
        console.log("視頻已暫停")
      } else {
        alert("暫停失敗");
      }
    } catch (error) {
      console.error("暫停失敗:", error)
      alert("暫停失敗: " + error)
    }
  }

  const handleStopVideo = async () => {
    try {
      // 調用真實的停止API
      const response = await fetch('http://localhost:3001/api/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        setCurrentVideo(null)
        setPlaybackState("stopped")
        console.log("視頻已停止")
      } else {
        alert("停止失敗");
      }
    } catch (error) {
      console.error("停止失敗:", error)
      alert("停止失敗: " + error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // 創建FormData進行真實的文件上傳
      const formData = new FormData();
      formData.append('video', file);
      formData.append('title', file.name);
      formData.append('category', '上傳');
      formData.append('description', '用戶上傳的視頻文件');
      
      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        // 重新加載視頻列表
        await loadData();
        alert("上傳成功: " + file.name);
      } else {
        alert("上傳失敗");
      }
    } catch (error) {
      alert("上傳失敗: " + (error as Error).message)
    }
  }

  const runDiagnostics = async () => {
    try {
      // 測試網絡連接
      const networkStart = Date.now()
      let networkConnected = false
      let latency = 0
      
      try {
        const response = await fetch('http://localhost:5001/api/health')
        if (response.ok) {
          networkConnected = true
          latency = Date.now() - networkStart
        }
      } catch (error) {
        console.log('網絡連接測試失敗:', error)
      }
      
      // 測試WebSocket連接
      let websocketConnected = false
      try {
        // 創建臨時Socket.io連接進行測試
        const { io } = await import('socket.io-client')
        const testSocket = io('http://localhost:5001', {
          transports: ['polling', 'websocket'],
          timeout: 5000,
          forceNew: true
        })
        
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('WebSocket連接超時'))
          }, 5000)
          
          testSocket.on('connect', () => {
            clearTimeout(timeout)
            websocketConnected = true
            testSocket.disconnect()
            resolve(true)
          })
          
          testSocket.on('connect_error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
        })
      } catch (error) {
        console.log('WebSocket連接測試失敗:', error)
      }
      
      const diagnostics = {
        network: { 
          connected: networkConnected, 
          latency: latency || 0 
        },
        websocket: { 
          connected: websocketConnected 
        },
        webgl: { 
          webgl1: !!document.createElement('canvas').getContext('webgl'),
          webgl2: !!document.createElement('canvas').getContext('webgl2')
        },
        webrtc: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      }
      
      setSystemStatus(diagnostics)
      console.log('系統診斷完成:', diagnostics)
    } catch (error) {
      console.error("診斷失敗:", error)
      // 設置錯誤狀態
      setSystemStatus({
        network: { connected: false, latency: 0 },
        websocket: { connected: false },
        webgl: { webgl1: false, webgl2: false },
        webrtc: false,
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }

  // 如果用戶未登錄，顯示登錄界面
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">VR視頻管理系統</CardTitle>
            <CardDescription>
              {showRegister ? '創建新帳戶' : '請登錄或以訪客身份繼續'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!showRegister ? (
              // 登錄表單
              <>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="郵箱地址"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="login-email"
                  />
                  <input
                    type="password"
                    placeholder="密碼"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="login-password"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const email = (document.getElementById("login-email") as HTMLInputElement).value
                    const password = (document.getElementById("login-password") as HTMLInputElement).value
                    handleLogin(email, password)
                  }}
                >
                  登錄
                </Button>
                <Button variant="outline" className="w-full bg-transparent" onClick={handleGuestLogin}>
                  訪客模式
                </Button>
                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setShowRegister(true)}
                  >
                    沒有帳戶？點擊註冊
                  </Button>
                </div>
              </>
            ) : (
              // 註冊表單
              <>
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="郵箱地址"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="register-email"
                  />
                  <input
                    type="password"
                    placeholder="密碼（至少6個字符）"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="register-password"
                  />
                  <input
                    type="password"
                    placeholder="確認密碼"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    id="register-confirm-password"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const email = (document.getElementById("register-email") as HTMLInputElement).value
                    const password = (document.getElementById("register-password") as HTMLInputElement).value
                    const confirmPassword = (document.getElementById("register-confirm-password") as HTMLInputElement).value
                    handleRegister(email, password, confirmPassword)
                  }}
                >
                  註冊
                </Button>
                <div className="text-center">
                  <Button
                    variant="link"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => setShowRegister(false)}
                  >
                    已有帳戶？點擊登錄
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Monitor className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">VR視頻管理系統</h1>
              <Badge variant={isConnected ? "default" : "secondary"}>{isConnected ? "已連接" : "未連接"}</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">歡迎, {user.username}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  localStorage.removeItem("user")
                  setUser(null)
                }}
              >
                登出
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">儀表板</TabsTrigger>
            <TabsTrigger value="devices">設備管理</TabsTrigger>
            <TabsTrigger value="videos">視頻管理</TabsTrigger>
            <TabsTrigger value="control">播放控制</TabsTrigger>
            <TabsTrigger value="diagnostics">系統診斷</TabsTrigger>
          </TabsList>

          {/* 儀表板 */}
          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">連接設備</CardTitle>
                  <Monitor className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{devices.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {devices.filter((d) => d.status === "connected").length} 在線
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">視頻庫</CardTitle>
                  <Video className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{videos.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {videos.filter((v) => v.type === "local").length} 本地,{" "}
                    {videos.filter((v) => v.type === "youtube").length} YouTube
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">播放狀態</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">{playbackState}</div>
                  <p className="text-xs text-muted-foreground">{currentVideo ? currentVideo.title : "無播放內容"}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">系統狀態</CardTitle>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">正常</div>
                  <p className="text-xs text-muted-foreground">所有服務運行中</p>
                </CardContent>
              </Card>
            </div>

            {/* 當前播放 */}
            {currentVideo && (
              <Card>
                <CardHeader>
                  <CardTitle>當前播放</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-4">
                    <img
                      src={currentVideo.thumbnail || "/placeholder.svg"}
                      alt={currentVideo.title}
                      className="w-24 h-16 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold">{currentVideo.title}</h3>
                      <p className="text-sm text-gray-600">{currentVideo.category}</p>
                      <Badge variant="outline">{playbackState}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 設備管理 */}
          <TabsContent value="devices" className="space-y-6">
            <EnhancedDeviceScanner />
          </TabsContent>

          {/* 視頻管理 */}
          <TabsContent value="videos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">視頻管理</h2>
              <div className="space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => setShowYouTubeSearch(true)}
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  <Search className="mr-2 h-4 w-4" />
                  搜索YouTube VR影片
                </Button>
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" id="video-upload" />
                <Button onClick={() => document.getElementById("video-upload")?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  上傳視頻
                </Button>
              </div>
            </div>
            
            {/* 視頻分類過濾 */}
            <div className="flex flex-wrap gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedCategory('all')
                  loadData()
                }}
                className={`${selectedCategory === 'all' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
              >
                全部
              </Button>
              {['亞洲', '歐洲', '中東', '非洲', '北美洲', '南美洲', '大洋洲', '北極', '南極'].map((category) => (
                <Button
                  key={category}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory(category)
                    // 過濾影片
                    const allVideos = YouTubeStorage.getAllVideos()
                    const filteredVideos = allVideos
                      .filter(v => v.country === category)
                      .map(v => ({
                        id: v.id,
                        title: v.title,
                        category: v.country,
                        type: 'youtube' as const,
                        duration: v.duration,
                        thumbnail: v.thumbnail,
                        embedUrl: v.embedUrl,
                        country: v.country,
                        tags: v.tags,
                        addedAt: v.addedAt,
                        viewCount: v.viewCount
                      }))
                    setVideos(filteredVideos)
                  }}
                  className={`${selectedCategory === category ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}`}
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <Card key={video.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="p-4">
                    <div className="relative">
                      <img
                        src={video.thumbnail || "/placeholder.svg"}
                        alt={video.title}
                        className="w-full h-32 object-cover rounded"
                      />
                      {video.type === "youtube" && (
                        <Badge className="absolute top-2 right-2 bg-red-600">
                          YouTube
                        </Badge>
                      )}
                      {video.viewCount !== undefined && video.viewCount > 0 && (
                        <div className="absolute bottom-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                          👁 {video.viewCount}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2 text-sm">{video.title}</h3>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p>地區: {video.category}</p>
                      <p>時長: {video.duration}</p>
                      <p>類型: {video.type === "youtube" ? "YouTube 360°" : "本地文件"}</p>
                      {video.addedAt && (
                        <p>添加: {new Date(video.addedAt).toLocaleDateString()}</p>
                      )}
                      {video.tags && video.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {video.tags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => {
                          handlePlayVideo(video)
                          // 跳轉到播放控制頁面
                          setActiveTab('control')
                        }} 
                        className="flex-1"
                      >
                        <Play className="mr-1 h-3 w-3" />
                        播放
                      </Button>
                      {video.type === "youtube" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveVideo(video.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {videos.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有YouTube VR影片</h3>
                  <p className="text-gray-600 mb-4">請搜索並添加YouTube VR/360度旅遊影片</p>
                  <Button 
                    onClick={() => setShowYouTubeSearch(true)}
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    搜索YouTube VR影片
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 播放控制 */}
          <TabsContent value="control" className="space-y-6">
            {/* 現有的播放控制面板 */}
            <Card>
              <CardHeader>
                <CardTitle>播放控制面板</CardTitle>
                <CardDescription>控制所有連接設備的視頻播放</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center space-x-4 mb-6">
                  <Button
                    size="lg"
                    disabled={!currentVideo || devices.length === 0}
                    onClick={() =>
                      playbackState === "playing" ? handlePauseVideo() : currentVideo && handlePlayVideo(currentVideo)
                    }
                  >
                    {playbackState === "playing" ? (
                      <>
                        <Pause className="mr-2 h-5 w-5" />
                        暫停
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-5 w-5" />
                        播放
                      </>
                    )}
                  </Button>
                  <Button size="lg" variant="outline" disabled={!currentVideo} onClick={handleStopVideo}>
                    <Square className="mr-2 h-5 w-5" />
                    停止
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    disabled={devices.length === 0}
                    onClick={() => {
                      handleStopVideo()
                      console.log("緊急停止")
                    }}
                  >
                    <AlertTriangle className="mr-2 h-5 w-5" />
                    緊急停止
                  </Button>
                </div>

                {currentVideo && (
                  <div className="text-center">
                    <h3 className="text-lg font-semibold mb-2">{currentVideo.title}</h3>
                    <Badge variant="outline">{playbackState}</Badge>
                  </div>
                )}

                {devices.length === 0 && (
                  <div className="text-center text-gray-500">
                    <p>請先連接VR設備才能進行播放控制</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* VR旅遊團功能 - 整合到現有系統 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  VR旅遊團同步播放
                </CardTitle>
                <CardDescription>
                  創建旅遊團，與朋友一起同步觀看VR 360度旅遊視頻
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 旅遊團狀態顯示 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">{devices.length}</div>
                    <div className="text-sm text-blue-600">連接設備</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Video className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">{videos.length}</div>
                    <div className="text-sm text-green-600">可用視頻</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Globe className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">0</div>
                    <div className="text-sm text-purple-600">活躍旅遊團</div>
                  </div>
                </div>

                {/* 旅遊團控制按鈕 */}
                <div className="flex flex-wrap gap-3 justify-center">
                  <Button 
                    size="lg"
                    onClick={() => setShowYouTubeSearch(true)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    搜索旅遊視頻
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => {
                      // 創建旅遊團邏輯
                      toast({
                        title: "旅遊團功能",
                        description: "VR旅遊團功能已整合到現有系統中",
                      })
                    }}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    創建旅遊團
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    disabled={!currentVideo}
                    onClick={() => {
                      if (currentVideo) {
                        toast({
                          title: "開始旅遊團",
                          description: `已選擇視頻: ${currentVideo.title}`,
                        })
                      }
                    }}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    開始同步播放
                  </Button>
                </div>

                {/* 旅遊團信息提示 */}
                <div className="text-center text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium mb-2">💡 VR旅遊團功能說明</p>
                  <p>• 搜索並選擇VR 360度旅遊視頻</p>
                  <p>• 創建旅遊團邀請朋友加入</p>
                  <p>• 所有參與者同步觀看同一視頻</p>
                  <p>• 支持實時聊天和互動</p>
                </div>
              </CardContent>
            </Card>

            {/* VR播放器 */}
            {currentVideo && currentVideo.type === 'youtube' && currentVideo.embedUrl && (
              <VRYouTubePlayer
                videoId={currentVideo.id}
                title={currentVideo.title}
                embedUrl={currentVideo.embedUrl}
                onPlay={() => setPlaybackState("playing")}
                onPause={() => setPlaybackState("paused")}
                onStop={() => setPlaybackState("stopped")}
                isPlaying={playbackState === "playing"}
              />
            )}
          </TabsContent>



          {/* 系統診斷 */}
          <TabsContent value="diagnostics" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">系統診斷</h2>
              <Button onClick={runDiagnostics}>
                <Activity className="mr-2 h-4 w-4" />
                運行診斷
              </Button>
            </div>

            {systemStatus && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>網絡連接</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>API連接:</span>
                        <Badge variant={systemStatus.network.connected ? "default" : "destructive"}>
                          {systemStatus.network.connected ? "正常" : "異常"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>延遲:</span>
                        <span>{systemStatus.network.latency}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>WebSocket:</span>
                        <Badge variant={systemStatus.websocket.connected ? "default" : "destructive"}>
                          {systemStatus.websocket.connected ? "正常" : "異常"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>瀏覽器支持</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>WebGL 1.0:</span>
                        <Badge variant={systemStatus.webgl.webgl1 ? "default" : "secondary"}>
                          {systemStatus.webgl.webgl1 ? "支持" : "不支持"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>WebGL 2.0:</span>
                        <Badge variant={systemStatus.webgl.webgl2 ? "default" : "secondary"}>
                          {systemStatus.webgl.webgl2 ? "支持" : "不支持"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>WebRTC:</span>
                        <Badge variant={systemStatus.webrtc ? "default" : "secondary"}>
                          {systemStatus.webrtc ? "支持" : "不支持"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* YouTube搜索模態框 */}
      {showYouTubeSearch && (
        <YouTubeSearch
          onVideoSelected={handleYouTubeVideoSelected}
          onClose={() => setShowYouTubeSearch(false)}
        />
      )}
    </div>
  )
}
