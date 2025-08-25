"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Square, RotateCcw, RotateCw, Maximize, Volume2, VolumeX, AlertCircle, Eye, EyeOff } from "lucide-react"

interface VRYouTubePlayerProps {
  videoId: string
  title: string
  embedUrl: string
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onSeek?: (time: number) => void
  onVolumeChange?: (volume: number) => void
  isPlaying?: boolean
  currentTime?: number
  duration?: number
  volume?: number
  isMuted?: boolean
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

// VR提示覆蓋層組件
const VRHintOverlay = ({ 
  isVisible, 
  isMobileDevice, 
  isVRHeadset 
}: { 
  isVisible: boolean
  isMobileDevice: boolean
  isVRHeadset: boolean
}) => {
  if (!isVisible) return null

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-1000">
      <div className="text-center text-white bg-black bg-opacity-70 p-6 rounded-lg max-w-md">
        <div className="text-4xl mb-4">🎥</div>
        <h3 className="text-xl font-bold mb-3">VR 360° 沉浸式體驗</h3>
        <div className="space-y-2 text-sm opacity-90">
          {isMobileDevice || isVRHeadset ? (
            <>
              <p>• 轉動頭部來控制360度視角</p>
              <p>• 支持陀螺儀和設備方向感應</p>
              <p>• 自動適配手機和VR頭顯</p>
              <p>• 點擊屏幕或按返回鍵退出VR</p>
            </>
          ) : (
            <>
              <p>• 使用滑鼠拖拽來旋轉360度視角</p>
              <p>• 點擊全屏按鈕獲得最佳VR體驗</p>
              <p>• 支持VR頭顯設備</p>
              <p>• 按ESC鍵或懸停右上角退出VR模式</p>
            </>
          )}
        </div>
        <div className="mt-4 text-xs opacity-75">
          提示將在3秒後自動消失...
        </div>
      </div>
    </div>
  )
}

export function VRYouTubePlayer({
  videoId,
  title,
  embedUrl,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onVolumeChange,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  volume = 100,
  isMuted = false
}: VRYouTubePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isVRMode, setIsVRMode] = useState(false)
  const [showControls, setShowControls] = useState(true)
  
  // VR頭部控制相關狀態
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [isVRHeadset, setIsVRHeadset] = useState(false)
  const [headTrackingEnabled, setHeadTrackingEnabled] = useState(false)
  const [deviceOrientation, setDeviceOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 })
  const [headRotation, setHeadRotation] = useState({ x: 0, y: 0, z: 0 })
  const [showVRHint, setShowVRHint] = useState(true)

  // 檢測設備類型
  useEffect(() => {
    const detectDevice = () => {
      const userAgent = navigator.userAgent.toLowerCase()
      const isMobile = /android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent)
      setIsMobileDevice(isMobile)
      
      // 檢測VR頭顯
      const isVR = (navigator as any).getVRDisplays || 
                   (window as any).VRFrameData ||
                   /vr|oculus|htc vive|pico/i.test(userAgent)
      setIsVRHeadset(isVR)
      
      console.log('設備檢測:', { isMobile, isVR, userAgent })
    }
    
    detectDevice()
  }, [])

  // VR提示3秒後自動隱藏
  useEffect(() => {
    if (isVRMode && showVRHint) {
      const timer = setTimeout(() => {
        setShowVRHint(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isVRMode, showVRHint])

  // 請求設備方向權限並啟用頭部追蹤
  const enableHeadTracking = async () => {
    try {
      // 請求設備方向權限
      if (typeof DeviceOrientationEvent !== 'undefined' && 
          typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as any).requestPermission()
        if (permission === 'granted') {
          setHeadTrackingEnabled(true)
          console.log('設備方向權限已獲取')
        } else {
          console.log('設備方向權限被拒絕')
        }
      } else {
        // 直接啟用（iOS 13+ 需要權限）
        setHeadTrackingEnabled(true)
        console.log('直接啟用頭部追蹤')
      }
    } catch (error) {
      console.error('啟用頭部追蹤失敗:', error)
    }
  }

  // 處理設備方向變化
  const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
    if (!headTrackingEnabled) return
    
    const { alpha, beta, gamma } = event
    setDeviceOrientation({ alpha: alpha || 0, beta: beta || 0, gamma: gamma || 0 })
    
    // 計算頭部旋轉角度
    const headX = (beta || 0) - 90  // 前後傾斜
    const headY = (alpha || 0)      // 左右轉動
    const headZ = (gamma || 0)      // 左右傾斜
    
    setHeadRotation({ x: headX, y: headY, z: headZ })
    
    // 將頭部轉動轉換為視頻視角控制
    controlVideoView(headX, headY, headZ)
  }

  // 控制視頻視角
  const controlVideoView = (x: number, y: number, z: number) => {
    if (!player || !isVRMode) return
    
    try {
      // 將頭部角度映射到視頻視角
      // YouTube IFrame API 支持通過 postMessage 控制視角
      const message = {
        event: 'command',
        func: 'seekTo',
        args: [0, true] // 這裡可以擴展為更精確的視角控制
      }
      
      // 發送消息到YouTube播放器
      if (playerRef.current) {
        const iframe = playerRef.current.querySelector('iframe')
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(message, '*')
        }
      }
      
      console.log('頭部控制視頻視角:', { x, y, z })
    } catch (error) {
      console.error('控制視頻視角失敗:', error)
    }
  }

  useEffect(() => {
    // 載入YouTube IFrame API
    const loadYouTubeAPI = () => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
          console.log('YouTube IFrame API 已載入')
          createPlayer()
        }
      } else {
        console.log('YouTube IFrame API 已存在')
        createPlayer()
      }
    }

    // 檢查API是否已載入
    if (window.YT && window.YT.Player) {
      console.log('YouTube IFrame API 已準備就緒')
      createPlayer()
    } else {
      console.log('正在載入 YouTube IFrame API...')
      loadYouTubeAPI()
    }

    return () => {
      if (player) {
        player.destroy()
      }
    }
  }, [videoId])

  // 監聽ESC鍵和全屏狀態變化
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVRMode) {
        handleVRMode()
      }
    }

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && 
          !(document as any).webkitFullscreenElement && 
          !(document as any).mozFullScreenElement && 
          !(document as any).msFullscreenElement) {
        // 如果退出全屏，也退出VR模式
        if (isVRMode) {
          setIsVRMode(false)
          document.body.style.overflow = 'auto'
          document.documentElement.style.overflow = 'auto'
          document.body.classList.remove('vr-mode')
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [isVRMode])

  // 監聽設備方向變化（頭部追蹤）
  useEffect(() => {
    if (isVRMode && headTrackingEnabled) {
      const handleOrientation = (event: DeviceOrientationEvent) => {
        handleDeviceOrientation(event)
      }

      window.addEventListener('deviceorientation', handleOrientation)
      
      return () => {
        window.removeEventListener('deviceorientation', handleOrientation)
      }
    }
  }, [isVRMode, headTrackingEnabled])

  // 進入VR模式時自動啟用頭部追蹤
  useEffect(() => {
    if (isVRMode && (isMobileDevice || isVRHeadset)) {
      enableHeadTracking()
    }
  }, [isVRMode, isMobileDevice, isVRHeadset])

  const createPlayer = () => {
    if (!playerRef.current) return

    try {
      // 清理之前的播放器
      if (player) {
        player.destroy()
        setPlayer(null)
        setIsReady(false)
      }

      const newPlayer = new window.YT.Player(playerRef.current, {
        height: '360',
        width: '640',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          showinfo: 0,
          modestbranding: 1,
          enablejsapi: 1,
          origin: window.location.origin,
          playsinline: 1,
          vr: 1,
          // 修復錯誤150的配置
          iv_load_policy: 3,
          cc_load_policy: 0,
          fs: 1,
          // 添加更多穩定性配置
          disablekb: 0,
          loop: 0,
          playlist: videoId,
          // 改進嵌入穩定性
          host: 'https://www.youtube.com',
          widget_referrer: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube播放器已準備就緒')
            setPlayer(event.target)
            setIsReady(true)
            setError(null) // 清除之前的錯誤
            onPlay?.()
          },
          onStateChange: (event: any) => {
            console.log('播放器狀態變化:', event.data)
            // 處理播放狀態變化
            if (event.data === window.YT.PlayerState.PLAYING) {
              onPlay?.()
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              onPause?.()
            } else if (event.data === window.YT.PlayerState.ENDED) {
              onStop?.()
            }
          },
          onError: (event: any) => {
            console.error('YouTube播放器錯誤:', event.data)
            
            // 嘗試重新創建播放器
            if (event.data === 101 || event.data === 150) {
              console.log('嘗試重新創建播放器...')
              setTimeout(() => {
                createPlayer()
              }, 2000)
              return
            }
            
            // 處理特定錯誤碼
            let errorMessage = '播放器錯誤'
            switch (event.data) {
              case 2:
                errorMessage = '無效的視頻ID'
                break
              case 5:
                errorMessage = 'HTML5播放器錯誤'
                break
              case 100:
                errorMessage = '視頻不存在或已被刪除'
                break
              case 101:
              case 150:
                errorMessage = '視頻無法嵌入播放，正在重試...'
                break
              default:
                errorMessage = `播放器錯誤: ${event.data}`
            }
            setError(errorMessage)
          }
        }
      })
    } catch (error) {
      console.error('創建YouTube播放器失敗:', error)
      setError('創建播放器失敗，請檢查網絡連接')
    }
  }

  const handlePlay = () => {
    if (player && isReady) {
      player.playVideo()
      onPlay?.()
    }
  }

  const handlePause = () => {
    if (player && isReady) {
      player.pauseVideo()
      onPause?.()
    }
  }

  const handleStop = () => {
    if (player && isReady) {
      player.stopVideo()
      onStop?.()
    }
  }

  const handleSeek = (time: number) => {
    if (player && isReady) {
      player.seekTo(time, true)
      onSeek?.(time)
    }
  }

  const handleVolumeChange = (newVolume: number) => {
    if (player && isReady) {
      player.setVolume(newVolume)
      onVolumeChange?.(newVolume)
    }
  }

  const handleMuteToggle = () => {
    if (player && isReady) {
      if (isMuted) {
        player.unMute()
      } else {
        player.mute()
      }
    }
  }

  const handleFullscreen = () => {
    if (player && isReady) {
      if (isFullscreen) {
        player.exitFullscreen()
        setIsFullscreen(false)
      } else {
        player.requestFullscreen()
        setIsFullscreen(true)
      }
    }
  }

  const handleVRMode = () => {
    setIsVRMode(!isVRMode)
    if (!isVRMode) {
      // 進入VR模式 - 完全沉浸式體驗
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
      
      // 嘗試進入全屏模式
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen()
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        (document.documentElement as any).webkitRequestFullscreen()
      } else if ((document.documentElement as any).mozRequestFullScreen) {
        (document.documentElement as any).mozRequestFullScreen()
      } else if ((document.documentElement as any).msRequestFullscreen) {
        (document.documentElement as any).msRequestFullscreen()
      }
      
      // 隱藏瀏覽器UI元素
      document.body.classList.add('vr-mode')
      
      // 重置VR提示顯示
      setShowVRHint(true)
      
      // 如果是移動設備，啟用頭部追蹤
      if (isMobileDevice || isVRHeadset) {
        enableHeadTracking()
      }
      
      console.log('進入VR沉浸式模式')
    } else {
      // 退出VR模式
      document.body.style.overflow = 'auto'
      document.documentElement.style.overflow = 'auto'
      
      // 退出全屏模式
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen()
      } else if ((document as any).mozCancelFullScreen) {
        (document as any).mozCancelFullScreen()
      } else if ((document as any).msExitFullscreen) {
        (document as any).msExitFullscreen()
      }
      
      // 移除VR模式樣式
      document.body.classList.remove('vr-mode')
      
      // 禁用頭部追蹤
      setHeadTrackingEnabled(false)
      
      console.log('退出VR模式')
    }
  }

  const handleRotateLeft = () => {
    if (player && isReady) {
      // 實現360度影片的向左旋轉
      console.log('向左旋轉360度影片')
    }
  }

  const handleRotateRight = () => {
    if (player && isReady) {
      // 實現360度影片的向右旋轉
      console.log('向右旋轉360度影片')
    }
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold mb-2">播放器錯誤</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          
          {/* 備用簡單播放器 */}
          <div className="mb-4">
            <h4 className="text-sm font-medium mb-2">備用播放器:</h4>
            <iframe
              width="100%"
              height="300"
              src={`https://www.youtube.com/embed/${videoId}?rel=0&enablejsapi=1&playsinline=1&vr=1`}
              title={title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
          
          <div className="flex gap-2 justify-center">
          <Button onClick={() => window.location.reload()}>
            重新載入
          </Button>
            <Button onClick={() => setError(null)} variant="outline">
              重試播放器
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isVRMode) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        {/* 360度視頻播放器 - 全屏沉浸式 */}
        <div className="w-full h-full relative">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&vr=1&enablejsapi=1&controls=1&fs=1&iv_load_policy=3&cc_load_policy=0&showinfo=0&origin=${window.location.origin}`}
            title={title}
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            style={{
              border: 'none',
              margin: 0,
              padding: 0,
              display: 'block'
            }}
          />
        </div>
        
        {/* VR使用提示 - 只顯示3秒後自動消失 */}
        <VRHintOverlay 
          isVisible={showVRHint} 
          isMobileDevice={isMobileDevice} 
          isVRHeadset={isVRHeadset} 
        />
        
        {/* 退出VR按鈕 - 懸停時才顯示（桌面端） */}
        {!isMobileDevice && (
          <div className="absolute top-4 right-4 z-10 opacity-0 hover:opacity-100 transition-opacity duration-300">
          <Button
            onClick={handleVRMode}
            variant="outline"
              size="sm"
              className="bg-black bg-opacity-70 text-white border-white hover:bg-opacity-90"
          >
            <EyeOff className="mr-2 h-4 w-4" />
            退出VR
          </Button>
        </div>
        )}
        
        {/* 移動設備觸摸控制層 */}
        {(isMobileDevice || isVRHeadset) && (
          <div 
            className="absolute inset-0 z-10"
            onClick={() => {
              // 點擊屏幕退出VR模式
              handleVRMode()
            }}
            style={{ pointerEvents: 'auto' }}
          >
            {/* 隱形的觸摸控制區域 */}
          </div>
        )}
        
        {/* 頭部追蹤狀態指示器（調試用） */}
        {headTrackingEnabled && (
          <div className="absolute bottom-4 left-4 z-20 text-white text-xs bg-black bg-opacity-50 p-2 rounded">
            <div>頭部追蹤已啟用</div>
            <div>X: {headRotation.x.toFixed(1)}°</div>
            <div>Y: {headRotation.y.toFixed(1)}°</div>
            <div>Z: {headRotation.z.toFixed(1)}°</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex gap-2">
            <Badge variant="outline">YouTube 360°</Badge>
            <Badge variant="outline">VR Ready</Badge>
          </div>
        </CardTitle>
        <CardDescription>
          使用A-Frame VR播放器播放360度旅遊影片
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* YouTube播放器容器 */}
        <div className="relative">
          <div
            ref={playerRef}
            className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden"
          />
          
          {/* 載入指示器 */}
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>載入YouTube播放器中...</p>
              </div>
            </div>
          )}
        </div>

        {/* 播放控制按鈕 */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRotateLeft}
            disabled={!isReady}
            title="向左旋轉"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleStop}
            disabled={!isReady}
            title="停止"
          >
            <Square className="h-4 w-4" />
          </Button>
          
          <Button
            size="sm"
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!isReady}
            title={isPlaying ? "暫停" : "播放"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={handleRotateRight}
            disabled={!isReady}
            title="向右旋轉"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* VR模式按鈕 */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleVRMode}
            disabled={!isReady}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Eye className="mr-2 h-4 w-4" />
            進入VR模式
          </Button>
        </div>

        {/* 音量控制 */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMuteToggle}
            disabled={!isReady}
            title={isMuted ? "取消靜音" : "靜音"}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
          
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            disabled={!isReady}
            className="w-24"
          />
          
          <span className="text-sm text-gray-600 w-12 text-center">
            {volume}%
          </span>
        </div>

        {/* 全螢幕按鈕 */}
        <div className="flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={handleFullscreen}
            disabled={!isReady}
            title={isFullscreen ? "退出全螢幕" : "全螢幕"}
          >
            <Maximize className="h-4 w-4" />
            {isFullscreen ? "退出全螢幕" : "全螢幕"}
          </Button>
        </div>

        {/* 時間顯示 */}
        {isReady && (
          <div className="text-center text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span className="mx-2">/</span>
            <span>{formatTime(duration)}</span>
          </div>
        )}

        {/* 360度影片提示 */}
        <div className="text-center text-xs text-gray-500 bg-blue-50 p-2 rounded">
          💡 提示：點擊"進入VR模式"體驗360度沉浸式觀看，使用滑鼠拖拽或VR控制器旋轉視角
        </div>

        {/* 控制按鈕顯示切換 */}
        <div className="text-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowControls(!showControls)}
            className="text-gray-500"
          >
            {showControls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showControls ? "隱藏控制" : "顯示控制"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}


