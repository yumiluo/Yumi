import { wsServer } from "../server/websocket-server"
import { DeviceDiscoveryService } from "../server/device-discovery"
import { DiagnosticsService } from "../server/diagnostics"

export interface EnhancedDevice {
  id: string
  name: string
  type: "vr" | "mobile" | "desktop"
  ip: string
  port?: number
  status: "connected" | "disconnected" | "playing" | "paused" | "error"
  capabilities: string[]
  metadata: any
  lastSeen: number
  diagnostics?: any
}

export class EnhancedDeviceManager {
  private deviceDiscovery: DeviceDiscoveryService
  private diagnostics: DiagnosticsService
  private devices: Map<string, EnhancedDevice> = new Map()
  private scanInProgress = false

  constructor() {
    this.deviceDiscovery = new DeviceDiscoveryService()
    this.diagnostics = new DiagnosticsService()

    // 定期清理過期設備
    setInterval(() => {
      this.cleanupExpiredDevices()
    }, 60000) // 每分鐘清理一次
  }

  // 掃描網絡設備
  async scanNetworkDevices(): Promise<EnhancedDevice[]> {
    if (this.scanInProgress) {
      throw new Error("掃描正在進行中，請稍後再試")
    }

    this.scanInProgress = true
    console.log("開始掃描網絡設備...")

    try {
      // 使用多種方法掃描設備
      const discoveredDevices = await this.deviceDiscovery.scanDevices("all")

      const enhancedDevices: EnhancedDevice[] = []

      for (const device of discoveredDevices) {
        const enhancedDevice: EnhancedDevice = {
          id: device.id,
          name: device.name,
          type: device.type,
          ip: device.ip,
          port: device.port,
          status: "disconnected",
          capabilities: device.capabilities,
          metadata: device.metadata,
          lastSeen: device.lastSeen,
        }

        // 嘗試連接測試
        const isConnectable = await this.testDeviceConnection(device.ip, device.port || 8080)
        if (isConnectable) {
          enhancedDevice.status = "connected"
        }

        enhancedDevices.push(enhancedDevice)
        this.devices.set(device.id, enhancedDevice)
      }

      console.log(`網絡掃描完成，發現 ${enhancedDevices.length} 個設備`)
      return enhancedDevices
    } finally {
      this.scanInProgress = false
    }
  }

  // 手動添加設備
  async addDeviceManually(ip: string, port = 8080, deviceInfo?: any): Promise<boolean> {
    try {
      console.log(`手動添加設備: ${ip}:${port}`)

      // 驗證IP格式
      if (!this.isValidIP(ip)) {
        throw new Error("無效的IP地址格式")
      }

      // 驗證端口範圍
      if (port < 1 || port > 65535) {
        throw new Error("端口號必須在1-65535之間")
      }

      // 測試連接
      const isConnectable = await this.testDeviceConnection(ip, port)
      if (!isConnectable) {
        throw new Error(`無法連接到設備 ${ip}:${port}`)
      }

      // 嘗試連接設備
      const success = await this.deviceDiscovery.connectToDevice(ip, port, deviceInfo)

      if (success) {
        // 添加到設備列表
        const deviceId = `manual_${ip.replace(/\./g, "_")}_${port}`
        const device: EnhancedDevice = {
          id: deviceId,
          name: deviceInfo?.name || `設備_${ip}`,
          type: deviceInfo?.type || "unknown",
          ip,
          port,
          status: "connected",
          capabilities: deviceInfo?.capabilities || [],
          metadata: {
            ...deviceInfo?.metadata,
            addedManually: true,
            addedAt: new Date().toISOString(),
          },
          lastSeen: Date.now(),
        }

        this.devices.set(deviceId, device)
        console.log(`設備手動添加成功: ${device.name}`)
        return true
      }

      return false
    } catch (error) {
      console.error("手動添加設備失敗:", error)
      throw error
    }
  }

  // 連接到設備
  async connectToDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId)
      if (!device) {
        throw new Error("設備不存在")
      }

      console.log(`連接到設備: ${device.name} (${device.ip}:${device.port})`)

      const success = await this.deviceDiscovery.connectToDevice(device.ip, device.port || 8080, {
        name: device.name,
        type: device.type,
        capabilities: device.capabilities,
        metadata: device.metadata,
      })

      if (success) {
        device.status = "connected"
        device.lastSeen = Date.now()
        console.log(`設備連接成功: ${device.name}`)
      }

      return success
    } catch (error) {
      console.error(`連接設備失敗 ${deviceId}:`, error)
      throw error
    }
  }

  // 斷開設備連接
  async disconnectDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId)
      if (!device) {
        throw new Error("設備不存在")
      }

      console.log(`斷開設備連接: ${device.name}`)

      // 通過WebSocket發送斷開命令
      const success = wsServer.sendToDevice(deviceId, {
        type: "disconnect",
        timestamp: Date.now(),
      })

      if (success) {
        device.status = "disconnected"
        console.log(`設備已斷開: ${device.name}`)
      }

      return success
    } catch (error) {
      console.error(`斷開設備失敗 ${deviceId}:`, error)
      throw error
    }
  }

  // 移除設備
  async removeDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.devices.get(deviceId)
      if (!device) {
        return false
      }

      console.log(`移除設備: ${device.name}`)

      // 先斷開連接
      if (device.status === "connected") {
        await this.disconnectDevice(deviceId)
      }

      // 從設備列表中移除
      this.devices.delete(deviceId)
      console.log(`設備已移除: ${device.name}`)

      return true
    } catch (error) {
      console.error(`移除設備失敗 ${deviceId}:`, error)
      throw error
    }
  }

  // 掃描藍牙設備
  async scanBluetoothDevices(): Promise<EnhancedDevice[]> {
    try {
      console.log("開始掃描藍牙設備...")

      // 檢查瀏覽器是否支持Web Bluetooth
      if (!navigator.bluetooth) {
        throw new Error("瀏覽器不支持Web Bluetooth API")
      }

      const devices: EnhancedDevice[] = []

      try {
        // 請求藍牙設備
        const device = await navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ["battery_service", "device_information"],
        })

        if (device) {
          const enhancedDevice: EnhancedDevice = {
            id: `bluetooth_${device.id}`,
            name: device.name || "未知藍牙設備",
            type: "mobile", // 假設藍牙設備是移動設備
            ip: "", // 藍牙設備沒有IP
            status: "disconnected",
            capabilities: ["bluetooth"],
            metadata: {
              bluetoothId: device.id,
              discoveryMethod: "bluetooth",
            },
            lastSeen: Date.now(),
          }

          devices.push(enhancedDevice)
          this.devices.set(enhancedDevice.id, enhancedDevice)
        }
      } catch (error) {
        console.error("藍牙設備掃描失敗:", error)
        throw new Error("藍牙設備掃描失敗，請確保已授權藍牙權限")
      }

      console.log(`藍牙掃描完成，發現 ${devices.length} 個設備`)
      return devices
    } catch (error) {
      console.error("藍牙掃描失敗:", error)
      throw error
    }
  }

  // 運行設備診斷
  async runDeviceDiagnostics(): Promise<any> {
    try {
      console.log("開始設備診斷...")

      const connectedDevices = wsServer.getConnectedDevices()
      const diagnosticsResults = await this.diagnostics.runDeviceDiagnostics(connectedDevices)

      // 更新設備診斷信息
      for (const result of diagnosticsResults) {
        const device = this.devices.get(result.deviceId)
        if (device) {
          device.diagnostics = result

          // 根據診斷結果更新設備狀態
          if (result.status === "error") {
            device.status = "error"
          }
        }
      }

      console.log("設備診斷完成")
      return diagnosticsResults
    } catch (error) {
      console.error("設備診斷失敗:", error)
      throw error
    }
  }

  // 測量設備延遲
  async measureDeviceLatency(deviceIds: string[]): Promise<{ [deviceId: string]: number }> {
    try {
      console.log(`測量設備延遲，設備數量: ${deviceIds.length}`)

      const results = await this.diagnostics.measureLatency(deviceIds)

      // 更新設備延遲信息
      for (const [deviceId, latency] of Object.entries(results)) {
        const device = this.devices.get(deviceId)
        if (device && device.diagnostics) {
          device.diagnostics.connectivity.latency = latency
        }
      }

      return results
    } catch (error) {
      console.error("測量設備延遲失敗:", error)
      throw error
    }
  }

  // 獲取所有設備
  getAllDevices(): EnhancedDevice[] {
    return Array.from(this.devices.values())
  }

  // 獲取連接的設備
  getConnectedDevices(): EnhancedDevice[] {
    return Array.from(this.devices.values()).filter(
      (device) => device.status === "connected" || device.status === "playing" || device.status === "paused",
    )
  }

  // 獲取特定設備
  getDevice(deviceId: string): EnhancedDevice | undefined {
    return this.devices.get(deviceId)
  }

  // 更新設備信息
  updateDevice(deviceId: string, updates: Partial<EnhancedDevice>): boolean {
    const device = this.devices.get(deviceId)
    if (!device) {
      return false
    }

    // 不允許更新某些字段
    const { id, ...allowedUpdates } = updates

    Object.assign(device, allowedUpdates)
    device.lastSeen = Date.now()

    return true
  }

  // 私有輔助方法
  private async testDeviceConnection(ip: string, port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://${ip}:${port}/health`, {
        method: "GET",
        timeout: 5000,
      })
      return response.ok
    } catch (error) {
      // 如果HTTP失敗，嘗試WebSocket連接測試
      try {
        const ws = new WebSocket(`ws://${ip}:${port}`)

        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            ws.close()
            resolve(false)
          }, 3000)

          ws.onopen = () => {
            clearTimeout(timeout)
            ws.close()
            resolve(true)
          }

          ws.onerror = () => {
            clearTimeout(timeout)
            resolve(false)
          }
        })
      } catch (wsError) {
        return false
      }
    }
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
    return ipRegex.test(ip)
  }

  private cleanupExpiredDevices(): void {
    const now = Date.now()
    const maxAge = 300000 // 5分鐘

    for (const [deviceId, device] of this.devices) {
      if (now - device.lastSeen > maxAge && device.status === "disconnected") {
        console.log(`清理過期設備: ${device.name}`)
        this.devices.delete(deviceId)
      }
    }
  }

  // 獲取設備統計
  getDeviceStats(): any {
    const devices = this.getAllDevices()

    return {
      total: devices.length,
      connected: devices.filter((d) => d.status === "connected").length,
      playing: devices.filter((d) => d.status === "playing").length,
      paused: devices.filter((d) => d.status === "paused").length,
      error: devices.filter((d) => d.status === "error").length,
      byType: {
        vr: devices.filter((d) => d.type === "vr").length,
        mobile: devices.filter((d) => d.type === "mobile").length,
        desktop: devices.filter((d) => d.type === "desktop").length,
      },
    }
  }
}

// 創建全局設備管理器實例
export const enhancedDeviceManager = new EnhancedDeviceManager()
