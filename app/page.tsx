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
} from "lucide-react"

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
}

interface VideoItem {
  id: string
  title: string
  category: string
  type: "local" | "youtube"
  duration: string
  thumbnail: string
  url?: string
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

  useEffect(() => {
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
      // 模擬加載數據
      setVideos([
        {
          id: "1",
          title: "示例VR視頻",
          category: "演示",
          type: "local",
          duration: "5:30",
          thumbnail: "/placeholder.svg?height=120&width=200&text=VR+Video",
        },
      ])
      setDevices([])
    } catch (error) {
      console.error("載入數據失敗:", error)
    }
  }

  const handleLogin = async (email: string, password: string) => {
    try {
      // 模擬登錄
      const mockUsers: Record<string, { username: string; role: "admin" | "user" }> = {
        "admin@example.com": { username: "管理員", role: "admin" },
        "user@example.com": { username: "用戶", role: "user" },
      }

      if (mockUsers[email] && password === "123456") {
        const user: User = { id: "1", email, ...mockUsers[email] }
        setUser(user)
        localStorage.setItem("user", JSON.stringify(user))
        await loadData()
      } else {
        alert("登錄失敗: 無效的憑證")
      }
    } catch (error) {
      alert("登錄失敗: " + (error as Error).message)
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

  const handleScanDevices = async () => {
    setIsScanning(true)
    try {
      // 模擬設備掃描
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const mockDevices: Device[] = [
        {
          id: "device1",
          name: "Meta Quest 3",
          type: "vr",
          ip: "192.168.1.100",
          status: "connected",
          batteryLevel: 85,
          lastSeen: "剛剛",
        },
        {
          id: "device2",
          name: "iPhone 15",
          type: "mobile",
          ip: "192.168.1.102",
          status: "connected",
          batteryLevel: 92,
          lastSeen: "剛剛",
        },
      ]
      setDevices(mockDevices)
      setIsConnected(true)
    } catch (error) {
      console.error("設備掃描失敗:", error)
    } finally {
      setIsScanning(false)
    }
  }

  const handlePlayVideo = async (video: VideoItem) => {
    try {
      setCurrentVideo(video)
      setPlaybackState("playing")
      console.log("播放視頻:", video.title)
    } catch (error) {
      console.error("播放失敗:", error)
    }
  }

  const handlePauseVideo = async () => {
    try {
      setPlaybackState("paused")
      console.log("暫停播放")
    } catch (error) {
      console.error("暫停失敗:", error)
    }
  }

  const handleStopVideo = async () => {
    try {
      setCurrentVideo(null)
      setPlaybackState("stopped")
      console.log("停止播放")
    } catch (error) {
      console.error("停止失敗:", error)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      // 模擬文件上傳
      const newVideo: VideoItem = {
        id: Date.now().toString(),
        title: file.name,
        category: "上傳",
        type: "local",
        duration: "未知",
        thumbnail: "/placeholder.svg?height=120&width=200&text=VR+Video",
      }
      setVideos((prev) => [...prev, newVideo])
      console.log("上傳成功:", file.name)
    } catch (error) {
      alert("上傳失敗: " + (error as Error).message)
    }
  }

  const runDiagnostics = async () => {
    try {
      const diagnostics = {
        network: { connected: true, latency: 45 },
        websocket: { connected: isConnected },
        webgl: { webgl1: true, webgl2: true },
        webrtc: true,
      }
      setSystemStatus(diagnostics)
    } catch (error) {
      console.error("診斷失敗:", error)
    }
  }

  // 如果用戶未登錄，顯示登錄界面
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">VR視頻管理系統</CardTitle>
            <CardDescription>請登錄或以訪客身份繼續</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <input
                type="email"
                placeholder="郵箱地址"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="email"
              />
              <input
                type="password"
                placeholder="密碼"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="password"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const email = (document.getElementById("email") as HTMLInputElement).value
                const password = (document.getElementById("password") as HTMLInputElement).value
                handleLogin(email, password)
              }}
            >
              登錄
            </Button>
            <Button variant="outline" className="w-full bg-transparent" onClick={handleGuestLogin}>
              訪客模式
            </Button>
            <div className="text-center text-sm text-gray-600">
              <p>測試帳戶:</p>
              <p>admin@example.com / 123456</p>
              <p>user@example.com / 123456</p>
            </div>
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
        <Tabs defaultValue="dashboard" className="space-y-6">
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
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">設備管理</h2>
              <Button onClick={handleScanDevices} disabled={isScanning}>
                <Wifi className="mr-2 h-4 w-4" />
                {isScanning ? "掃描中..." : "掃描設備"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device) => (
                <Card key={device.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <Badge variant={device.status === "connected" ? "default" : "secondary"}>{device.status}</Badge>
                    </div>
                    <CardDescription>
                      {device.type === "vr" ? (
                        <Monitor className="inline mr-1 h-4 w-4" />
                      ) : (
                        <Smartphone className="inline mr-1 h-4 w-4" />
                      )}
                      {device.type.toUpperCase()} 設備
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>IP地址:</span>
                        <span>{device.ip || "N/A"}</span>
                      </div>
                      {device.batteryLevel && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span>電池:</span>
                            <span>{device.batteryLevel}%</span>
                          </div>
                          <Progress value={device.batteryLevel} className="h-2" />
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span>最後連接:</span>
                        <span>{device.lastSeen}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {devices.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Monitor className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有連接的設備</h3>
                  <p className="text-gray-600 mb-4">點擊"掃描設備"來發現網絡上的VR設備</p>
                  <Button onClick={handleScanDevices} disabled={isScanning}>
                    <Wifi className="mr-2 h-4 w-4" />
                    開始掃描
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 視頻管理 */}
          <TabsContent value="videos" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">視頻管理</h2>
              <div className="space-x-2">
                <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" id="video-upload" />
                <Button onClick={() => document.getElementById("video-upload")?.click()}>
                  <Upload className="mr-2 h-4 w-4" />
                  上傳視頻
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <Card key={video.id}>
                  <CardHeader>
                    <img
                      src={video.thumbnail || "/placeholder.svg"}
                      alt={video.title}
                      className="w-full h-32 object-cover rounded"
                    />
                  </CardHeader>
                  <CardContent>
                    <h3 className="font-semibold mb-2">{video.title}</h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>類別: {video.category}</p>
                      <p>時長: {video.duration}</p>
                      <p>類型: {video.type === "youtube" ? "YouTube" : "本地文件"}</p>
                    </div>
                    <div className="mt-4 space-x-2">
                      <Button size="sm" onClick={() => handlePlayVideo(video)} disabled={devices.length === 0}>
                        <Play className="mr-1 h-3 w-3" />
                        播放
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {videos.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <Video className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有視頻</h3>
                  <p className="text-gray-600 mb-4">上傳您的第一個VR視頻</p>
                  <Button onClick={() => document.getElementById("video-upload")?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    上傳視頻
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* 播放控制 */}
          <TabsContent value="control" className="space-y-6">
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
    </div>
  )
}
