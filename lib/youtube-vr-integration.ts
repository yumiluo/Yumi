// YouTube VR影片深度整合
import { YT } from "youtube-api"
import type { VRDisplay } from "vr-display-api"
import type { WebSocketSyncProtocol } from "sync-protocol"
import { SyncMessageType } from "sync-message-types"

export interface YouTubeVRConfig {
  apiKey: string
  channelId?: string
  playlistId?: string
  quality: "small" | "medium" | "large" | "hd720" | "hd1080" | "hd1440" | "hd2160"
  vrMode: "360" | "180" | "stereo" | "mono"
  autoplay: boolean
  controls: boolean
  enablejsapi: boolean
}

export interface VRVideoMetadata {
  videoId: string
  title: string
  description: string
  duration: number
  thumbnails: YouTubeThumbnails
  vrProjection: VRProjectionType
  spatialAudio: boolean
  resolution: string
  fps: number
  uploadDate: string
  channelTitle: string
  viewCount: number
  tags: string[]
}

export enum VRProjectionType {
  EQUIRECTANGULAR = "equirectangular",
  CUBEMAP = "cubemap",
  CYLINDRICAL = "cylindrical",
  FISHEYE = "fisheye",
}

export interface YouTubeThumbnails {
  default: { url: string; width: number; height: number }
  medium: { url: string; width: number; height: number }
  high: { url: string; width: number; height: number }
  maxres?: { url: string; width: number; height: number }
}

class YouTubeVRIntegration {
  private apiKey: string
  private player: YT.Player | null = null
  private isVRMode = false
  private vrDisplay: VRDisplay | null = null
  private syncProtocol: WebSocketSyncProtocol
  private qualityLevels: string[] = []

  constructor(apiKey: string, syncProtocol: WebSocketSyncProtocol) {
    this.apiKey = apiKey
    this.syncProtocol = syncProtocol
    this.initializeYouTubeAPI()
  }

  // 初始化YouTube API
  private async initializeYouTubeAPI(): Promise<void> {
    return new Promise((resolve) => {
      if (window.YT && window.YT.Player) {
        resolve()
        return
      }

      // 載入YouTube IFrame API
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      // 等待API載入完成
      window.onYouTubeIframeAPIReady = () => {
        console.log("YouTube IFrame API已載入")
        resolve()
      }
    })
  }

  // 創建VR播放器
  async createVRPlayer(containerId: string, config: YouTubeVRConfig): Promise<YT.Player> {
    await this.initializeYouTubeAPI()

    return new Promise((resolve, reject) => {
      try {
        this.player = new YT.Player(containerId, {
          height: "100%",
          width: "100%",
          videoId: "",
          playerVars: {
            autoplay: config.autoplay ? 1 : 0,
            controls: config.controls ? 1 : 0,
            enablejsapi: config.enablejsapi ? 1 : 0,
            fs: 1, // 允許全螢幕
            modestbranding: 1, // 簡化品牌
            rel: 0, // 不顯示相關影片
            iv_load_policy: 3, // 不顯示註解
            cc_load_policy: 0, // 不顯示字幕
            playsinline: 1, // iOS內嵌播放
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              console.log("YouTube播放器已準備就緒")
              this.setupVRControls()
              this.setupSyncListeners()
              resolve(event.target)
            },
            onStateChange: (event) => {
              this.handlePlayerStateChange(event)
            },
            onPlaybackQualityChange: (event) => {
              this.handleQualityChange(event)
            },
            onError: (event) => {
              console.error("YouTube播放器錯誤:", event.data)
              reject(new Error(`YouTube播放器錯誤: ${event.data}`))
            },
          },
        })
      } catch (error) {
        reject(error)
      }
    })
  }

  // 載入VR影片
  async loadVRVideo(videoId: string): Promise<VRVideoMetadata> {
    if (!this.player) {
      throw new Error("播放器未初始化")
    }

    // 獲取影片元數據
    const metadata = await this.getVideoMetadata(videoId)

    // 驗證是否為VR影片
    if (!this.isVRVideo(metadata)) {
      throw new Error("此影片不是VR格式")
    }

    // 載入影片
    this.player.loadVideoById({
      videoId: videoId,
      startSeconds: 0,
      suggestedQuality: "hd1080",
    })

    // 設置VR模式
    await this.enableVRMode(metadata.vrProjection)

    return metadata
  }

  // 獲取影片元數據
  private async getVideoMetadata(videoId: string): Promise<VRVideoMetadata> {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${this.apiKey}&part=snippet,contentDetails,statistics`,
    )

    if (!response.ok) {
      throw new Error("無法獲取影片信息")
    }

    const data = await response.json()
    const video = data.items[0]

    if (!video) {
      throw new Error("影片不存在")
    }

    return {
      videoId: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      duration: this.parseDuration(video.contentDetails.duration),
      thumbnails: video.snippet.thumbnails,
      vrProjection: this.detectVRProjection(video.snippet),
      spatialAudio: this.hasSpatialAudio(video.snippet),
      resolution: this.detectResolution(video.snippet),
      fps: this.detectFPS(video.snippet),
      uploadDate: video.snippet.publishedAt,
      channelTitle: video.snippet.channelTitle,
      viewCount: Number.parseInt(video.statistics.viewCount),
      tags: video.snippet.tags || [],
    }
  }

  // 檢測是否為VR影片
  private isVRVideo(metadata: VRVideoMetadata): boolean {
    const vrKeywords = ["360", "vr", "virtual reality", "全景", "虛擬實境"]
    const title = metadata.title.toLowerCase()
    const description = metadata.description.toLowerCase()
    const tags = metadata.tags.map((tag) => tag.toLowerCase())

    return vrKeywords.some(
      (keyword) =>
        title.includes(keyword) || description.includes(keyword) || tags.some((tag) => tag.includes(keyword)),
    )
  }

  // 檢測VR投影類型
  private detectVRProjection(snippet: any): VRProjectionType {
    const text = (snippet.title + " " + snippet.description).toLowerCase()

    if (text.includes("cubemap") || text.includes("cube map")) {
      return VRProjectionType.CUBEMAP
    } else if (text.includes("cylindrical")) {
      return VRProjectionType.CYLINDRICAL
    } else if (text.includes("fisheye")) {
      return VRProjectionType.FISHEYE
    } else {
      return VRProjectionType.EQUIRECTANGULAR // 預設
    }
  }

  // 檢測是否有空間音效
  private hasSpatialAudio(snippet: any): boolean {
    const text = (snippet.title + " " + snippet.description).toLowerCase()
    return text.includes("spatial audio") || text.includes("3d audio") || text.includes("ambisonic")
  }

  // 檢測解析度
  private detectResolution(snippet: any): string {
    const text = snippet.title + " " + snippet.description
    const resolutions = ["8K", "4K", "2K", "1440p", "1080p", "720p"]

    for (const res of resolutions) {
      if (text.includes(res)) {
        return res
      }
    }

    return "1080p" // 預設
  }

  // 檢測幀率
  private detectFPS(snippet: any): number {
    const text = snippet.title + " " + snippet.description
    const fpsMatch = text.match(/(\d+)\s*fps/i)
    return fpsMatch ? Number.parseInt(fpsMatch[1]) : 30
  }

  // 解析影片時長
  private parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    if (!match) return 0

    const hours = Number.parseInt(match[1]?.replace("H", "") || "0")
    const minutes = Number.parseInt(match[2]?.replace("M", "") || "0")
    const seconds = Number.parseInt(match[3]?.replace("S", "") || "0")

    return hours * 3600 + minutes * 60 + seconds
  }

  // 啟用VR模式
  private async enableVRMode(projection: VRProjectionType): Promise<void> {
    this.isVRMode = true

    // 檢查WebVR支援
    if ("getVRDisplays" in navigator) {
      const displays = await (navigator as any).getVRDisplays()
      if (displays.length > 0) {
        this.vrDisplay = displays[0]
        console.log("找到VR顯示器:", this.vrDisplay.displayName)
      }
    }

    // 設置VR投影
    this.setupVRProjection(projection)

    // 啟用陀螺儀控制
    this.enableGyroscopeControl()
  }

  // 設置VR投影
  private setupVRProjection(projection: VRProjectionType): void {
    const iframe = this.player?.getIframe()
    if (!iframe) return

    // 添加VR相關的CSS類
    iframe.classList.add("vr-video")
    iframe.classList.add(`vr-${projection}`)

    // 設置VR視窗比例
    iframe.style.aspectRatio = "16:9"
  }

  // 啟用陀螺儀控制
  private enableGyroscopeControl(): void {
    if ("DeviceOrientationEvent" in window) {
      // 請求權限 (iOS 13+)
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        ;(DeviceOrientationEvent as any).requestPermission().then((response: string) => {
          if (response === "granted") {
            this.startGyroscopeTracking()
          }
        })
      } else {
        this.startGyroscopeTracking()
      }
    }
  }

  // 開始陀螺儀追蹤
  private startGyroscopeTracking(): void {
    window.addEventListener("deviceorientation", (event) => {
      if (this.isVRMode && this.player) {
        // 將陀螺儀數據轉換為視角控制
        const alpha = event.alpha || 0 // Z軸旋轉
        const beta = event.beta || 0 // X軸旋轉
        const gamma = event.gamma || 0 // Y軸旋轉

        // 這裡需要與YouTube播放器的VR控制整合
        this.updateVRViewpoint(alpha, beta, gamma)
      }
    })
  }

  // 更新VR視角
  private updateVRViewpoint(alpha: number, beta: number, gamma: number): void {
    // 實現VR視角更新邏輯
    console.log(`VR視角更新: α=${alpha}, β=${beta}, γ=${gamma}`)
  }

  // 設置同步監聽器
  private setupSyncListeners(): void {
    if (!this.player) return

    // 監聽播放狀態變化
    const checkInterval = setInterval(() => {
      if (this.player && this.player.getPlayerState) {
        const currentTime = this.player.getCurrentTime()
        const state = this.player.getPlayerState()

        // 發送狀態更新
        this.syncProtocol.sendMessage(SyncMessageType.STATUS_UPDATE, {
          currentTime,
          playerState: state,
          quality: this.player.getPlaybackQuality(),
          availableQualityLevels: this.player.getAvailableQualityLevels(),
        })
      }
    }, 100) // 每100ms檢查一次

    // 清理定時器
    window.addEventListener("beforeunload", () => {
      clearInterval(checkInterval)
    })
  }

  // 處理播放器狀態變化
  private handlePlayerStateChange(event: YT.OnStateChangeEvent): void {
    const state = event.data

    switch (state) {
      case YT.PlayerState.PLAYING:
        console.log("影片開始播放")
        break
      case YT.PlayerState.PAUSED:
        console.log("影片已暫停")
        break
      case YT.PlayerState.ENDED:
        console.log("影片播放結束")
        break
      case YT.PlayerState.BUFFERING:
        console.log("影片緩衝中")
        break
    }

    // 發送狀態變化通知
    this.syncProtocol.sendMessage(SyncMessageType.STATUS_UPDATE, {
      playerState: state,
      currentTime: this.player?.getCurrentTime() || 0,
    })
  }

  // 處理品質變化
  private handleQualityChange(event: YT.OnPlaybackQualityChangeEvent): void {
    console.log("播放品質變更為:", event.data)

    this.syncProtocol.sendMessage(SyncMessageType.STATUS_UPDATE, {
      quality: event.data,
      availableQualityLevels: this.player?.getAvailableQualityLevels(),
    })
  }

  // 設置VR控制
  private setupVRControls(): void {
    // 添加VR控制按鈕
    this.addVRControlButtons()

    // 設置手勢控制
    this.setupGestureControls()
  }

  // 添加VR控制按鈕
  private addVRControlButtons(): void {
    const controlsContainer = document.createElement("div")
    controlsContainer.className = "vr-controls"
    controlsContainer.innerHTML = `
      <button id="vr-toggle" class="vr-btn">VR模式</button>
      <button id="vr-recenter" class="vr-btn">重新定位</button>
      <button id="vr-fullscreen" class="vr-btn">全螢幕</button>
    `

    // 添加到播放器容器
    const playerContainer = this.player?.getIframe().parentElement
    if (playerContainer) {
      playerContainer.appendChild(controlsContainer)
    }

    // 綁定事件
    document.getElementById("vr-toggle")?.addEventListener("click", () => {
      this.toggleVRMode()
    })

    document.getElementById("vr-recenter")?.addEventListener("click", () => {
      this.recenterVRView()
    })

    document.getElementById("vr-fullscreen")?.addEventListener("click", () => {
      this.enterVRFullscreen()
    })
  }

  // 設置手勢控制
  private setupGestureControls(): void {
    const iframe = this.player?.getIframe()
    if (!iframe) return

    let startX = 0,
      startY = 0
    let isDragging = false

    iframe.addEventListener("touchstart", (e) => {
      if (this.isVRMode) {
        startX = e.touches[0].clientX
        startY = e.touches[0].clientY
        isDragging = true
      }
    })

    iframe.addEventListener("touchmove", (e) => {
      if (this.isVRMode && isDragging) {
        const deltaX = e.touches[0].clientX - startX
        const deltaY = e.touches[0].clientY - startY

        // 實現VR視角拖拽控制
        this.handleVRDrag(deltaX, deltaY)
      }
    })

    iframe.addEventListener("touchend", () => {
      isDragging = false
    })
  }

  // 處理VR拖拽
  private handleVRDrag(deltaX: number, deltaY: number): void {
    // 實現VR視角拖拽邏輯
    console.log(`VR拖拽: X=${deltaX}, Y=${deltaY}`)
  }

  // 切換VR模式
  private toggleVRMode(): void {
    this.isVRMode = !this.isVRMode

    if (this.isVRMode) {
      this.enableVRMode(VRProjectionType.EQUIRECTANGULAR)
    } else {
      this.disableVRMode()
    }
  }

  // 關閉VR模式
  private disableVRMode(): void {
    this.isVRMode = false

    const iframe = this.player?.getIframe()
    if (iframe) {
      iframe.classList.remove("vr-video")
      iframe.style.aspectRatio = ""
    }
  }

  // 重新定位VR視角
  private recenterVRView(): void {
    if (this.isVRMode) {
      // 重置VR視角到中心位置
      console.log("重新定位VR視角")
    }
  }

  // 進入VR全螢幕
  private async enterVRFullscreen(): Promise<void> {
    if (this.vrDisplay) {
      try {
        await this.vrDisplay.requestPresent([
          {
            source: this.player?.getIframe(),
          },
        ])
        console.log("已進入VR全螢幕模式")
      } catch (error) {
        console.error("無法進入VR全螢幕:", error)
      }
    } else {
      // 降級到普通全螢幕
      const iframe = this.player?.getIframe()
      if (iframe && iframe.requestFullscreen) {
        iframe.requestFullscreen()
      }
    }
  }

  // 同步播放控制
  async syncPlay(startTime: number, syncTime: number): Promise<void> {
    if (!this.player) return

    const delay = syncTime - Date.now()

    if (delay > 0) {
      setTimeout(() => {
        this.player?.seekTo(startTime, true)
        this.player?.playVideo()
      }, delay)
    } else {
      this.player.seekTo(startTime + Math.abs(delay) / 1000, true)
      this.player.playVideo()
    }
  }

  // 同步暫停控制
  async syncPause(syncTime: number): Promise<void> {
    if (!this.player) return

    const delay = syncTime - Date.now()

    if (delay > 0) {
      setTimeout(() => {
        this.player?.pauseVideo()
      }, delay)
    } else {
      this.player.pauseVideo()
    }
  }

  // 獲取播放狀態
  getPlaybackStatus(): any {
    if (!this.player) return null

    return {
      currentTime: this.player.getCurrentTime(),
      duration: this.player.getDuration(),
      playerState: this.player.getPlayerState(),
      quality: this.player.getPlaybackQuality(),
      volume: this.player.getVolume(),
      isVRMode: this.isVRMode,
    }
  }
}

export { YouTubeVRIntegration }

// 全域變數聲明
declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: () => void
  }
}
