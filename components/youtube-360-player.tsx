"use client"

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Youtube,
  Smartphone
} from "lucide-react"

interface YouTube360PlayerProps {
  sessionCode: string
  socket: any
  onVideoChange?: (videoId: string) => void
}

interface VideoState {
  isPlaying: boolean
  currentTime: number
  videoId: string | null
  duration: number
  isReady: boolean
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export function YouTube360Player({ sessionCode, socket, onVideoChange }: YouTube360PlayerProps) {
  const [videoState, setVideoState] = useState<VideoState>({
    isPlaying: false,
    currentTime: 0,
    videoId: null,
    duration: 0,
    isReady: false
  })
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  
  const playerRef = useRef<any>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 初始化YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = () => {
        console.log('🎥 YouTube IFrame API 已載入')
        setVideoState(prev => ({ ...prev, isReady: true }))
      }
    } else {
      setVideoState(prev => ({ ...prev, isReady: true }))
    }
  }, [])

  // 監聽Socket.io視頻同步事件
  useEffect(() => {
    if (!socket) return

    const handleVideoSync = (data: any) => {
      console.log('📡 收到視頻同步事件:', data)
      
      if (!playerRef.current) {
        console.warn('播放器未準備就緒')
        return
      }

      const { type, videoId, videoUrl, startTime, currentTime, timestamp } = data
      const serverTimestamp = timestamp || Date.now()
      const clientTimestamp = Date.now()
      const networkDelay = clientTimestamp - serverTimestamp

      console.log(`⏱️ 網絡延遲: ${networkDelay}ms`)

      switch (type) {
        case 'play':
          if (videoId && videoId !== videoState.videoId) {
            // 載入新視頻
            loadYouTubeVideo(videoId, startTime || 0)
          } else {
            // 播放當前視頻
            const adjustedTime = Math.max(0, (startTime || 0) + (networkDelay / 1000))
            playerRef.current.seekTo(adjustedTime, true)
            playerRef.current.playVideo()
            setVideoState(prev => ({ ...prev, isPlaying: true, currentTime: adjustedTime }))
          }
          setSuccess('🎬 開始同步播放')
          break

        case 'pause':
          playerRef.current.pauseVideo()
          setVideoState(prev => ({ ...prev, isPlaying: false }))
          setSuccess('⏸️ 視頻已暫停')
          break

        case 'stop':
          playerRef.current.stopVideo()
          setVideoState(prev => ({ 
            ...prev, 
            isPlaying: false, 
            currentTime: 0,
            videoId: null 
          }))
          setSuccess('⏹️ 視頻已停止')
          break

        case 'time-sync':
          if (Math.abs(currentTime - videoState.currentTime) > 1) {
            const adjustedTime = Math.max(0, currentTime + (networkDelay / 1000))
            playerRef.current.seekTo(adjustedTime, true)
            setVideoState(prev => ({ ...prev, currentTime: adjustedTime }))
            console.log(`🔄 時間同步: ${adjustedTime}s`)
          }
          break
      }
    }

    socket.on('video-sync', handleVideoSync)

    return () => {
      socket.off('video-sync', handleVideoSync)
    }
  }, [socket, videoState.videoId, videoState.currentTime])

  // 載入YouTube視頻
  const loadYouTubeVideo = (videoId: string, startTime: number = 0) => {
    if (!containerRef.current || !window.YT) {
      setError('播放器未準備就緒')
      return
    }

    try {
      // 清理舊播放器
      if (playerRef.current) {
        playerRef.current.destroy()
      }

      // 創建新播放器
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '400',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 1,
          enablejsapi: 1,
          fs: 1,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          cc_load_policy: 0,
          playsinline: 1,
          origin: window.location.origin,
          start: startTime
        },
        events: {
          onReady: (event: any) => {
            console.log('🎥 YouTube播放器已準備就緒')
            const player = event.target
            
            // 設置播放器事件
            player.addEventListener('onStateChange', (event: any) => {
              handlePlayerStateChange(event)
            })
            
            // 設置時間更新監聽器
            setInterval(() => {
              if (player.getPlayerState() === 1) { // 正在播放
                const currentTime = player.getCurrentTime()
                setVideoState(prev => ({ ...prev, currentTime }))
                
                // 發送時間同步到其他設備
                if (socket && sessionCode) {
                  socket.emit('sync-time', {
                    sessionCode,
                    currentTime,
                    timestamp: Date.now()
                  })
                }
              }
            }, 1000)
            
            setVideoState(prev => ({ 
              ...prev, 
              videoId, 
              isReady: true,
              currentTime: startTime 
            }))
            
            if (onVideoChange) {
              onVideoChange(videoId)
            }
            
            setSuccess(`🎬 已載入視頻: ${videoId}`)
          },
          onError: (event: any) => {
            console.error('❌ YouTube播放器錯誤:', event.data)
            setError(`播放器錯誤: ${event.data}`)
          }
        }
      })
    } catch (err: any) {
      console.error('❌ 創建播放器失敗:', err)
      setError(`創建播放器失敗: ${err.message}`)
    }
  }

  // 處理播放器狀態變化
  const handlePlayerStateChange = (event: any) => {
    const state = event.data
    console.log('🎬 播放器狀態變化:', state)
    
    switch (state) {
      case 1: // 正在播放
        setVideoState(prev => ({ ...prev, isPlaying: true }))
        break
      case 2: // 已暫停
        setVideoState(prev => ({ ...prev, isPlaying: false }))
        break
      case 0: // 已結束
        setVideoState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))
        break
    }
  }

  // 播放視頻
  const playVideo = () => {
    if (!playerRef.current || !videoState.videoId) {
      setError('請先載入視頻')
      return
    }

    if (!socket || !sessionCode) {
      setError('未連接到會話')
      return
    }

    try {
      const currentTime = playerRef.current.getCurrentTime()
      
      // 發送播放命令到其他設備
      socket.emit('play-video', {
        sessionCode,
        videoId: videoState.videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoState.videoId}`,
        startTime: currentTime,
        timestamp: Date.now()
      })

      // 本地播放
      playerRef.current.playVideo()
      setVideoState(prev => ({ ...prev, isPlaying: true }))
      
      console.log(`🎬 發送播放命令: videoId=${videoState.videoId}, time=${currentTime}s`)
      setSuccess('🎬 開始播放')
    } catch (err: any) {
      console.error('❌ 播放失敗:', err)
      setError(`播放失敗: ${err.message}`)
    }
  }

  // 暫停視頻
  const pauseVideo = () => {
    if (!playerRef.current || !socket || !sessionCode) return

    try {
      // 發送暫停命令到其他設備
      socket.emit('pause-video', {
        sessionCode,
        timestamp: Date.now()
      })

      // 本地暫停
      playerRef.current.pauseVideo()
      setVideoState(prev => ({ ...prev, isPlaying: false }))
      
      console.log('⏸️ 發送暫停命令')
      setSuccess('⏸️ 視頻已暫停')
    } catch (err: any) {
      console.error('❌ 暫停失敗:', err)
      setError(`暫停失敗: ${err.message}`)
    }
  }

  // 停止視頻
  const stopVideo = () => {
    if (!playerRef.current || !socket || !sessionCode) return

    try {
      // 發送停止命令到其他設備
      socket.emit('stop-video', {
        sessionCode,
        timestamp: Date.now()
      })

      // 本地停止
      playerRef.current.stopVideo()
      setVideoState(prev => ({ 
        ...prev, 
        isPlaying: false, 
        currentTime: 0,
        videoId: null 
      }))
      
      console.log('⏹️ 發送停止命令')
      setSuccess('⏹️ 視頻已停止')
    } catch (err: any) {
      console.error('❌ 停止失敗:', err)
      setError(`停止失敗: ${err.message}`)
    }
  }

  // 處理URL輸入
  const handleUrlSubmit = async () => {
    if (!youtubeUrl.trim()) {
      setError('請輸入YouTube URL')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 提取視頻ID
      let videoId = ''
      if (youtubeUrl.includes('youtube.com/watch?v=')) {
        videoId = youtubeUrl.split('v=')[1].split('&')[0]
      } else if (youtubeUrl.includes('youtu.be/')) {
        videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0]
      } else if (youtubeUrl.includes('youtube.com/embed/')) {
        videoId = youtubeUrl.split('embed/')[1].split('?')[0]
      }

      if (!videoId) {
        throw new Error('無法識別YouTube URL格式')
      }

      // 載入視頻
      loadYouTubeVideo(videoId, 0)
      setYoutubeUrl('')
      
    } catch (err: any) {
      console.error('❌ URL處理失敗:', err)
      setError(`URL處理失敗: ${err.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  // 格式化時間
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="h-5 w-5 text-red-600" />
          YouTube 360° 視頻播放器
        </CardTitle>
        <CardDescription>
          載入YouTube 360°視頻並同步播放到所有連接設備
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* URL輸入 */}
        <div className="space-y-2">
          <label htmlFor="youtubeUrl" className="text-sm font-medium text-gray-700">
            YouTube URL
          </label>
          <div className="flex gap-2">
            <Input
              id="youtubeUrl"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <Button
              onClick={handleUrlSubmit}
              disabled={!youtubeUrl.trim() || isLoading || !videoState.isReady}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              載入
            </Button>
          </div>
        </div>

        {/* 播放器容器 */}
        <div className="relative">
          <div
            ref={containerRef}
            className="w-full h-96 bg-gray-100 rounded-lg flex items-center justify-center"
          >
            {!videoState.isReady && (
              <div className="text-center text-gray-500">
                <Loader2 className="mx-auto h-8 w-8 animate-spin mb-2" />
                <p>正在載入YouTube播放器...</p>
              </div>
            )}
            {videoState.isReady && !videoState.videoId && (
              <div className="text-center text-gray-500">
                <Youtube className="mx-auto h-16 w-16 mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">等待載入視頻</h3>
                <p className="text-sm">請輸入YouTube URL並點擊載入</p>
              </div>
            )}
          </div>
        </div>

        {/* 播放控制 */}
        {videoState.videoId && (
          <div className="space-y-4">
            {/* 視頻信息 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {videoState.videoId}
                </Badge>
                <span className="text-sm text-gray-600">
                  當前時間: {formatTime(videoState.currentTime)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-600">同步播放</span>
              </div>
            </div>

            {/* 控制按鈕 */}
            <div className="flex justify-center gap-2">
              <Button
                onClick={playVideo}
                disabled={videoState.isPlaying}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                播放
              </Button>
              <Button
                onClick={pauseVideo}
                disabled={!videoState.isPlaying}
                size="lg"
                variant="outline"
              >
                <Pause className="mr-2 h-4 w-4" />
                暫停
              </Button>
              <Button
                onClick={stopVideo}
                size="lg"
                variant="outline"
              >
                <Square className="mr-2 h-4 w-4" />
                停止
              </Button>
            </div>

            {/* 播放狀態 */}
            <div className="text-center">
              <Badge variant="default" className="text-sm">
                {videoState.isPlaying ? '正在播放中' : '已暫停'} - 所有設備同步
              </Badge>
            </div>
          </div>
        )}

        {/* 錯誤和成功提示 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}







