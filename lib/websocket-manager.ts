import { EventEmitter } from 'events'

export interface WebSocketMessage {
  type: string
  data: any
  timestamp: number
  id?: string
}

export interface ConnectionConfig {
  url: string
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
  timeout: number
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null
  private config: ConnectionConfig
  private reconnectAttempts = 0
  private heartbeatTimer: NodeJS.Timeout | null = null
  private reconnectTimer: NodeJS.Timeout | null = null
  private isConnecting = false
  private messageQueue: WebSocketMessage[] = []
  private connectionPool = new Map<string, WebSocket>()

  constructor(config: Partial<ConnectionConfig> = {}) {
    super()
    this.config = {
      url: config.url || 'ws://localhost:3001',
      reconnectInterval: config.reconnectInterval || 1000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      timeout: config.timeout || 5000
    }
  }

  // 連接WebSocket
  async connect(): Promise<boolean> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return true
    }

    this.isConnecting = true
    
    try {
      this.ws = new WebSocket(this.config.url)
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          this.emit('error', new Error('Connection timeout'))
          resolve(false)
        }, this.config.timeout)

        this.ws!.onopen = () => {
          clearTimeout(timeout)
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.emit('connected')
          this.startHeartbeat()
          this.flushMessageQueue()
          resolve(true)
        }

        this.ws!.onclose = (event) => {
          this.isConnecting = false
          this.stopHeartbeat()
          this.emit('disconnected', event)
          this.scheduleReconnect()
          resolve(false)
        }

        this.ws!.onerror = (error) => {
          this.isConnecting = false
          this.emit('error', error)
          resolve(false)
        }

        this.ws!.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            this.emit('message', message)
            this.emit(message.type, message.data)
          } catch (error) {
            this.emit('error', new Error('Invalid message format'))
          }
        }
      })
    } catch (error) {
      this.isConnecting = false
      this.emit('error', error)
      return false
    }
  }

  // 發送消息
  send(type: string, data: any, id?: string): boolean {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now(),
      id
    }

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
      return true
    } else {
      // 如果連接未建立，將消息加入隊列
      this.messageQueue.push(message)
      return false
    }
  }

  // 發送消息並等待響應
  async sendWithResponse(type: string, data: any, timeout = 5000): Promise<any> {
    return new Promise((resolve, reject) => {
      const messageId = Math.random().toString(36).substr(2, 9)
      const timeoutId = setTimeout(() => {
        this.removeListener(`response:${messageId}`, resolve)
        reject(new Error('Response timeout'))
      }, timeout)

      this.once(`response:${messageId}`, (response) => {
        clearTimeout(timeoutId)
        resolve(response)
      })

      this.send(type, data, messageId)
    })
  }

  // 斷開連接
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.stopHeartbeat()
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }

  // 獲取連接狀態
  getConnectionState(): string {
    if (!this.ws) return 'disconnected'
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting'
      case WebSocket.OPEN: return 'connected'
      case WebSocket.CLOSING: return 'closing'
      case WebSocket.CLOSED: return 'closed'
      default: return 'unknown'
    }
  }

  // 是否已連接
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  // 開始心跳檢測
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send('heartbeat', { timestamp: Date.now() })
      }
    }, this.config.heartbeatInterval)
  }

  // 停止心跳檢測
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  // 安排重連
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emit('maxReconnectAttemptsReached')
      return
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++
      this.connect()
    }, this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts))
  }

  // 清空消息隊列
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!
      this.ws?.send(JSON.stringify(message))
    }
  }

  // 創建連接池
  createConnectionPool(urls: string[]): Map<string, WebSocket> {
    urls.forEach(url => {
      if (!this.connectionPool.has(url)) {
        const ws = new WebSocket(url)
        this.connectionPool.set(url, ws)
      }
    })
    return this.connectionPool
  }

  // 獲取連接池狀態
  getConnectionPoolStatus(): Record<string, string> {
    const status: Record<string, string> = {}
    this.connectionPool.forEach((ws, url) => {
      status[url] = this.getConnectionState()
    })
    return status
  }
}

// 創建單例實例
export const websocketManager = new WebSocketManager()
export default websocketManager
