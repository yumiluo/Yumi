"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  Settings,
  Wifi,
  WifiOff,
  Signal,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { translations, type Language } from "@/lib/i18n"
import { WebSocketSyncProtocol } from "@/lib/websocket-sync-protocol"
import { YouTubeVRIntegration } from "@/lib/youtube-vr-integration"

interface UserVRViewerProps {
  language: Language
  deviceId: string
  sessionId: string
  serverUrl: string
}

interface ViewerState {
  isConnected: boolean
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  isVRMode: boolean
  isFullscreen: boolean
  isMuted: boolean
  volume: number
  currentTime: number
  duration: number
  networkLatency: number
  bufferHealth: number
  syncOffset: number
  currentVideo: string | null
}

interface NetworkStatus {
  quality: "excellent" | "good" | "fair" | "poor"
  latency: number
  bandwidth: number
  stability: number
}

export function UserVRViewer({ language, deviceId, sessionId, serverUrl }: UserVRViewerProps) {
  const [viewerState, setViewerState] = useState<ViewerState>({
    isConnected: false,
    isPlaying: false,
    isPaused: false,
    isBuffering: false,
    isVRMode: false,
    isFullscreen: false,
    isMuted: false,
    volume: 80,
    currentTime: 0,
    duration: 0,
    networkLatency: 0,
    bufferHealth: 100,
    syncOffset: 0,
    currentVideo: null,
  })

  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    quality: "good",
    latency: 50,
    bandwidth: 10,
    stability: 95,
  })

  const [showControls, setShowControls] = useState(true)
  const [showNetworkInfo, setShowNetworkInfo] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [syncWarning, setSyncWarning] = useState<string | null>(null)

  const videoContainerRef = useRef<HTMLDivElement>(null)
  const syncProtocolRef = useRef<WebSocketSyncProtocol | null>(null)
  const youtubePlayerRef = useRef<YouTubeVRIntegration | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const t = translations[language]

  // 初始化連接
  useEffect(() => {
    initializeConnection()
    return () => {
      cleanup()
    }
  }, [])

  // 自動隱藏控制項
  useEffect(() => {
    if (showControls && viewerState.isPlaying) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }

      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [showControls, viewerState.isPlaying])

  // 網路狀態監控
  useEffect(() => {
    const updateNetworkStatus = () => {
      const connection =
        (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

      if (connection) {
        let quality: NetworkStatus["quality"] = "good"

        if (connection.effectiveType === "4g" && connection.downlink > 10) {
          quality = "excellent"
        } else if (connection.effectiveType === "4g" || connection.downlink > 5) {
          quality = "good"
        } else if (connection.effectiveType === "3g" || connection.downlink > 1) {
          quality = "fair"
        } else {
          quality = "poor"
        }

        setNetworkStatus({
          quality,
          latency: connection.rtt || viewerState.networkLatency,
          bandwidth: connection.downlink || 0,
          stability: Math.max(0, 100 - (connection.rtt || 0) / 10),
        })
      }
    }

    updateNetworkStatus()
    const interval = setInterval(updateNetworkStatus, 5000)
    return () => clearInterval(interval)
  }, [viewerState.networkLatency])

  const initializeConnection = async () => {
    try {
      setIsInitializing(true)
      setError(null)

      // 初始化WebSocket同步協議
      syncProtocolRef.current = new WebSocketSyncProtocol(deviceId, sessionId)
      await syncProtocolRef.current.connect(serverUrl)

      // 初始化YouTube VR播放器
      youtubePlayerRef.current = new YouTubeVRIntegration("", syncProtocolRef.current)

      if (videoContainerRef.current) {
        await youtubePlayerRef.current.createVRPlayer("vr-player-container", {
          apiKey: "",
          quality: "hd1080",
          vrMode: "360",
          autoplay: false,
          controls: false,
          enablejsapi: true,
        })
      }

      // 設置消息處理器
      setupMessageHandlers()

      setViewerState((prev) => ({ ...prev, isConnected: true }))
      setIsInitializing(false)

      console.log("VR觀看器初始化完成")
    } catch (error) {
      console.error("初始化失敗:", error)
      setError(language === "zh" ? "連接失敗，請重試" : "Connection failed, please retry")
      setIsInitializing(false)
    }
  }

  const setupMessageHandlers = () => {
    if (!syncProtocolRef.current) return

    // 這裡應該設置實際的消息處理器
    // 由於WebSocketSyncProtocol類的限制，我們模擬消息處理

    // 模擬接收播放命令
    const simulatePlayCommand = (videoUrl: string, startTime: number) => {
      setViewerState((prev) => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentVideo: videoUrl,
        currentTime: startTime,
      }))

      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.syncPlay(startTime, Date.now())
      }
    }

    // 模擬接收暫停命令
    const simulatePauseCommand = () => {
      setViewerState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: true,
      }))

      if (youtubePlayerRef.current) {
        youtubePlayerRef.current.syncPause(Date.now())
      }
    }

    // 模擬同步檢查
    setInterval(() => {
      if (viewerState.isPlaying) {
        const syncDrift = Math.random() * 400 - 200 // -200ms到+200ms

        if (Math.abs(syncDrift) > 200) {
          setSyncWarning(language === "zh" ? "同步偏差過大，正在校正..." : "Sync drift detected, correcting...")

          setTimeout(() => {
            setSyncWarning(null)
          }, 2000)
        }

        setViewerState((prev) => ({
          ...prev,
          syncOffset: syncDrift,
          networkLatency: 30 + Math.random() * 40,
          bufferHealth: Math.max(0, 100 - Math.random() * 20),
        }))
      }
    }, 1000)
  }

  const cleanup = () => {
    if (syncProtocolRef.current) {
      // 清理WebSocket連接
    }

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
  }

  const toggleVRMode = () => {
    setViewerState((prev) => ({ ...prev, isVRMode: !prev.isVRMode }))

    if (youtubePlayerRef.current) {
      // 切換VR模式
    }
  }

  const toggleFullscreen = async () => {
    if (!videoContainerRef.current) return

    try {
      if (!viewerState.isFullscreen) {
        if (videoContainerRef.current.requestFullscreen) {
          await videoContainerRef.current.requestFullscreen()
        }
        setViewerState((prev) => ({ ...prev, isFullscreen: true }))
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
        setViewerState((prev) => ({ ...prev, isFullscreen: false }))
      }
    } catch (error) {
      console.error("全螢幕切換失敗:", error)
    }
  }

  const toggleMute = () => {
    setViewerState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
  }

  const handleVolumeChange = (newVolume: number) => {
    setViewerState((prev) => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }))
  }

  const recenterView = () => {
    if (youtubePlayerRef.current) {
      // 重新定位VR視角
    }
  }

  const showControlsTemporarily = () => {
    setShowControls(true)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getNetworkStatusColor = (quality: NetworkStatus["quality"]) => {
    switch (quality) {
      case "excellent":
        return "text-green-500"
      case "good":
        return "text-blue-500"
      case "fair":
        return "text-yellow-500"
      case "poor":
        return "text-red-500"
      default:
        return "text-gray-500"
    }
  }

  const getNetworkStatusIcon = (quality: NetworkStatus["quality"]) => {
    switch (quality) {
      case "excellent":
        return <Signal className="w-4 h-4" />
      case "good":
        return <Wifi className="w-4 h-4" />
      case "fair":
        return <Wifi className="w-4 h-4" />
      case "poor":
        return <WifiOff className="w-4 h-4" />
      default:
        return <WifiOff className="w-4 h-4" />
    }
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4">
          <Loader2 className="w-12 h-12 mx-auto animate-spin" />
          <h2 className="text-xl font-medium">
            {language === "zh" ? "正在初始化VR播放器..." : "Initializing VR Player..."}
          </h2>
          <p className="text-gray-400">
            {language === "zh" ? "請稍候，正在建立連接" : "Please wait, establishing connection"}
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white space-y-4 max-w-md">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-500" />
          <h2 className="text-xl font-medium">{language === "zh" ? "連接錯誤" : "Connection Error"}</h2>
          <p className="text-gray-400">{error}</p>
          <Button onClick={initializeConnection} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {language === "zh" ? "重新連接" : "Reconnect"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      {/* 主要視頻容器 */}
      <div
        ref={videoContainerRef}
        className={`relative w-full h-screen ${viewerState.isVRMode ? "vr-container" : ""}`}
        onClick={showControlsTemporarily}
        onMouseMove={showControlsTemporarily}
      >
        {/* YouTube播放器容器 */}
        <div id="vr-player-container" className="w-full h-full" />

        {/* 連接狀態指示器 */}
        <div className="absolute top-4 left-4 z-50">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
            {viewerState.isConnected ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-500" />
            )}
            <span className="text-white text-sm">
              {viewerState.isConnected
                ? language === "zh"
                  ? "已連接"
                  : "Connected"
                : language === "zh"
                  ? "未連接"
                  : "Disconnected"}
            </span>
          </div>
        </div>

        {/* 網路狀態指示器 */}
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            className="bg-black/50 backdrop-blur-sm text-white hover:bg-black/70"
            onClick={() => setShowNetworkInfo(!showNetworkInfo)}
          >
            <div className={getNetworkStatusColor(networkStatus.quality)}>
              {getNetworkStatusIcon(networkStatus.quality)}
            </div>
            <span className="ml-2 text-sm">{viewerState.networkLatency}ms</span>
          </Button>
        </div>

        {/* 同步警告 */}
        {syncWarning && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <Alert className="bg-yellow-500/90 border-yellow-600 text-white">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{syncWarning}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* 緩衝指示器 */}
        {viewerState.isBuffering && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
            <div className="bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white text-center">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin" />
              <p>{language === "zh" ? "緩衝中..." : "Buffering..."}</p>
            </div>
          </div>
        )}

        {/* 播放控制界面 */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 z-40">
            <div className="bg-gradient-to-t from-black/80 to-transparent p-6">
              {/* 進度條 */}
              <div className="mb-4">
                <Progress value={(viewerState.currentTime / viewerState.duration) * 100} className="h-2 bg-white/20" />
                <div className="flex justify-between text-white text-sm mt-1">
                  <span>{formatTime(viewerState.currentTime)}</span>
                  <span>{formatTime(viewerState.duration)}</span>
                </div>
              </div>

              {/* 控制按鈕 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 播放/暫停按鈕 */}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="text-white hover:bg-white/20"
                    disabled={!viewerState.isConnected}
                  >
                    {viewerState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>

                  {/* 音量控制 */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={toggleMute}>
                      {viewerState.isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </Button>
                    <div className="w-20">
                      <Progress value={viewerState.isMuted ? 0 : viewerState.volume} className="h-1 bg-white/20" />
                    </div>
                  </div>

                  {/* 同步狀態 */}
                  <div className="flex items-center gap-2 text-white text-sm">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        Math.abs(viewerState.syncOffset) < 100
                          ? "bg-green-500"
                          : Math.abs(viewerState.syncOffset) < 200
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                    />
                    <span>{Math.abs(viewerState.syncOffset).toFixed(0)}ms</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* VR模式切換 */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`text-white hover:bg-white/20 ${viewerState.isVRMode ? "bg-white/20" : ""}`}
                    onClick={toggleVRMode}
                  >
                    {viewerState.isVRMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </Button>

                  {/* 重新定位 */}
                  {viewerState.isVRMode && (
                    <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={recenterView}>
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                  )}

                  {/* 設定 */}
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Settings className="w-5 h-5" />
                  </Button>

                  {/* 全螢幕 */}
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={toggleFullscreen}>
                    {viewerState.isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VR模式提示 */}
        {viewerState.isVRMode && (
          <div className="absolute top-1/2 left-4 transform -translate-y-1/2 z-30">
            <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3 text-white text-sm max-w-48">
              <p className="mb-2">{language === "zh" ? "VR模式已啟用" : "VR Mode Active"}</p>
              <p className="text-xs text-gray-300">
                {language === "zh" ? "使用手機陀螺儀或拖拽來控制視角" : "Use device gyroscope or drag to control view"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 網路資訊對話框 */}
      <Dialog open={showNetworkInfo} onOpenChange={setShowNetworkInfo}>
        <DialogContent className="bg-black/90 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle>{language === "zh" ? "網路狀態" : "Network Status"}</DialogTitle>
            <DialogDescription className="text-gray-300">
              {language === "zh" ? "即時網路連接資訊" : "Real-time network connection information"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-gray-400">{language === "zh" ? "連接品質" : "Connection Quality"}</Label>
                <div className={`flex items-center gap-2 ${getNetworkStatusColor(networkStatus.quality)}`}>
                  {getNetworkStatusIcon(networkStatus.quality)}
                  <span className="capitalize">{networkStatus.quality}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-400">{language === "zh" ? "延遲" : "Latency"}</Label>
                <div className="text-lg font-mono">{networkStatus.latency}ms</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-400">{language === "zh" ? "頻寬" : "Bandwidth"}</Label>
                <div className="text-lg font-mono">{networkStatus.bandwidth.toFixed(1)} Mbps</div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-gray-400">{language === "zh" ? "穩定性" : "Stability"}</Label>
                <div className="flex items-center gap-2">
                  <Progress value={networkStatus.stability} className="flex-1 h-2" />
                  <span className="text-sm">{networkStatus.stability.toFixed(0)}%</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-400">{language === "zh" ? "緩衝健康度" : "Buffer Health"}</Label>
              <div className="flex items-center gap-2">
                <Progress value={viewerState.bufferHealth} className="flex-1 h-2" />
                <span className="text-sm">{viewerState.bufferHealth.toFixed(0)}%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-700">
              <div className="flex justify-between text-sm text-gray-400">
                <span>{language === "zh" ? "設備ID" : "Device ID"}:</span>
                <span className="font-mono">{deviceId.slice(0, 8)}...</span>
              </div>
              <div className="flex justify-between text-sm text-gray-400 mt-1">
                <span>{language === "zh" ? "會話ID" : "Session ID"}:</span>
                <span className="font-mono">{sessionId.slice(0, 8)}...</span>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 添加必要的類型聲明
interface Label {
  className?: string
  children: React.ReactNode
}

const Label: React.FC<Label> = ({ className, children }) => <label className={className}>{children}</label>
