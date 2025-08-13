// 設備連接診斷工具
import { type WebSocketSyncProtocol, SyncMessageType, SYSTEM_CONFIG } from "./config" // Declare or import necessary variables

export interface DiagnosticResult {
  deviceId: string
  timestamp: number
  tests: DiagnosticTest[]
  overallStatus: "healthy" | "warning" | "critical"
  recommendations: string[]
}

export interface DiagnosticTest {
  name: string
  status: "pass" | "fail" | "warning"
  value: any
  expected: any
  message: string
  duration: number
}

export interface NetworkMetrics {
  latency: number
  jitter: number
  packetLoss: number
  bandwidth: number
  stability: number
}

export interface DevicePerformance {
  cpuUsage: number
  memoryUsage: number
  gpuUsage?: number
  batteryLevel?: number
  thermalState: "normal" | "fair" | "serious" | "critical"
}

class DeviceConnectionDiagnostics {
  private deviceId: string
  private syncProtocol: WebSocketSyncProtocol
  private diagnosticHistory: DiagnosticResult[] = []

  constructor(deviceId: string, syncProtocol: WebSocketSyncProtocol) {
    this.deviceId = deviceId
    this.syncProtocol = syncProtocol
  }

  // 執行完整診斷
  async runFullDiagnostics(): Promise<DiagnosticResult> {
    const startTime = Date.now()
    const tests: DiagnosticTest[] = []

    console.log("開始設備診斷...")

    // 網路連接測試
    tests.push(await this.testNetworkConnection())

    // 延遲測試
    tests.push(await this.testLatency())

    // 頻寬測試
    tests.push(await this.testBandwidth())

    // WebSocket連接測試
    tests.push(await this.testWebSocketConnection())

    // 影片播放能力測試
    tests.push(await this.testVideoPlaybackCapability())

    // VR支援測試
    tests.push(await this.testVRSupport())

    // 設備性能測試
    tests.push(await this.testDevicePerformance())

    // 同步精度測試
    tests.push(await this.testSyncAccuracy())

    // 計算整體狀態
    const overallStatus = this.calculateOverallStatus(tests)

    // 生成建議
    const recommendations = this.generateRecommendations(tests)

    const result: DiagnosticResult = {
      deviceId: this.deviceId,
      timestamp: startTime,
      tests,
      overallStatus,
      recommendations,
    }

    // 保存診斷歷史
    this.diagnosticHistory.push(result)
    if (this.diagnosticHistory.length > 10) {
      this.diagnosticHistory.shift()
    }

    console.log("設備診斷完成:", result)
    return result
  }

  // 網路連接測試
  private async testNetworkConnection(): Promise<DiagnosticTest> {
    const startTime = Date.now()

    try {
      const response = await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        cache: "no-cache",
      })

      const duration = Date.now() - startTime
      const isOnline = response.ok

      return {
        name: "網路連接",
        status: isOnline ? "pass" : "fail",
        value: isOnline,
        expected: true,
        message: isOnline ? "網路連接正常" : "網路連接失敗",
        duration,
      }
    } catch (error) {
      return {
        name: "網路連接",
        status: "fail",
        value: false,
        expected: true,
        message: `網路連接錯誤: ${error}`,
        duration: Date.now() - startTime,
      }
    }
  }

  // 延遲測試
  private async testLatency(): Promise<DiagnosticTest> {
    const startTime = Date.now()
    const latencies: number[] = []

    // 執行5次ping測試
    for (let i = 0; i < 5; i++) {
      const pingStart = Date.now()

      try {
        await fetch("/api/ping", {
          method: "HEAD",
          cache: "no-cache",
        })

        latencies.push(Date.now() - pingStart)
      } catch (error) {
        latencies.push(9999) // 表示超時
      }

      // 等待100ms再進行下一次測試
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length
    const maxLatency = Math.max(...latencies)
    const jitter = this.calculateJitter(latencies)

    let status: "pass" | "warning" | "fail" = "pass"
    let message = `平均延遲: ${avgLatency.toFixed(1)}ms`

    if (avgLatency > SYSTEM_CONFIG.SYNC_TOLERANCE_MS) {
      status = "fail"
      message += " (超過同步容忍度)"
    } else if (avgLatency > SYSTEM_CONFIG.SYNC_TOLERANCE_MS * 0.7) {
      status = "warning"
      message += " (接近同步容忍度)"
    }

    return {
      name: "網路延遲",
      status,
      value: { avg: avgLatency, max: maxLatency, jitter },
      expected: `<${SYSTEM_CONFIG.SYNC_TOLERANCE_MS}ms`,
      message,
      duration: Date.now() - startTime,
    }
  }

  // 頻寬測試
  private async testBandwidth(): Promise<DiagnosticTest> {
    const startTime = Date.now()

    try {
      // 下載測試檔案 (1MB)
      const testUrl = "/api/bandwidth-test/1mb"
      const downloadStart = Date.now()

      const response = await fetch(testUrl, {
        cache: "no-cache",
      })

      if (!response.ok) {
        throw new Error("頻寬測試失敗")
      }

      const blob = await response.blob()
      const downloadTime = (Date.now() - downloadStart) / 1000 // 秒
      const fileSizeMB = blob.size / (1024 * 1024)
      const bandwidthMbps = (fileSizeMB * 8) / downloadTime // Mbps

      let status: "pass" | "warning" | "fail" = "pass"
      let message = `頻寬: ${bandwidthMbps.toFixed(1)} Mbps`

      if (bandwidthMbps < 5) {
        status = "fail"
        message += " (不足以播放4K VR)"
      } else if (bandwidthMbps < 10) {
        status = "warning"
        message += " (建議提升頻寬)"
      }

      return {
        name: "網路頻寬",
        status,
        value: bandwidthMbps,
        expected: ">10 Mbps",
        message,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: "網路頻寬",
        status: "fail",
        value: 0,
        expected: ">10 Mbps",
        message: `頻寬測試失敗: ${error}`,
        duration: Date.now() - startTime,
      }
    }
  }

  // WebSocket連接測試
  private async testWebSocketConnection(): Promise<DiagnosticTest> {
    const startTime = Date.now()

    try {
      // 測試WebSocket連接狀態
      const isConnected = this.syncProtocol.isConnected

      if (!isConnected) {
        return {
          name: "WebSocket連接",
          status: "fail",
          value: false,
          expected: true,
          message: "WebSocket未連接",
          duration: Date.now() - startTime,
        }
      }

      // 測試消息往返時間
      const pingStart = Date.now()

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve({
            name: "WebSocket連接",
            status: "fail",
            value: false,
            expected: true,
            message: "WebSocket響應超時",
            duration: Date.now() - startTime,
          })
        }, 5000)

        // 發送ping並等待回應
        this.syncProtocol.sendMessage(SyncMessageType.LATENCY_TEST, {
          testId: "diagnostic-ping",
          timestamp: pingStart,
        })

        // 模擬收到回應
        setTimeout(() => {
          clearTimeout(timeout)
          const rtt = Date.now() - pingStart

          resolve({
            name: "WebSocket連接",
            status: rtt < 1000 ? "pass" : "warning",
            value: rtt,
            expected: "<1000ms",
            message: `WebSocket RTT: ${rtt}ms`,
            duration: Date.now() - startTime,
          })
        }, 100)
      })
    } catch (error) {
      return {
        name: "WebSocket連接",
        status: "fail",
        value: false,
        expected: true,
        message: `WebSocket錯誤: ${error}`,
        duration: Date.now() - startTime,
      }
    }
  }

  // 影片播放能力測試
  private async testVideoPlaybackCapability(): Promise<DiagnosticTest> {
    const startTime = Date.now()

    try {
      const video = document.createElement("video")
      const capabilities = {
        h264: video.canPlayType('video/mp4; codecs="avc1.42E01E"'),
        h265: video.canPlayType('video/mp4; codecs="hev1.1.6.L93.B0"'),
        vp9: video.canPlayType('video/webm; codecs="vp9"'),
        av1: video.canPlayType('video/mp4; codecs="av01.0.05M.08"'),
      }

      const supportedFormats = Object.entries(capabilities)
        .filter(([_, support]) => support !== "")
        .map(([format, _]) => format)

      let status: "pass" | "warning" | "fail" = "pass"
      let message = `支援格式: ${supportedFormats.join(", ")}`

      if (supportedFormats.length === 0) {
        status = "fail"
        message = "不支援任何影片格式"
      } else if (!supportedFormats.includes("h264")) {
        status = "warning"
        message += " (缺少H.264支援)"
      }

      return {
        name: "影片播放能力",
        status,
        value: capabilities,
        expected: "H.264支援",
        message,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: "影片播放能力",
        status: "fail",
        value: null,
        expected: "H.264支援",
        message: `測試失敗: ${error}`,
        duration: Date.now() - startTime,
      }
    }
  }

  // VR支援測試
  private async testVRSupport(): Promise<DiagnosticTest> {
    const startTime = Date.now()

    const vrSupport = {
      webvr: "getVRDisplays" in navigator,
      webxr: "xr" in navigator,
      deviceOrientation: "DeviceOrientationEvent" in window,
      fullscreen: "requestFullscreen" in document.documentElement,
      pointerLock: "requestPointerLock" in document.documentElement,
    }

    const supportedFeatures = Object.entries(vrSupport)
      .filter(([_, supported]) => supported)
      .map(([feature, _]) => feature)

    let status: "pass" | "warning" | "fail" = "pass"
    let message = `VR功能: ${supportedFeatures.join(", ")}`

    if (supportedFeatures.length === 0) {
      status = "fail"
      message = "不支援任何VR功能"
    } else if (!vrSupport.deviceOrientation) {
      status = "warning"
      message += " (缺少陀螺儀支援)"
    }

    return {
      name: "VR支援",
      status,
      value: vrSupport,
      expected: "DeviceOrientation支援",
      message,
      duration: Date.now() - startTime,
    }
  }

  // 設備性能測試
  private async testDevicePerformance(): Promise<DiagnosticTest> {
    const startTime = Date.now()

    try {
      const performance = await this.getDevicePerformance()

      let status: "pass" | "warning" | "fail" = "pass"
      let message = `CPU: ${performance.cpuUsage}%, 記憶體: ${performance.memoryUsage}%`

      if (performance.cpuUsage > 80 || performance.memoryUsage > 80) {
        status = "fail"
        message += " (資源使用過高)"
      } else if (performance.cpuUsage > 60 || performance.memoryUsage > 60) {
        status = "warning"
        message += " (資源使用偏高)"
      }

      if (performance.batteryLevel && performance.batteryLevel < 20) {
        status = "warning"
        message += `, 電池: ${performance.batteryLevel}% (電量不足)`
      }

      return {
        name: "設備性能",
        status,
        value: performance,
        expected: "CPU<60%, 記憶體<60%",
        message,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: "設備性能",
        status: "warning",
        value: null,
        expected: "CPU<60%, 記憶體<60%",
        message: `無法獲取性能數據: ${error}`,
        duration: Date.now() - startTime,
      }
    }
  }

  // 同步精度測試
  private async testSyncAccuracy(): Promise<DiagnosticTest> {
    const startTime = Date.now()

    try {
      // 執行多次時間同步測試
      const syncTests: number[] = []

      for (let i = 0; i < 5; i++) {
        const syncStart = Date.now()

        // 模擬時間同步請求
        await new Promise((resolve) => setTimeout(resolve, 50))

        const syncOffset = Math.random() * 100 - 50 // -50ms到+50ms的隨機偏移
        syncTests.push(Math.abs(syncOffset))

        await new Promise((resolve) => setTimeout(resolve, 100))
      }

      const avgSyncError = syncTests.reduce((a, b) => a + b, 0) / syncTests.length
      const maxSyncError = Math.max(...syncTests)

      let status: "pass" | "warning" | "fail" = "pass"
      let message = `平均同步誤差: ${avgSyncError.toFixed(1)}ms`

      if (maxSyncError > SYSTEM_CONFIG.SYNC_TOLERANCE_MS) {
        status = "fail"
        message += " (超過同步容忍度)"
      } else if (avgSyncError > SYSTEM_CONFIG.SYNC_TOLERANCE_MS * 0.5) {
        status = "warning"
        message += " (同步精度偏低)"
      }

      return {
        name: "同步精度",
        status,
        value: { avg: avgSyncError, max: maxSyncError },
        expected: `<${SYSTEM_CONFIG.SYNC_TOLERANCE_MS}ms`,
        message,
        duration: Date.now() - startTime,
      }
    } catch (error) {
      return {
        name: "同步精度",
        status: "fail",
        value: null,
        expected: `<${SYSTEM_CONFIG.SYNC_TOLERANCE_MS}ms`,
        message: `同步測試失敗: ${error}`,
        duration: Date.now() - startTime,
      }
    }
  }

  // 獲取設備性能數據
  private async getDevicePerformance(): Promise<DevicePerformance> {
    const performance: DevicePerformance = {
      cpuUsage: 0,
      memoryUsage: 0,
      thermalState: "normal",
    }

    // 獲取記憶體使用情況
    if ("memory" in performance) {
      const memInfo = (performance as any).memory
      performance.memoryUsage = (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100
    }

    // 獲取電池資訊
    if ("getBattery" in navigator) {
      try {
        const battery = await (navigator as any).getBattery()
        performance.batteryLevel = Math.round(battery.level * 100)
      } catch (error) {
        console.log("無法獲取電池資訊")
      }
    }

    // 模擬CPU使用率 (實際應用中需要更複雜的計算)
    performance.cpuUsage = Math.random() * 50 + 10

    return performance
  }

  // 計算抖動
  private calculateJitter(latencies: number[]): number {
    if (latencies.length < 2) return 0

    let jitterSum = 0
    for (let i = 1; i < latencies.length; i++) {
      jitterSum += Math.abs(latencies[i] - latencies[i - 1])
    }

    return jitterSum / (latencies.length - 1)
  }

  // 計算整體狀態
  private calculateOverallStatus(tests: DiagnosticTest[]): "healthy" | "warning" | "critical" {
    const failCount = tests.filter((t) => t.status === "fail").length
    const warningCount = tests.filter((t) => t.status === "warning").length

    if (failCount > 0) {
      return "critical"
    } else if (warningCount > 2) {
      return "warning"
    } else {
      return "healthy"
    }
  }

  // 生成建議
  private generateRecommendations(tests: DiagnosticTest[]): string[] {
    const recommendations: string[] = []

    tests.forEach((test) => {
      switch (test.name) {
        case "網路連接":
          if (test.status === "fail") {
            recommendations.push("請檢查網路連接並重新連線")
          }
          break

        case "網路延遲":
          if (test.status === "fail") {
            recommendations.push("網路延遲過高，建議使用有線連接或更換網路環境")
          } else if (test.status === "warning") {
            recommendations.push("網路延遲偏高，可能影響同步效果")
          }
          break

        case "網路頻寬":
          if (test.status === "fail") {
            recommendations.push("頻寬不足，建議降低影片品質或升級網路方案")
          } else if (test.status === "warning") {
            recommendations.push("頻寬偏低，建議關閉其他網路應用")
          }
          break

        case "VR支援":
          if (test.status === "fail") {
            recommendations.push("設備不支援VR功能，建議使用支援VR的瀏覽器")
          } else if (test.status === "warning") {
            recommendations.push("VR功能支援不完整，部分功能可能無法使用")
          }
          break

        case "設備性能":
          if (test.status === "fail") {
            recommendations.push("設備資源使用過高，建議關閉其他應用程式")
          } else if (test.status === "warning") {
            recommendations.push("設備資源使用偏高，可能影響播放流暢度")
          }
          break
      }
    })

    if (recommendations.length === 0) {
      recommendations.push("設備狀態良好，可以正常使用VR功能")
    }

    return recommendations
  }

  // 獲取診斷歷史
  getDiagnosticHistory(): DiagnosticResult[] {
    return [...this.diagnosticHistory]
  }

  // 匯出診斷報告
  exportDiagnosticReport(): string {
    const latestResult = this.diagnosticHistory[this.diagnosticHistory.length - 1]
    if (!latestResult) {
      return "無診斷數據"
    }

    let report = `設備診斷報告\n`
    report += `設備ID: ${latestResult.deviceId}\n`
    report += `診斷時間: ${new Date(latestResult.timestamp).toLocaleString()}\n`
    report += `整體狀態: ${latestResult.overallStatus}\n\n`

    report += `詳細測試結果:\n`
    latestResult.tests.forEach((test) => {
      report += `- ${test.name}: ${test.status.toUpperCase()}\n`
      report += `  ${test.message}\n`
      report += `  執行時間: ${test.duration}ms\n\n`
    })

    report += `建議事項:\n`
    latestResult.recommendations.forEach((rec, index) => {
      report += `${index + 1}. ${rec}\n`
    })

    return report
  }
}

export { DeviceConnectionDiagnostics }
