"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Play, Pause, Square, RotateCcw, RotateCw, Maximize, Volume2, VolumeX, AlertCircle } from "lucide-react"

interface YouTubePlayerProps {
  videoId: string
  title: string
  onPlay?: () => void
  onPause?: () => void
  onStop?: () => void
  onSeek?: (time: number) => void
  onVolumeChange?: (volume: number) => void
  onReady?: () => void
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

export function YouTubePlayer({
  videoId,
  title,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onVolumeChange,
  onReady,
  isPlaying = false,
  currentTime = 0,
  duration = 0,
  volume = 100,
  isMuted = false
}: YouTubePlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null)
  const [player, setPlayer] = useState<any>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    console.log('YouTubePlayer useEffect triggered, videoId:', videoId) // 調試信息
    
    // 載入YouTube IFrame API
    if (!window.YT) {
      console.log('YouTube API not loaded, loading now...') // 調試信息
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        console.log('YouTube API ready callback triggered') // 調試信息
        createPlayer()
      }
    } else {
      console.log('YouTube API already loaded, creating player...') // 調試信息
      createPlayer()
    }

    return () => {
      if (player) {
        console.log('Destroying player...') // 調試信息
        player.destroy()
      }
    }
  }, [videoId]) // 添加videoId依賴

  const createPlayer = () => {
    console.log('createPlayer called, playerRef.current:', playerRef.current) // 調試信息
    
    if (!playerRef.current) {
      console.error('playerRef.current is null') // 調試信息
      return
    }

    try {
      console.log('Creating YouTube player with videoId:', videoId) // 調試信息
      
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
          // 360度影片相關參數
          iv_load_policy: 3,
          cc_load_policy: 0
        },
        events: {
          onReady: (event: any) => {
            console.log('YouTube播放器準備就緒', event) // 調試信息
            setPlayer(event.target)
            setIsReady(true)
            setError(null)
            
            // 設置初始音量
            event.target.setVolume(volume)
            if (isMuted) {
              event.target.mute()
            }
            
            // 調用onReady回調
            onReady?.()
          },
          onStateChange: (event: any) => {
            const state = event.data
            console.log('YouTube播放器狀態變化:', state) // 調試信息
            
            // YouTube播放器狀態：-1=未開始, 0=已結束, 1=播放中, 2=已暫停, 3=緩衝中, 5=已插入
            if (state === 1) {
              onPlay?.()
            } else if (state === 2) {
              onPause?.()
            } else if (state === 0) {
              onStop?.()
            }
          },
          onError: (event: any) => {
            console.error('YouTube播放器錯誤:', event.data) // 調試信息
            setError(`播放器錯誤: ${event.data}`)
          }
        }
      })
      
      console.log('YouTube player created successfully:', newPlayer) // 調試信息
    } catch (error) {
      console.error('創建YouTube播放器失敗:', error) // 調試信息
      setError(`創建播放器失敗: ${error}`)
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
          <Button onClick={() => window.location.reload()}>
            重新載入
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <Badge variant="outline">YouTube 360°</Badge>
        </CardTitle>
        <CardDescription>
          使用YouTube播放器播放360度旅遊影片
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
            <RotateCw className="h-4 w-4" />
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
          💡 提示：使用滑鼠拖拽或觸控手勢來旋轉360度影片視角
        </div>
      </CardContent>
    </Card>
  )
}
