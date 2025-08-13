import { WebSocketServer } from "ws"
import { createServer } from "http"

interface DeviceConnection {
  id: string
  name: string
  type: "vr" | "mobile"
  ws: any
  lastPing: number
  status: "connected" | "disconnected" | "error"
  batteryLevel?: number
  capabilities: string[]
}

interface SessionData {
  userId: string
  devices: Map<string, DeviceConnection>
  currentVideo?: string
  playbackState: "playing" | "paused" | "stopped"
  currentTime: number
}

class VRWebSocketServer {
  private wss: WebSocketServer
  private server: any
  private sessions: Map<string, SessionData> = new Map()
  private port: number

  constructor(port = 8080) {
    this.port = port
    this.server = createServer()
    this.wss = new WebSocketServer({ server: this.server })
    this.setupWebSocket()
  }

  private setupWebSocket() {
    this.wss.on("connection", (ws, request) => {
      console.log("新的WebSocket連接")

      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString())
          await this.handleMessage(ws, message)
        } catch (error) {
          console.error("WebSocket消息錯誤:", error)
          ws.send(JSON.stringify({ type: "error", message: "無效的消息格式" }))
        }
      })

      ws.on("close", () => {
        this.handleDisconnection(ws)
      })

      ws.on("error", (error) => {
        console.error("WebSocket錯誤:", error)
      })

      // 每30秒發送ping
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.ping()
        } else {
          clearInterval(pingInterval)
        }
      }, 30000)
    })
  }

  private async handleMessage(ws: any, message: any) {
    const { type, payload, sessionId } = message

    // 使用sessionId而不是JWT token
    if (sessionId) {
      ws.sessionId = sessionId
    }

    switch (type) {
      case "device_register":
        await this.handleDeviceRegister(ws, payload)
        break
      case "play_video":
        await this.handlePlayVideo(ws, payload)
        break
      case "pause_video":
        await this.handlePauseVideo(ws, payload)
        break
      case "stop_video":
        await this.handleStopVideo(ws, payload)
        break
      case "sync_devices":
        await this.handleSyncDevices(ws, payload)
        break
      case "emergency_stop":
        await this.handleEmergencyStop(ws)
        break
      case "device_status":
        await this.handleDeviceStatus(ws, payload)
        break
      case "ping":
        ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }))
        break
      default:
        ws.send(JSON.stringify({ type: "error", message: "未知的消息類型" }))
    }
  }

  private async handleDeviceRegister(ws: any, payload: any) {
    const { deviceId, deviceName, deviceType, capabilities = [] } = payload

    const sessionId = ws.sessionId || "default"

    let session = this.sessions.get(sessionId)
    if (!session) {
      session = {
        userId: sessionId,
        devices: new Map(),
        playbackState: "stopped",
        currentTime: 0,
      }
      this.sessions.set(sessionId, session)
    }

    const device: DeviceConnection = {
      id: deviceId,
      name: deviceName,
      type: deviceType,
      ws: ws,
      lastPing: Date.now(),
      status: "connected",
      capabilities: capabilities,
    }

    session.devices.set(deviceId, device)
    ws.deviceId = deviceId

    ws.send(
      JSON.stringify({
        type: "device_registered",
        payload: { deviceId, status: "connected" },
      }),
    )

    // 通知其他設備有新設備加入
    this.broadcastToSession(
      sessionId,
      {
        type: "device_joined",
        payload: { deviceId, deviceName, deviceType },
      },
      deviceId,
    )

    console.log(`設備註冊: ${deviceName} (${deviceId})`)
  }

  private async handlePlayVideo(ws: any, payload: any) {
    const { videoUrl, startTime = 0 } = payload
    const sessionId = ws.sessionId || "default"

    const session = this.sessions.get(sessionId)
    if (!session) return

    session.currentVideo = videoUrl
    session.playbackState = "playing"
    session.currentTime = startTime

    this.broadcastToSession(sessionId, {
      type: "play_command",
      payload: { videoUrl, startTime, timestamp: Date.now() },
    })

    console.log(`播放視頻: ${videoUrl}`)
  }

  private async handlePauseVideo(ws: any, payload: any) {
    const sessionId = ws.sessionId || "default"

    const session = this.sessions.get(sessionId)
    if (!session) return

    session.playbackState = "paused"

    this.broadcastToSession(sessionId, {
      type: "pause_command",
      payload: { timestamp: Date.now() },
    })

    console.log("暫停播放")
  }

  private async handleStopVideo(ws: any, payload: any) {
    const sessionId = ws.sessionId || "default"

    const session = this.sessions.get(sessionId)
    if (!session) return

    session.playbackState = "stopped"
    session.currentVideo = undefined
    session.currentTime = 0

    this.broadcastToSession(sessionId, {
      type: "stop_command",
      payload: { timestamp: Date.now() },
    })

    console.log("停止播放")
  }

  private async handleSyncDevices(ws: any, payload: any) {
    const sessionId = ws.sessionId || "default"

    const session = this.sessions.get(sessionId)
    if (!session) return

    const syncData = {
      currentVideo: session.currentVideo,
      playbackState: session.playbackState,
      currentTime: session.currentTime,
      timestamp: Date.now(),
    }

    this.broadcastToSession(sessionId, {
      type: "sync_state",
      payload: syncData,
    })

    console.log("同步設備狀態")
  }

  private async handleEmergencyStop(ws: any) {
    const sessionId = ws.sessionId || "default"

    const session = this.sessions.get(sessionId)
    if (!session) return

    session.playbackState = "stopped"
    session.currentVideo = undefined
    session.currentTime = 0

    this.broadcastToSession(sessionId, {
      type: "emergency_stop",
      payload: { timestamp: Date.now() },
    })

    console.log("緊急停止")
  }

  private async handleDeviceStatus(ws: any, payload: any) {
    const { status, batteryLevel, performance } = payload
    const sessionId = ws.sessionId || "default"

    if (!ws.deviceId) return

    const session = this.sessions.get(sessionId)
    if (!session) return

    const device = session.devices.get(ws.deviceId)
    if (device) {
      device.status = status
      device.lastPing = Date.now()
      if (batteryLevel !== undefined) {
        device.batteryLevel = batteryLevel
      }
    }

    // 廣播狀態到管理面板
    this.broadcastToSession(
      sessionId,
      {
        type: "device_status_update",
        payload: {
          deviceId: ws.deviceId,
          status,
          batteryLevel,
          performance,
          timestamp: Date.now(),
        },
      },
      ws.deviceId,
    )
  }

  private handleDisconnection(ws: any) {
    if (ws.sessionId && ws.deviceId) {
      const session = this.sessions.get(ws.sessionId)
      if (session) {
        session.devices.delete(ws.deviceId)

        // 通知其他設備
        this.broadcastToSession(ws.sessionId, {
          type: "device_left",
          payload: { deviceId: ws.deviceId },
        })

        // 清理空會話
        if (session.devices.size === 0) {
          this.sessions.delete(ws.sessionId)
        }
      }
    }
    console.log("設備斷開連接")
  }

  private broadcastToSession(sessionId: string, message: any, excludeDeviceId?: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return

    session.devices.forEach((device, deviceId) => {
      if (excludeDeviceId && deviceId === excludeDeviceId) return

      if (device.ws.readyState === device.ws.OPEN) {
        try {
          device.ws.send(JSON.stringify(message))
        } catch (error) {
          console.error(`發送消息到設備 ${deviceId} 失敗:`, error)
        }
      }
    })
  }

  public start() {
    this.server.listen(this.port, () => {
      console.log(`VR WebSocket服務器運行在端口 ${this.port}`)
    })
  }

  public getConnectedDevices(sessionId = "default") {
    const session = this.sessions.get(sessionId)
    if (!session) return []

    return Array.from(session.devices.values()).map((device) => ({
      id: device.id,
      name: device.name,
      type: device.type,
      status: device.status,
      lastPing: device.lastPing,
      batteryLevel: device.batteryLevel,
      capabilities: device.capabilities,
    }))
  }

  public getAllSessions() {
    return Array.from(this.sessions.keys())
  }

  public getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId)
    if (!session) return null

    return {
      sessionId,
      deviceCount: session.devices.size,
      currentVideo: session.currentVideo,
      playbackState: session.playbackState,
      currentTime: session.currentTime,
    }
  }
}

export default VRWebSocketServer
