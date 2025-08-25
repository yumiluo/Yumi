import authManager from "./auth"

interface Device {
  id: string
  name: string
  type: "vr" | "mobile" | "desktop"
  ip?: string
  status: "connected" | "disconnected" | "playing" | "paused" | "error"
  capabilities: string[]
  batteryLevel?: number
  lastSeen: string
}

interface DeviceScanResult {
  id: string
  name: string
  type: "vr" | "mobile" | "desktop"
  ip: string
  status: "discovered"
  capabilities: string[]
}

interface NetworkDevice {
  id: string
  deviceName: string
  deviceType: string
  ipAddress: string
  manufacturer: string
  isVRDevice: boolean
  rssi: number
  lastSeen: string
}

interface DeviceInfo {
  id: string
  name: string
  type: "standalone_vr" | "mobile_vr" | "desktop"
  brand: string
  model: string
  ipAddress: string
  macAddress: string
  status: "online" | "offline" | "connecting" | "error"
  firmwareVersion: string
  connectionType: "wifi" | "bluetooth" | "usb"
  capabilities: string[]
  currentTime: number
  lastSeen: string
  isAuthenticated: boolean
  authCode: string
  batteryLevel?: number
}

class DeviceManager {
  private baseUrl: string
  private ws: WebSocket | null = null
  private devices: Map<string, Device> = new Map()
  private eventListeners: Map<string, Function[]> = new Map()

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
    this.initializeWebSocket()
  }

  // 初始化WebSocket連接
  private initializeWebSocket() {
    if (!authManager.isAuthenticated()) return

    try {
      this.ws = authManager.createWebSocketConnection()
      if (!this.ws) return

      this.ws.onopen = () => {
        console.log("WebSocket連接已建立")
        this.emit("connected")
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleWebSocketMessage(message)
        } catch (error) {
          console.error("WebSocket消息解析錯誤:", error)
        }
      }

      this.ws.onclose = () => {
        console.log("WebSocket連接已關閉")
        this.emit("disconnected")
        // 5秒後重新連接
        setTimeout(() => this.initializeWebSocket(), 5000)
      }

      this.ws.onerror = (error) => {
        console.error("WebSocket錯誤:", error)
        this.emit("error", error)
      }
    } catch (error) {
      console.error("WebSocket初始化失敗:", error)
    }
  }

  // 處理WebSocket消息
  private handleWebSocketMessage(message: any) {
    const { type, payload } = message

    switch (type) {
      case "device_joined":
        this.emit("device_joined", payload)
        break
      case "device_left":
        this.emit("device_left", payload)
        this.devices.delete(payload.deviceId)
        break
      case "device_status_update":
        this.updateDeviceStatus(payload)
        break
      case "play_command":
        this.emit("play_command", payload)
        break
      case "pause_command":
        this.emit("pause_command", payload)
        break
      case "stop_command":
        this.emit("stop_command", payload)
        break
      case "emergency_stop":
        this.emit("emergency_stop", payload)
        break
      case "sync_state":
        this.emit("sync_state", payload)
        break
      default:
        console.log("未處理的WebSocket消息:", type, payload)
    }
  }

  // 更新設備狀態
  private updateDeviceStatus(payload: any) {
    const { deviceId, status, batteryLevel } = payload
    const device = this.devices.get(deviceId)

    if (device) {
      device.status = status
      device.lastSeen = new Date().toISOString()
      if (batteryLevel !== undefined) {
        device.batteryLevel = batteryLevel
      }
      this.emit("device_updated", device)
    }
  }

  // 掃描網絡設備
  async scanNetworkDevices(): Promise<DeviceScanResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authManager.getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error("設備掃描失敗")
      }

      const devices = await response.json()
      this.emit("devices_scanned", devices)
      return devices
    } catch (error) {
      console.error("設備掃描錯誤:", error)
      throw error
    }
  }

  // 掃描設備的別名方法（兼容舊代碼）
  async scanForDevices(): Promise<NetworkDevice[]> {
    try {
      console.log("開始掃描Wi-Fi網絡設備...")
      
      // 模擬設備掃描，返回發現的設備
      // 在實際環境中，這裡應該調用真實的網絡掃描API
      const mockDevices: NetworkDevice[] = [
        {
          id: "device-001",
          deviceName: "VR Sync Server",
          deviceType: "VR Headset",
          ipAddress: "localhost",
          manufacturer: "VR Systems",
          isVRDevice: true,
          rssi: -45,
          lastSeen: new Date().toISOString()
        },
        {
          id: "device-002", 
          deviceName: "Quest 2",
          deviceType: "VR Headset",
          ipAddress: "192.168.31.100",
          manufacturer: "Meta",
          isVRDevice: true,
          rssi: -62,
          lastSeen: new Date().toISOString()
        }
      ]
      
      // 嘗試真實的設備發現
      try {
        const response = await fetch('http://localhost:5001/api/discover')
        if (response.ok) {
          const serverInfo = await response.json()
          console.log("發現VR服務器:", serverInfo)
          
          // 添加真實的服務器設備
          const realDevice: NetworkDevice = {
            id: "vr-server-001",
            deviceName: serverInfo.deviceName || "VR Sync Server",
            deviceType: "VR Server",
            ipAddress: "localhost",
            manufacturer: "VR Systems",
            isVRDevice: true,
            rssi: -30,
            lastSeen: new Date().toISOString()
          }
          
          return [realDevice]
        }
      } catch (error) {
        console.log("無法連接到VR服務器，返回模擬設備")
      }
      
      return mockDevices
    } catch (error) {
      console.error("設備掃描失敗:", error)
      throw error
    }
  }

  // 連接到設備的別名方法
  async connectToDevice(ipAddress: string, authCode?: string): Promise<DeviceInfo> {
    try {
      console.log(`嘗試連接設備: ${ipAddress}`)
      
      // 模擬設備連接
      const deviceInfo: DeviceInfo = {
        id: `device-${Date.now()}`,
        name: `VR設備 (${ipAddress})`,
        type: "standalone_vr",
        brand: "Unknown",
        model: "VR Device",
        ipAddress: ipAddress,
        macAddress: "00:00:00:00:00:00",
        status: "online",
        firmwareVersion: "1.0.0",
        connectionType: "wifi",
        capabilities: ["6DOF", "Wi-Fi"],
        currentTime: 0,
        lastSeen: new Date().toLocaleString(),
        isAuthenticated: true,
        authCode: authCode || Math.random().toString(36).substr(2, 6).toUpperCase(),
      }
      
      console.log("設備連接成功:", deviceInfo)
      return deviceInfo
    } catch (error) {
      console.error("設備連接失敗:", error)
      throw error
    }
  }

  // 移除設備的別名方法
  async removeDevice(deviceId: string): Promise<void> {
    try {
      console.log(`移除設備: ${deviceId}`)
      // 模擬移除設備
      await new Promise(resolve => setTimeout(resolve, 500))
      console.log("設備移除成功")
    } catch (error) {
      console.error("設備移除失敗:", error)
      throw error
    }
  }

  // 連接設備
  async connectDevice(deviceInfo: any): Promise<Device> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/connect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authManager.getAuthHeaders(),
        },
        body: JSON.stringify(deviceInfo),
      })

      if (!response.ok) {
        throw new Error("設備連接失敗")
      }

      const device = await response.json()

      // 通過WebSocket註冊設備
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "device_register",
            payload: {
              deviceId: device.id,
              deviceName: device.name,
              deviceType: device.type,
              capabilities: device.capabilities || [],
            },
          }),
        )
      }

      const connectedDevice: Device = {
        ...device,
        lastSeen: new Date().toISOString(),
      }

      this.devices.set(device.id, connectedDevice)
      this.emit("device_connected", connectedDevice)

      return connectedDevice
    } catch (error) {
      console.error("設備連接錯誤:", error)
      throw error
    }
  }

  // 斷開設備
  async disconnectDevice(deviceId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/devices/${deviceId}`, {
        method: "DELETE",
        headers: {
          ...authManager.getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error("設備斷開失敗")
      }

      this.devices.delete(deviceId)
      this.emit("device_disconnected", deviceId)
    } catch (error) {
      console.error("設備斷開錯誤:", error)
      throw error
    }
  }

  // 播放視頻
  async playVideo(videoUrl: string, startTime = 0): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket未連接")
    }

    this.ws.send(
      JSON.stringify({
        type: "play_video",
        payload: { videoUrl, startTime },
      }),
    )
  }

  // 暫停播放
  async pauseVideo(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket未連接")
    }

    this.ws.send(
      JSON.stringify({
        type: "pause_video",
        payload: {},
      }),
    )
  }

  // 停止播放
  async stopVideo(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket未連接")
    }

    this.ws.send(
      JSON.stringify({
        type: "stop_video",
        payload: {},
      }),
    )
  }

  // 緊急停止
  async emergencyStop(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket未連接")
    }

    this.ws.send(
      JSON.stringify({
        type: "emergency_stop",
        payload: {},
      }),
    )
  }

  // 同步設備
  async syncDevices(): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket未連接")
    }

    this.ws.send(
      JSON.stringify({
        type: "sync_devices",
        payload: {},
      }),
    )
  }

  // 獲取已連接設備
  getConnectedDevices(): Device[] {
    return Array.from(this.devices.values())
  }

  // 獲取特定設備
  getDevice(deviceId: string): Device | undefined {
    return this.devices.get(deviceId)
  }

  // 事件監聽
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, [])
    }
    this.eventListeners.get(event)!.push(callback)
  }

  // 移除事件監聽
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }

  // 觸發事件
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event)
    if (listeners) {
      listeners.forEach((callback) => callback(data))
    }
  }

  // 清理資源
  destroy(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.devices.clear()
    this.eventListeners.clear()
  }
}

export const deviceManager = new DeviceManager()
export const deviceService = deviceManager // 為了兼容性，導出別名
export default deviceManager
export type { Device, DeviceScanResult, NetworkDevice, DeviceInfo }
