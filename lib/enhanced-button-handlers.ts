import { enhancedDeviceManager } from "./enhanced-device-manager"
import { wsServer } from "../server/websocket-server"
import { VideoManagementService } from "../server/video-management"
import { DiagnosticsService } from "../server/diagnostics"

const videoService = new VideoManagementService()
const diagnostics = new DiagnosticsService()

export class EnhancedButtonHandlers {
  // 設備管理按鈕處理器
  static async handleScanNetworkDevices(): Promise<any> {
    try {
      console.log("執行網絡設備掃描...")
      const devices = await enhancedDeviceManager.scanNetworkDevices()

      return {
        success: true,
        message: `掃描完成，發現 ${devices.length} 個設備`,
        data: devices,
      }
    } catch (error: any) {
      console.error("網絡設備掃描失敗:", error)
      return {
        success: false,
        message: error.message || "網絡設備掃描失敗",
        data: [],
      }
    }
  }

  static async handleAddDeviceManually(ip: string, port: number, deviceInfo?: any): Promise<any> {
    try {
      console.log(`執行手動添加設備: ${ip}:${port}`)
      const success = await enhancedDeviceManager.addDeviceManually(ip, port, deviceInfo)

      if (success) {
        return {
          success: true,
          message: `設備 ${ip}:${port} 添加成功`,
        }
      } else {
        return {
          success: false,
          message: `設備 ${ip}:${port} 添加失敗`,
        }
      }
    } catch (error: any) {
      console.error("手動添加設備失敗:", error)
      return {
        success: false,
        message: error.message || "手動添加設備失敗",
      }
    }
  }

  static async handleScanBluetoothDevices(): Promise<any> {
    try {
      console.log("執行藍牙設備掃描...")
      const devices = await enhancedDeviceManager.scanBluetoothDevices()

      return {
        success: true,
        message: `藍牙掃描完成，發現 ${devices.length} 個設備`,
        data: devices,
      }
    } catch (error: any) {
      console.error("藍牙設備掃描失敗:", error)
      return {
        success: false,
        message: error.message || "藍牙設備掃描失敗",
        data: [],
      }
    }
  }

  static async handleConnectDevice(deviceId: string): Promise<any> {
    try {
      console.log(`執行設備連接: ${deviceId}`)
      const success = await enhancedDeviceManager.connectToDevice(deviceId)

      if (success) {
        return {
          success: true,
          message: "設備連接成功",
        }
      } else {
        return {
          success: false,
          message: "設備連接失敗",
        }
      }
    } catch (error: any) {
      console.error("設備連接失敗:", error)
      return {
        success: false,
        message: error.message || "設備連接失敗",
      }
    }
  }

  static async handleDisconnectDevice(deviceId: string): Promise<any> {
    try {
      console.log(`執行設備斷開: ${deviceId}`)
      const success = await enhancedDeviceManager.disconnectDevice(deviceId)

      if (success) {
        return {
          success: true,
          message: "設備已斷開連接",
        }
      } else {
        return {
          success: false,
          message: "設備斷開失敗",
        }
      }
    } catch (error: any) {
      console.error("設備斷開失敗:", error)
      return {
        success: false,
        message: error.message || "設備斷開失敗",
      }
    }
  }

  static async handleRemoveDevice(deviceId: string): Promise<any> {
    try {
      console.log(`執行設備移除: ${deviceId}`)
      const success = await enhancedDeviceManager.removeDevice(deviceId)

      if (success) {
        return {
          success: true,
          message: "設備已移除",
        }
      } else {
        return {
          success: false,
          message: "設備移除失敗",
        }
      }
    } catch (error: any) {
      console.error("設備移除失敗:", error)
      return {
        success: false,
        message: error.message || "設備移除失敗",
      }
    }
  }

  // 播放控制按鈕處理器
  static async handleGlobalPlay(videoId?: string, startTime?: number): Promise<any> {
    try {
      console.log(`執行全域播放: ${videoId}`)

      // 獲取視頻流URL
      let streamUrl = null
      if (videoId) {
        streamUrl = await videoService.getVideoStreamUrl(videoId)
        if (!streamUrl) {
          throw new Error("無法獲取視頻流URL")
        }
      }

      // 廣播播放命令
      wsServer.broadcastToAllDevices({
        type: "play",
        data: {
          videoId,
          streamUrl,
          startTime: startTime || 0,
          serverTime: Date.now(),
        },
        timestamp: Date.now(),
      })

      // 更新設備狀態
      const devices = enhancedDeviceManager.getConnectedDevices()
      for (const device of devices) {
        enhancedDeviceManager.updateDevice(device.id, { status: "playing" })
      }

      return {
        success: true,
        message: `播放命令已發送到 ${devices.length} 個設備`,
      }
    } catch (error: any) {
      console.error("全域播放失敗:", error)
      return {
        success: false,
        message: error.message || "全域播放失敗",
      }
    }
  }

  static async handleGlobalPause(): Promise<any> {
    try {
      console.log("執行全域暫停")

      wsServer.broadcastToAllDevices({
        type: "pause",
        timestamp: Date.now(),
      })

      // 更新設備狀態
      const devices = enhancedDeviceManager.getConnectedDevices()
      for (const device of devices) {
        if (device.status === "playing") {
          enhancedDeviceManager.updateDevice(device.id, { status: "paused" })
        }
      }

      return {
        success: true,
        message: `暫停命令已發送到 ${devices.length} 個設備`,
      }
    } catch (error: any) {
      console.error("全域暫停失敗:", error)
      return {
        success: false,
        message: error.message || "全域暫停失敗",
      }
    }
  }

  static async handleGlobalStop(): Promise<any> {
    try {
      console.log("執行全域停止")

      wsServer.broadcastToAllDevices({
        type: "stop",
        timestamp: Date.now(),
      })

      // 更新設備狀態
      const devices = enhancedDeviceManager.getConnectedDevices()
      for (const device of devices) {
        enhancedDeviceManager.updateDevice(device.id, { status: "connected" })
      }

      return {
        success: true,
        message: `停止命令已發送到 ${devices.length} 個設備`,
      }
    } catch (error: any) {
      console.error("全域停止失敗:", error)
      return {
        success: false,
        message: error.message || "全域停止失敗",
      }
    }
  }

  static async handleEmergencyStop(): Promise<any> {
    try {
      console.log("執行緊急停止")

      wsServer.broadcastToAllDevices({
        type: "emergency_stop",
        priority: "high",
        timestamp: Date.now(),
      })

      // 立即更新所有設備狀態
      const devices = enhancedDeviceManager.getAllDevices()
      for (const device of devices) {
        enhancedDeviceManager.updateDevice(device.id, { status: "connected" })
      }

      return {
        success: true,
        message: `緊急停止命令已發送到所有設備`,
      }
    } catch (error: any) {
      console.error("緊急停止失敗:", error)
      return {
        success: false,
        message: error.message || "緊急停止失敗",
      }
    }
  }

  static async handleDeviceSync(): Promise<any> {
    try {
      console.log("執行設備同步")

      const serverTime = Date.now()

      wsServer.broadcastToAllDevices({
        type: "sync",
        data: {
          serverTime,
          syncId: `sync_${serverTime}`,
        },
        timestamp: serverTime,
      })

      const devices = enhancedDeviceManager.getConnectedDevices()

      return {
        success: true,
        message: `同步命令已發送到 ${devices.length} 個設備`,
      }
    } catch (error: any) {
      console.error("設備同步失敗:", error)
      return {
        success: false,
        message: error.message || "設備同步失敗",
      }
    }
  }

  // 視頻管理按鈕處理器
  static async handleAddYouTubeVideo(url: string, title?: string, category?: string): Promise<any> {
    try {
      console.log(`執行YouTube視頻添加: ${url}`)

      const video = await videoService.addYouTubeVideo(url, title, category)

      return {
        success: true,
        message: `YouTube視頻添加成功: ${video.title}`,
        data: video,
      }
    } catch (error: any) {
      console.error("YouTube視頻添加失敗:", error)
      return {
        success: false,
        message: error.message || "YouTube視頻添加失敗",
      }
    }
  }

  static async handleUploadLocalVideo(
    file: File,
    title?: string,
    category?: string,
    description?: string,
  ): Promise<any> {
    try {
      console.log(`執行本地視頻上傳: ${file.name}`)

      // 創建FormData
      const formData = new FormData()
      formData.append("video", file)
      if (title) formData.append("title", title)
      if (category) formData.append("category", category)
      if (description) formData.append("description", description)

      // 上傳到服務器
      const response = await fetch("/api/videos/upload", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (!response.ok) {
        throw new Error("視頻上傳失敗")
      }

      const video = await response.json()

      return {
        success: true,
        message: `本地視頻上傳成功: ${video.title}`,
        data: video,
      }
    } catch (error: any) {
      console.error("本地視頻上傳失敗:", error)
      return {
        success: false,
        message: error.message || "本地視頻上傳失敗",
      }
    }
  }

  static async handleDeleteVideo(videoId: string): Promise<any> {
    try {
      console.log(`執行視頻刪除: ${videoId}`)

      const success = await videoService.deleteVideo(videoId)

      if (success) {
        return {
          success: true,
          message: "視頻已刪除",
        }
      } else {
        return {
          success: false,
          message: "視頻刪除失敗",
        }
      }
    } catch (error: any) {
      console.error("視頻刪除失敗:", error)
      return {
        success: false,
        message: error.message || "視頻刪除失敗",
      }
    }
  }

  // 診斷工具按鈕處理器
  static async handleRunDiagnostics(): Promise<any> {
    try {
      console.log("執行系統診斷")

      const systemDiagnostics = await diagnostics.runSystemDiagnostics()
      const deviceDiagnostics = await enhancedDeviceManager.runDeviceDiagnostics()

      return {
        success: true,
        message: "系統診斷完成",
        data: {
          system: systemDiagnostics,
          devices: deviceDiagnostics,
        },
      }
    } catch (error: any) {
      console.error("系統診斷失敗:", error)
      return {
        success: false,
        message: error.message || "系統診斷失敗",
      }
    }
  }

  static async handleLatencyCalibration(): Promise<any> {
    try {
      console.log("執行延遲校準")

      const devices = enhancedDeviceManager.getConnectedDevices()
      const deviceIds = devices.map((d) => d.id)

      if (deviceIds.length === 0) {
        return {
          success: false,
          message: "沒有連接的設備可以校準",
        }
      }

      const latencyResults = await enhancedDeviceManager.measureDeviceLatency(deviceIds)

      // 計算平均延遲和建議的校準值
      const latencies = Object.values(latencyResults).filter((l) => l > 0)
      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length
      const maxLatency = Math.max(...latencies)

      // 發送校準命令
      wsServer.broadcastToAllDevices({
        type: "calibrate_latency",
        data: {
          averageLatency: avgLatency,
          maxLatency: maxLatency,
          deviceLatencies: latencyResults,
        },
        timestamp: Date.now(),
      })

      return {
        success: true,
        message: `延遲校準完成，平均延遲: ${avgLatency.toFixed(2)}ms`,
        data: {
          averageLatency: avgLatency,
          maxLatency: maxLatency,
          deviceLatencies: latencyResults,
        },
      }
    } catch (error: any) {
      console.error("延遲校準失敗:", error)
      return {
        success: false,
        message: error.message || "延遲校準失敗",
      }
    }
  }

  static async handleExportDiagnosticsReport(): Promise<any> {
    try {
      console.log("執行診斷報告匯出")

      const report = await diagnostics.generateFullReport()

      // 創建下載鏈接
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)

      // 觸發下載
      const a = document.createElement("a")
      a.href = url
      a.download = `diagnostics-report-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      return {
        success: true,
        message: "診斷報告已匯出",
      }
    } catch (error: any) {
      console.error("診斷報告匯出失敗:", error)
      return {
        success: false,
        message: error.message || "診斷報告匯出失敗",
      }
    }
  }

  // 手機設備按鈕處理器
  static async handleGenerateConnectionCode(): Promise<any> {
    try {
      console.log("執行生成連接碼")

      const connectionCode = Math.random().toString(36).substr(2, 8).toUpperCase()
      const qrData = JSON.stringify({
        type: "vr_connection",
        code: connectionCode,
        server: window.location.origin,
        timestamp: Date.now(),
      })

      // 生成QR碼（這裡使用簡化版本）
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`

      return {
        success: true,
        message: "連接碼已生成",
        data: {
          connectionCode,
          qrCodeUrl,
          qrData,
        },
      }
    } catch (error: any) {
      console.error("生成連接碼失敗:", error)
      return {
        success: false,
        message: error.message || "生成連接碼失敗",
      }
    }
  }

  static async handleConnectMobileDevice(connectionCode: string): Promise<any> {
    try {
      console.log(`執行手機設備連接: ${connectionCode}`)

      // 驗證連接碼（簡化版本）
      if (!connectionCode || connectionCode.length !== 8) {
        throw new Error("無效的連接碼")
      }

      // 創建手機設備記錄
      const deviceId = `mobile_${connectionCode}_${Date.now()}`
      const success = await enhancedDeviceManager.addDeviceManually(
        "mobile-device", // 特殊IP標識
        0, // 手機設備不使用端口
        {
          name: `手機設備_${connectionCode}`,
          type: "mobile",
          capabilities: ["mobile", "touch", "gyroscope"],
          metadata: {
            connectionCode,
            connectedAt: new Date().toISOString(),
          },
        },
      )

      if (success) {
        return {
          success: true,
          message: "手機設備連接成功",
        }
      } else {
        return {
          success: false,
          message: "手機設備連接失敗",
        }
      }
    } catch (error: any) {
      console.error("手機設備連接失敗:", error)
      return {
        success: false,
        message: error.message || "手機設備連接失敗",
      }
    }
  }

  // 獲取系統狀態
  static getSystemStatus(): any {
    const deviceStats = enhancedDeviceManager.getDeviceStats()
    const connectedDevices = wsServer.getConnectedDevices()

    return {
      devices: deviceStats,
      websocket: {
        connected: connectedDevices.length,
        server: "running",
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString(),
      },
    }
  }
}
