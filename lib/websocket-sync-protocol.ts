// WebSocket即時同步協議
export interface SyncMessage {
  type: SyncMessageType
  timestamp: number
  deviceId: string
  sessionId: string
  data: any
  checksum?: string
}

export enum SyncMessageType {
  // 設備管理
  DEVICE_REGISTER = "device_register",
  DEVICE_HEARTBEAT = "device_heartbeat",
  DEVICE_DISCONNECT = "device_disconnect",

  // 播放控制
  PLAY_COMMAND = "play_command",
  PAUSE_COMMAND = "pause_command",
  STOP_COMMAND = "stop_command",
  SEEK_COMMAND = "seek_command",

  // 同步控制
  SYNC_REQUEST = "sync_request",
  SYNC_RESPONSE = "sync_response",
  TIME_SYNC = "time_sync",
  LATENCY_TEST = "latency_test",

  // 內容管理
  CONTENT_LOAD = "content_load",
  CONTENT_READY = "content_ready",
  CONTENT_ERROR = "content_error",

  // 狀態回報
  STATUS_UPDATE = "status_update",
  ERROR_REPORT = "error_report",
  NETWORK_STATUS = "network_status",
}

const SYSTEM_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 5000, // Example value for heartbeat interval
}

class WebSocketSyncProtocol {
  private ws: WebSocket | null = null
  private deviceId: string
  private sessionId: string
  private heartbeatInterval: NodeJS.Timeout | null = null
  private latencyHistory: number[] = []
  private syncOffset = 0
  private messageQueue: SyncMessage[] = []
  private isConnected = false

  constructor(deviceId: string, sessionId: string) {
    this.deviceId = deviceId
    this.sessionId = sessionId
  }

  // 建立WebSocket連接
  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(serverUrl)

        this.ws.onopen = () => {
          console.log("WebSocket連接已建立")
          this.isConnected = true
          this.startHeartbeat()
          this.registerDevice()
          this.processMessageQueue()
          resolve()
        }

        this.ws.onmessage = (event) => {
          this.handleMessage(JSON.parse(event.data))
        }

        this.ws.onclose = () => {
          console.log("WebSocket連接已關閉")
          this.isConnected = false
          this.stopHeartbeat()
          this.attemptReconnect()
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket錯誤:", error)
          reject(error)
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  // 發送同步消息
  sendMessage(type: SyncMessageType, data: any): void {
    const message: SyncMessage = {
      type,
      timestamp: this.getServerTime(),
      deviceId: this.deviceId,
      sessionId: this.sessionId,
      data,
      checksum: this.calculateChecksum(data),
    }

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // 離線時加入消息隊列
      this.messageQueue.push(message)
    }
  }

  // 處理接收到的消息
  private handleMessage(message: SyncMessage): void {
    // 驗證消息完整性
    if (!this.validateMessage(message)) {
      console.error("消息驗證失敗:", message)
      return
    }

    switch (message.type) {
      case SyncMessageType.TIME_SYNC:
        this.handleTimeSync(message)
        break
      case SyncMessageType.PLAY_COMMAND:
        this.handlePlayCommand(message)
        break
      case SyncMessageType.PAUSE_COMMAND:
        this.handlePauseCommand(message)
        break
      case SyncMessageType.SYNC_REQUEST:
        this.handleSyncRequest(message)
        break
      case SyncMessageType.LATENCY_TEST:
        this.handleLatencyTest(message)
        break
      default:
        console.log("未處理的消息類型:", message.type)
    }
  }

  // 時間同步處理
  private handleTimeSync(message: SyncMessage): void {
    const serverTime = message.timestamp
    const clientTime = Date.now()
    const roundTripTime = clientTime - message.data.clientSendTime

    // 計算時間偏移
    this.syncOffset = serverTime - clientTime + roundTripTime / 2

    console.log(`時間同步完成，偏移: ${this.syncOffset}ms`)
  }

  // 播放命令處理
  private handlePlayCommand(message: SyncMessage): void {
    const { videoUrl, startTime, syncTime } = message.data
    const delay = syncTime - this.getServerTime()

    if (delay > 0) {
      // 延遲播放以確保同步
      setTimeout(() => {
        this.startPlayback(videoUrl, startTime)
      }, delay)
    } else {
      // 立即播放並調整時間
      this.startPlayback(videoUrl, startTime + Math.abs(delay))
    }
  }

  // 暫停命令處理
  private handlePauseCommand(message: SyncMessage): void {
    const { syncTime } = message.data
    const delay = syncTime - this.getServerTime()

    if (delay > 0) {
      setTimeout(() => {
        this.pausePlayback()
      }, delay)
    } else {
      this.pausePlayback()
    }
  }

  // 同步請求處理
  private handleSyncRequest(message: SyncMessage): void {
    const currentStatus = this.getCurrentPlaybackStatus()

    this.sendMessage(SyncMessageType.SYNC_RESPONSE, {
      currentTime: currentStatus.currentTime,
      isPlaying: currentStatus.isPlaying,
      videoUrl: currentStatus.videoUrl,
      networkLatency: this.getAverageLatency(),
    })
  }

  // 延遲測試處理
  private handleLatencyTest(message: SyncMessage): void {
    const latency = Date.now() - message.timestamp
    this.latencyHistory.push(latency)

    // 保持最近10次延遲記錄
    if (this.latencyHistory.length > 10) {
      this.latencyHistory.shift()
    }

    console.log(`網路延遲: ${latency}ms`)
  }

  // 設備註冊
  private registerDevice(): void {
    this.sendMessage(SyncMessageType.DEVICE_REGISTER, {
      deviceInfo: this.getDeviceInfo(),
      capabilities: this.getDeviceCapabilities(),
      networkInfo: this.getNetworkInfo(),
    })
  }

  // 心跳機制
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendMessage(SyncMessageType.DEVICE_HEARTBEAT, {
        status: this.getCurrentPlaybackStatus(),
        networkLatency: this.getAverageLatency(),
        bufferHealth: this.getBufferHealth(),
      })
    }, SYSTEM_CONFIG.HEARTBEAT_INTERVAL_MS)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  // 斷線重連
  private attemptReconnect(): void {
    let reconnectAttempts = 0
    const maxAttempts = 5

    const reconnect = () => {
      if (reconnectAttempts < maxAttempts) {
        reconnectAttempts++
        console.log(`嘗試重連 (${reconnectAttempts}/${maxAttempts})`)

        setTimeout(() => {
          this.connect(this.ws?.url || "").catch(() => reconnect())
        }, Math.pow(2, reconnectAttempts) * 1000) // 指數退避
      } else {
        console.error("重連失敗，已達最大嘗試次數")
        this.handleConnectionFailure()
      }
    }

    reconnect()
  }

  // 獲取服務器時間
  private getServerTime(): number {
    return Date.now() + this.syncOffset
  }

  // 獲取平均延遲
  private getAverageLatency(): number {
    if (this.latencyHistory.length === 0) return 0
    return this.latencyHistory.reduce((a, b) => a + b, 0) / this.latencyHistory.length
  }

  // 消息驗證
  private validateMessage(message: SyncMessage): boolean {
    if (!message.checksum) return true // 某些消息可能不需要校驗和
    return this.calculateChecksum(message.data) === message.checksum
  }

  // 計算校驗和
  private calculateChecksum(data: any): string {
    return btoa(JSON.stringify(data)).slice(0, 8)
  }

  // 處理消息隊列
  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      }
    }
  }

  // 獲取設備信息
  private getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      devicePixelRatio: window.devicePixelRatio,
      platform: navigator.platform,
      language: navigator.language,
    }
  }

  // 獲取設備能力
  private getDeviceCapabilities(): string[] {
    const capabilities = ["video-playback"]

    if ("DeviceOrientationEvent" in window) {
      capabilities.push("gyroscope")
    }

    if ("getVRDisplays" in navigator) {
      capabilities.push("webvr")
    }

    if ("xr" in navigator) {
      capabilities.push("webxr")
    }

    return capabilities
  }

  // 獲取網路信息
  private getNetworkInfo(): any {
    const connection =
      (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection

    return {
      effectiveType: connection?.effectiveType || "unknown",
      downlink: connection?.downlink || 0,
      rtt: connection?.rtt || 0,
    }
  }

  // 獲取當前播放狀態
  private getCurrentPlaybackStatus(): any {
    // 這裡需要與實際的播放器整合
    return {
      currentTime: 0,
      isPlaying: false,
      videoUrl: "",
      bufferLevel: 0,
    }
  }

  // 獲取緩衝健康度
  private getBufferHealth(): number {
    // 返回緩衝區健康度 (0-100)
    return 100
  }

  // 開始播放
  private startPlayback(videoUrl: string, startTime: number): void {
    // 實際播放邏輯
    console.log(`開始播放: ${videoUrl}, 起始時間: ${startTime}`)
  }

  // 暫停播放
  private pausePlayback(): void {
    // 實際暫停邏輯
    console.log("暫停播放")
  }

  // 處理連接失敗
  private handleConnectionFailure(): void {
    // 通知用戶連接失敗
    console.error("無法連接到服務器")
  }
}

export { WebSocketSyncProtocol }
