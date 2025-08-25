// VR旅遊團同步播放管理器

export interface SyncState {
  videoId: string
  currentTime: number
  isPlaying: boolean
  playbackRate: number
  volume: number
  isMuted: boolean
  lastSyncTime: number
}

export interface TourParticipant {
  id: string
  name: string
  deviceType: 'vr' | 'mobile' | 'desktop'
  status: 'online' | 'offline' | 'watching' | 'buffering'
  syncState: SyncState | null
  lastSeen: number
  isTourGuide: boolean
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor'
}

export interface TourSession {
  id: string
  name: string
  tourGuideId: string
  participants: Map<string, TourParticipant>
  syncState: SyncState
  maxParticipants: number
  status: 'preparing' | 'active' | 'paused' | 'finished'
  createdAt: number
  lastActivity: number
}

export class VRTourSyncManager {
  private sessions: Map<string, TourSession> = new Map()
  private socket: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(private serverUrl: string = 'ws://localhost:3002') {
    this.connect()
  }

  // 連接到WebSocket服務器
  private connect() {
    try {
      this.socket = new WebSocket(this.serverUrl)
      this.setupSocketHandlers()
    } catch (error) {
      console.error('WebSocket連接失敗:', error)
      this.handleReconnect()
    }
  }

  // 設置WebSocket事件處理器
  private setupSocketHandlers() {
    if (!this.socket) return

    this.socket.onopen = () => {
      console.log('已連接到VR旅遊團同步服務器')
      this.reconnectAttempts = 0
      this.authenticate()
    }

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.handleServerMessage(data)
      } catch (error) {
        console.error('解析服務器消息失敗:', error)
      }
    }

    this.socket.onclose = () => {
      console.log('與服務器斷開連接')
      this.handleReconnect()
    }

    this.socket.onerror = (error) => {
      console.error('WebSocket錯誤:', error)
    }
  }

  // 處理重連
  private handleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('達到最大重連次數，停止重連')
      return
    }

    this.reconnectAttempts++
    console.log(`嘗試重連 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
    
    setTimeout(() => {
      this.connect()
    }, this.reconnectDelay * this.reconnectAttempts)
  }

  // 認證連接
  private authenticate() {
    if (!this.socket) return

    const authMessage = {
      type: 'auth',
      clientType: 'vr-tour-sync',
      version: '1.0.0',
      timestamp: Date.now()
    }

    this.socket.send(JSON.stringify(authMessage))
  }

  // 處理服務器消息
  private handleServerMessage(data: any) {
    switch (data.type) {
      case 'auth-success':
        console.log('認證成功')
        break
      
      case 'session-update':
        this.handleSessionUpdate(data.sessionId, data.session)
        break
      
      case 'participant-joined':
        this.handleParticipantJoined(data.sessionId, data.participant)
        break
      
      case 'participant-left':
        this.handleParticipantLeft(data.sessionId, data.participantId)
        break
      
      case 'sync-update':
        this.handleSyncUpdate(data.sessionId, data.syncState)
        break
      
      case 'chat-message':
        this.handleChatMessage(data.sessionId, data.message)
        break
      
      default:
        console.log('未知消息類型:', data.type)
    }
  }

  // 創建新的旅遊團會話
  createTourSession(sessionData: {
    name: string
    tourGuideId: string
    maxParticipants: number
  }): string {
    const sessionId = `tour_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const session: TourSession = {
      id: sessionId,
      name: sessionData.name,
      tourGuideId: sessionData.tourGuideId,
      participants: new Map(),
      syncState: {
        videoId: '',
        currentTime: 0,
        isPlaying: false,
        playbackRate: 1,
        volume: 100,
        isMuted: false,
        lastSyncTime: Date.now()
      },
      maxParticipants: sessionData.maxParticipants,
      status: 'preparing',
      createdAt: Date.now(),
      lastActivity: Date.now()
    }

    // 添加導遊作為第一個參與者
    const tourGuide: TourParticipant = {
      id: sessionData.tourGuideId,
      name: '導遊',
      deviceType: 'desktop',
      status: 'online',
      syncState: null,
      lastSeen: Date.now(),
      isTourGuide: true,
      connectionQuality: 'excellent'
    }
    
    session.participants.set(tourGuide.id, tourGuide)
    this.sessions.set(sessionId, session)

    // 通知服務器
    this.notifyServer('session-created', { sessionId, session })
    
    return sessionId
  }

  // 加入旅遊團會話
  joinTourSession(sessionId: string, participantData: {
    id: string
    name: string
    deviceType: 'vr' | 'mobile' | 'desktop'
  }): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) {
      console.error('會話不存在:', sessionId)
      return false
    }

    if (session.participants.size >= session.maxParticipants) {
      console.error('會話已滿')
      return false
    }

    const participant: TourParticipant = {
      ...participantData,
      status: 'online',
      syncState: null,
      lastSeen: Date.now(),
      isTourGuide: false,
      connectionQuality: 'good'
    }

    session.participants.set(participant.id, participant)
    session.lastActivity = Date.now()

    // 通知服務器
    this.notifyServer('participant-joined', { sessionId, participant })
    
    return true
  }

  // 離開旅遊團會話
  leaveTourSession(sessionId: string, participantId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    const participant = session.participants.get(participantId)
    if (!participant) return false

    session.participants.delete(participantId)
    session.lastActivity = Date.now()

    // 通知服務器
    this.notifyServer('participant-left', { sessionId, participantId })
    
    return true
  }

  // 更新同步狀態
  updateSyncState(sessionId: string, participantId: string, syncState: Partial<SyncState>) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const participant = session.participants.get(participantId)
    if (!participant) return

    // 更新參與者的同步狀態
    participant.syncState = {
      ...participant.syncState,
      ...syncState,
      lastSyncTime: Date.now()
    } as SyncState

    // 如果是導遊，更新會話的全局同步狀態
    if (participant.isTourGuide) {
      session.syncState = {
        ...session.syncState,
        ...syncState,
        lastSyncTime: Date.now()
      }
      
      // 廣播同步更新給所有參與者
      this.broadcastSyncUpdate(sessionId, session.syncState)
    }

    session.lastActivity = Date.now()
  }

  // 廣播同步更新
  private broadcastSyncUpdate(sessionId: string, syncState: SyncState) {
    this.notifyServer('sync-broadcast', { sessionId, syncState })
  }

  // 發送聊天消息
  sendChatMessage(sessionId: string, participantId: string, message: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const participant = session.participants.get(participantId)
    if (!participant) return

    const chatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      participantId,
      participantName: participant.name,
      message,
      timestamp: Date.now(),
      type: 'text'
    }

    // 通知服務器
    this.notifyServer('chat-message', chatMessage)
  }

  // 開始旅遊團
  startTour(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.status = 'active'
    session.lastActivity = Date.now()

    // 通知服務器
    this.notifyServer('tour-started', { sessionId })
    
    return true
  }

  // 暫停旅遊團
  pauseTour(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.status = 'paused'
    session.syncState.isPlaying = false
    session.lastActivity = Date.now()

    // 通知服務器
    this.notifyServer('tour-paused', { sessionId })
    
    return true
  }

  // 結束旅遊團
  endTour(sessionId: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session) return false

    session.status = 'finished'
    session.syncState.isPlaying = false
    session.lastActivity = Date.now()

    // 通知服務器
    this.notifyServer('tour-ended', { sessionId })
    
    return true
  }

  // 獲取會話信息
  getSession(sessionId: string): TourSession | undefined {
    return this.sessions.get(sessionId)
  }

  // 獲取所有會話
  getAllSessions(): TourSession[] {
    return Array.from(this.sessions.values())
  }

  // 獲取參與者列表
  getParticipants(sessionId: string): TourParticipant[] {
    const session = this.sessions.get(sessionId)
    return session ? Array.from(session.participants.values()) : []
  }

  // 獲取同步狀態
  getSyncState(sessionId: string): SyncState | undefined {
    const session = this.sessions.get(sessionId)
    return session?.syncState
  }

  // 檢查參與者連接質量
  checkConnectionQuality(sessionId: string, participantId: string): 'excellent' | 'good' | 'fair' | 'poor' {
    const session = this.sessions.get(sessionId)
    if (!session) return 'poor'

    const participant = session.participants.get(participantId)
    if (!participant) return 'poor'

    const now = Date.now()
    const timeSinceLastSeen = now - participant.lastSeen

    if (timeSinceLastSeen < 1000) return 'excellent'
    if (timeSinceLastSeen < 3000) return 'good'
    if (timeSinceLastSeen < 10000) return 'fair'
    return 'poor'
  }

  // 清理過期的會話
  cleanupExpiredSessions(maxAge: number = 24 * 60 * 60 * 1000) { // 默認24小時
    const now = Date.now()
    const expiredSessions: string[] = []

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivity > maxAge) {
        expiredSessions.push(sessionId)
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessions.delete(sessionId)
      console.log('清理過期會話:', sessionId)
    })
  }

  // 通知服務器
  private notifyServer(type: string, data: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket未連接，無法發送消息')
      return
    }

    const message = {
      type,
      data,
      timestamp: Date.now()
    }

    this.socket.send(JSON.stringify(message))
  }

  // 處理會話更新
  private handleSessionUpdate(sessionId: string, sessionData: any) {
    // 更新本地會話數據
    if (this.sessions.has(sessionId)) {
      const existingSession = this.sessions.get(sessionId)!
      this.sessions.set(sessionId, { ...existingSession, ...sessionData })
    }
  }

  // 處理參與者加入
  private handleParticipantJoined(sessionId: string, participantData: any) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    const participant: TourParticipant = {
      ...participantData,
      lastSeen: Date.now()
    }

    session.participants.set(participant.id, participant)
    session.lastActivity = Date.now()
  }

  // 處理參與者離開
  private handleParticipantLeft(sessionId: string, participantId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.participants.delete(participantId)
    session.lastActivity = Date.now()
  }

  // 處理同步更新
  private handleSyncUpdate(sessionId: string, syncState: SyncState) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.syncState = { ...session.syncState, ...syncState }
    session.lastActivity = Date.now()
  }

  // 處理聊天消息
  private handleChatMessage(sessionId: string, messageData: any) {
    // 這裡可以觸發聊天消息的回調函數
    console.log('收到聊天消息:', messageData)
  }

  // 斷開連接
  disconnect() {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  // 銷毀管理器
  destroy() {
    this.disconnect()
    this.sessions.clear()
  }
}

// 創建全局實例
export const vrTourSyncManager = new VRTourSyncManager()

