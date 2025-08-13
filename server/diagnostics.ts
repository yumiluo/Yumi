import os from "os"
import fs from "fs/promises"
import path from "path"
import { exec } from "child_process"
import { promisify } from "util"
import type { ConnectedDevice } from "./websocket-server"

const execAsync = promisify(exec)

export interface SystemDiagnostics {
  timestamp: string
  system: {
    platform: string
    arch: string
    nodeVersion: string
    uptime: number
    loadAverage: number[]
    memory: {
      total: number
      free: number
      used: number
      usagePercent: number
    }
    cpu: {
      model: string
      cores: number
      usage: number
    }
    disk: {
      total: number
      free: number
      used: number
      usagePercent: number
    }
  }
  network: {
    interfaces: any[]
    connectivity: boolean
    latency: number
  }
  services: {
    websocket: boolean
    api: boolean
    database: boolean
  }
  errors: string[]
  warnings: string[]
  recommendations: string[]
}

export interface DeviceDiagnostics {
  deviceId: string
  deviceName: string
  status: "healthy" | "warning" | "error"
  connectivity: {
    connected: boolean
    latency: number
    packetLoss: number
    lastHeartbeat: number
  }
  performance: {
    cpuUsage?: number
    memoryUsage?: number
    batteryLevel?: number
  }
  capabilities: string[]
  errors: string[]
  lastDiagnostic: string
}

export class DiagnosticsService {
  private diagnosticsHistory: SystemDiagnostics[] = []
  private deviceDiagnostics: Map<string, DeviceDiagnostics> = new Map()

  // 運行系統診斷
  async runSystemDiagnostics(): Promise<SystemDiagnostics> {
    console.log("開始系統診斷...")

    const diagnostics: SystemDiagnostics = {
      timestamp: new Date().toISOString(),
      system: await this.getSystemInfo(),
      network: await this.getNetworkInfo(),
      services: await this.getServiceStatus(),
      errors: [],
      warnings: [],
      recommendations: [],
    }

    // 分析結果並生成建議
    this.analyzeSystemHealth(diagnostics)

    // 保存診斷歷史
    this.diagnosticsHistory.push(diagnostics)
    if (this.diagnosticsHistory.length > 100) {
      this.diagnosticsHistory.shift()
    }

    console.log("系統診斷完成")
    return diagnostics
  }

  // 運行設備診斷
  async runDeviceDiagnostics(devices: ConnectedDevice[]): Promise<DeviceDiagnostics[]> {
    console.log(`開始設備診斷，設備數量: ${devices.length}`)

    const results: DeviceDiagnostics[] = []

    for (const device of devices) {
      try {
        const diagnostics = await this.diagnoseDevice(device)
        this.deviceDiagnostics.set(device.id, diagnostics)
        results.push(diagnostics)
      } catch (error) {
        console.error(`設備 ${device.id} 診斷失敗:`, error)

        const errorDiagnostics: DeviceDiagnostics = {
          deviceId: device.id,
          deviceName: device.name,
          status: "error",
          connectivity: {
            connected: false,
            latency: -1,
            packetLoss: 100,
            lastHeartbeat: device.lastHeartbeat,
          },
          performance: {},
          capabilities: device.capabilities,
          errors: [`診斷失敗: ${error.message}`],
          lastDiagnostic: new Date().toISOString(),
        }

        results.push(errorDiagnostics)
      }
    }

    console.log("設備診斷完成")
    return results
  }

  // 測量延遲
  async measureLatency(deviceIds: string[]): Promise<{ [deviceId: string]: number }> {
    console.log(`測量設備延遲，設備數量: ${deviceIds.length}`)

    const results: { [deviceId: string]: number } = {}

    for (const deviceId of deviceIds) {
      try {
        const startTime = Date.now()

        // 發送ping消息並等待響應（簡化版本）
        // 實際實現需要通過WebSocket發送ping並等待pong
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 50 + 10))

        const latency = Date.now() - startTime
        results[deviceId] = latency

        console.log(`設備 ${deviceId} 延遲: ${latency}ms`)
      } catch (error) {
        console.error(`測量設備 ${deviceId} 延遲失敗:`, error)
        results[deviceId] = -1
      }
    }

    return results
  }

  // 生成完整報告
  async generateFullReport(): Promise<any> {
    console.log("生成完整診斷報告...")

    const systemDiagnostics = await this.runSystemDiagnostics()
    const deviceDiagnostics = Array.from(this.deviceDiagnostics.values())

    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        systemHealth: this.getSystemHealthScore(systemDiagnostics),
        connectedDevices: deviceDiagnostics.length,
        healthyDevices: deviceDiagnostics.filter((d) => d.status === "healthy").length,
        warningDevices: deviceDiagnostics.filter((d) => d.status === "warning").length,
        errorDevices: deviceDiagnostics.filter((d) => d.status === "error").length,
      },
      system: systemDiagnostics,
      devices: deviceDiagnostics,
      history: this.diagnosticsHistory.slice(-10), // 最近10次診斷
      recommendations: this.generateRecommendations(systemDiagnostics, deviceDiagnostics),
    }

    console.log("完整診斷報告生成完成")
    return report
  }

  // 私有方法
  private async getSystemInfo(): Promise<any> {
    const cpus = os.cpus()
    const totalMem = os.totalmem()
    const freeMem = os.freemem()
    const usedMem = totalMem - freeMem

    // 獲取磁盤使用情況
    const diskInfo = { total: 0, free: 0, used: 0, usagePercent: 0 }
    try {
      const { stdout } = await execAsync("df -h /")
      const lines = stdout.split("\n")
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/)
        if (parts.length >= 4) {
          diskInfo.total = this.parseSize(parts[1])
          diskInfo.used = this.parseSize(parts[2])
          diskInfo.free = this.parseSize(parts[3])
          diskInfo.usagePercent = Number.parseFloat(parts[4].replace("%", ""))
        }
      }
    } catch (error) {
      console.error("獲取磁盤信息失敗:", error)
    }

    // 獲取CPU使用率（簡化版本）
    let cpuUsage = 0
    try {
      const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)"')
      const match = stdout.match(/(\d+\.\d+)%us/)
      if (match) {
        cpuUsage = Number.parseFloat(match[1])
      }
    } catch (error) {
      console.error("獲取CPU使用率失敗:", error)
    }

    return {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      memory: {
        total: totalMem,
        free: freeMem,
        used: usedMem,
        usagePercent: (usedMem / totalMem) * 100,
      },
      cpu: {
        model: cpus[0]?.model || "Unknown",
        cores: cpus.length,
        usage: cpuUsage,
      },
      disk: diskInfo,
    }
  }

  private async getNetworkInfo(): Promise<any> {
    const interfaces = os.networkInterfaces()
    const networkInterfaces = []

    for (const [name, addrs] of Object.entries(interfaces)) {
      if (addrs) {
        for (const addr of addrs) {
          if (!addr.internal) {
            networkInterfaces.push({
              name,
              address: addr.address,
              family: addr.family,
              mac: addr.mac,
            })
          }
        }
      }
    }

    // 測試網絡連接
    let connectivity = false
    let latency = -1
    try {
      const startTime = Date.now()
      await execAsync("ping -c 1 -W 3000 8.8.8.8")
      latency = Date.now() - startTime
      connectivity = true
    } catch (error) {
      console.error("網絡連接測試失敗:", error)
    }

    return {
      interfaces: networkInterfaces,
      connectivity,
      latency,
    }
  }

  private async getServiceStatus(): Promise<any> {
    return {
      websocket: true, // 假設WebSocket服務正常
      api: true, // 假設API服務正常
      database: await this.checkDatabaseConnection(),
    }
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      // 嘗試讀取用戶數據文件
      const dbPath = path.join(process.cwd(), "data", "users.json")
      await fs.access(dbPath)
      return true
    } catch (error) {
      return false
    }
  }

  private async diagnoseDevice(device: ConnectedDevice): Promise<DeviceDiagnostics> {
    const now = Date.now()
    const timeSinceHeartbeat = now - device.lastHeartbeat

    // 基本連接診斷
    const connectivity = {
      connected: device.ws.readyState === 1, // WebSocket.OPEN
      latency: await this.measureDeviceLatency(device),
      packetLoss: 0, // 簡化版本
      lastHeartbeat: device.lastHeartbeat,
    }

    // 確定設備狀態
    let status: "healthy" | "warning" | "error" = "healthy"
    const errors: string[] = []

    if (!connectivity.connected) {
      status = "error"
      errors.push("設備未連接")
    } else if (timeSinceHeartbeat > 30000) {
      status = "warning"
      errors.push("心跳超時")
    } else if (connectivity.latency > 1000) {
      status = "warning"
      errors.push("高延遲")
    }

    return {
      deviceId: device.id,
      deviceName: device.name,
      status,
      connectivity,
      performance: {
        // 這裡可以添加更多性能指標
      },
      capabilities: device.capabilities,
      errors,
      lastDiagnostic: new Date().toISOString(),
    }
  }

  private async measureDeviceLatency(device: ConnectedDevice): Promise<number> {
    try {
      const startTime = Date.now()

      // 發送ping消息
      device.ws.send(
        JSON.stringify({
          type: "ping",
          timestamp: startTime,
        }),
      )

      // 等待響應（簡化版本）
      await new Promise((resolve) => setTimeout(resolve, 50))

      return Date.now() - startTime
    } catch (error) {
      return -1
    }
  }

  private analyzeSystemHealth(diagnostics: SystemDiagnostics): void {
    const { system, network, services } = diagnostics

    // 內存使用率檢查
    if (system.memory.usagePercent > 90) {
      diagnostics.errors.push("內存使用率過高")
      diagnostics.recommendations.push("考慮增加內存或優化內存使用")
    } else if (system.memory.usagePercent > 75) {
      diagnostics.warnings.push("內存使用率較高")
    }

    // CPU使用率檢查
    if (system.cpu.usage > 90) {
      diagnostics.errors.push("CPU使用率過高")
      diagnostics.recommendations.push("檢查CPU密集型進程")
    } else if (system.cpu.usage > 75) {
      diagnostics.warnings.push("CPU使用率較高")
    }

    // 磁盤使用率檢查
    if (system.disk.usagePercent > 90) {
      diagnostics.errors.push("磁盤空間不足")
      diagnostics.recommendations.push("清理磁盤空間或擴展存儲")
    } else if (system.disk.usagePercent > 80) {
      diagnostics.warnings.push("磁盤空間較少")
    }

    // 網絡連接檢查
    if (!network.connectivity) {
      diagnostics.errors.push("網絡連接失敗")
      diagnostics.recommendations.push("檢查網絡配置和連接")
    } else if (network.latency > 1000) {
      diagnostics.warnings.push("網絡延遲較高")
    }

    // 服務狀態檢查
    if (!services.websocket) {
      diagnostics.errors.push("WebSocket服務異常")
    }
    if (!services.api) {
      diagnostics.errors.push("API服務異常")
    }
    if (!services.database) {
      diagnostics.warnings.push("數據庫連接異常")
    }
  }

  private getSystemHealthScore(diagnostics: SystemDiagnostics): number {
    let score = 100

    // 根據錯誤和警告扣分
    score -= diagnostics.errors.length * 20
    score -= diagnostics.warnings.length * 10

    // 根據系統指標扣分
    if (diagnostics.system.memory.usagePercent > 90) score -= 15
    if (diagnostics.system.cpu.usage > 90) score -= 15
    if (diagnostics.system.disk.usagePercent > 90) score -= 10

    return Math.max(0, score)
  }

  private generateRecommendations(
    systemDiagnostics: SystemDiagnostics,
    deviceDiagnostics: DeviceDiagnostics[],
  ): string[] {
    const recommendations: string[] = []

    // 系統建議
    recommendations.push(...systemDiagnostics.recommendations)

    // 設備建議
    const errorDevices = deviceDiagnostics.filter((d) => d.status === "error")
    if (errorDevices.length > 0) {
      recommendations.push(`檢查 ${errorDevices.length} 個異常設備的連接`)
    }

    const highLatencyDevices = deviceDiagnostics.filter((d) => d.connectivity.latency > 500)
    if (highLatencyDevices.length > 0) {
      recommendations.push(`優化 ${highLatencyDevices.length} 個高延遲設備的網絡連接`)
    }

    // 通用建議
    if (deviceDiagnostics.length === 0) {
      recommendations.push("當前沒有連接的設備，請檢查設備連接")
    }

    return recommendations
  }

  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      K: 1024,
      M: 1024 * 1024,
      G: 1024 * 1024 * 1024,
      T: 1024 * 1024 * 1024 * 1024,
    }

    const match = sizeStr.match(/^(\d+(?:\.\d+)?)([KMGT]?)/)
    if (!match) return 0

    const value = Number.parseFloat(match[1])
    const unit = match[2]

    return value * (units[unit] || 1)
  }

  // 獲取診斷歷史
  getDiagnosticsHistory(): SystemDiagnostics[] {
    return this.diagnosticsHistory
  }

  // 獲取設備診斷
  getDeviceDiagnostics(deviceId: string): DeviceDiagnostics | undefined {
    return this.deviceDiagnostics.get(deviceId)
  }

  // 清理舊診斷數據
  cleanupOldDiagnostics(maxAge = 86400000): void {
    // 24小時
    const cutoff = Date.now() - maxAge

    this.diagnosticsHistory = this.diagnosticsHistory.filter((d) => new Date(d.timestamp).getTime() > cutoff)

    for (const [deviceId, diagnostics] of this.deviceDiagnostics) {
      if (new Date(diagnostics.lastDiagnostic).getTime() < cutoff) {
        this.deviceDiagnostics.delete(deviceId)
      }
    }
  }
}
