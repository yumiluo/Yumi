import authManager from "./auth"

interface SystemDiagnostics {
  timestamp: string
  network: {
    connected: boolean
    latency: number
  }
  websocket: {
    connected: boolean
  }
  webgl: {
    webgl1: boolean
    webgl2: boolean
  }
  webrtc: boolean
  system: {
    platform: string
    userAgent: string
    memory?: any
  }
  services: {
    api: boolean
    websocket: boolean
    database: boolean
  }
}

class DiagnosticsManager {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  }

  // 運行完整診斷
  async runFullDiagnostics(): Promise<SystemDiagnostics> {
    const diagnostics: SystemDiagnostics = {
      timestamp: new Date().toISOString(),
      network: await this.checkNetworkConnectivity(),
      websocket: await this.checkWebSocketConnection(),
      webgl: this.checkWebGLSupport(),
      webrtc: this.checkWebRTCSupport(),
      system: this.getSystemInfo(),
      services: await this.checkServices(),
    }

    return diagnostics
  }

  // 檢查網絡連接
  private async checkNetworkConnectivity(): Promise<{ connected: boolean; latency: number }> {
    try {
      const startTime = Date.now()
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: "GET",
        headers: {
          ...authManager.getAuthHeaders(),
        },
      })
      const endTime = Date.now()

      return {
        connected: response.ok,
        latency: endTime - startTime,
      }
    } catch (error) {
      return {
        connected: false,
        latency: -1,
      }
    }
  }

  // 檢查WebSocket連接
  private async checkWebSocketConnection(): Promise<{ connected: boolean }> {
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`ws://localhost:8080`)

        ws.onopen = () => {
          ws.close()
          resolve({ connected: true })
        }

        ws.onerror = () => {
          resolve({ connected: false })
        }

        // 5秒超時
        setTimeout(() => {
          ws.close()
          resolve({ connected: false })
        }, 5000)
      } catch (error) {
        resolve({ connected: false })
      }
    })
  }

  // 檢查WebGL支持
  private checkWebGLSupport(): { webgl1: boolean; webgl2: boolean } {
    const canvas = document.createElement("canvas")

    let webgl1 = false
    let webgl2 = false

    try {
      const gl1 = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      webgl1 = !!gl1
    } catch (error) {
      webgl1 = false
    }

    try {
      const gl2 = canvas.getContext("webgl2")
      webgl2 = !!gl2
    } catch (error) {
      webgl2 = false
    }

    return { webgl1, webgl2 }
  }

  // 檢查WebRTC支持
  private checkWebRTCSupport(): boolean {
    return !!(
      window.RTCPeerConnection ||
      (window as any).webkitRTCPeerConnection ||
      (window as any).mozRTCPeerConnection
    )
  }

  // 獲取系統信息
  private getSystemInfo(): { platform: string; userAgent: string; memory?: any } {
    const info = {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
    }

    // 如果支持，添加內存信息
    if ("memory" in performance) {
      ;(info as any).memory = (performance as any).memory
    }

    return info
  }

  // 檢查服務狀態
  private async checkServices(): Promise<{ api: boolean; websocket: boolean; database: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/diagnostics/system`, {
        headers: {
          ...authManager.getAuthHeaders(),
        },
      })

      if (response.ok) {
        const data = await response.json()
        return data.services || { api: true, websocket: false, database: false }
      }
    } catch (error) {
      console.error("服務檢查錯誤:", error)
    }

    return { api: false, websocket: false, database: false }
  }

  // 檢查設備兼容性
  async checkDeviceCompatibility(): Promise<{
    vr: boolean
    mobile: boolean
    desktop: boolean
    features: string[]
  }> {
    const features: string[] = []

    // 檢查VR支持
    const vrSupported = "xr" in navigator
    if (vrSupported) features.push("WebXR")

    // 檢查移動設備特性
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    if (isMobile) features.push("Mobile")

    // 檢查桌面特性
    const isDesktop = !isMobile
    if (isDesktop) features.push("Desktop")

    // 檢查其他特性
    if ("geolocation" in navigator) features.push("Geolocation")
    if ("deviceorientation" in window) features.push("Device Orientation")
    if ("DeviceMotionEvent" in window) features.push("Device Motion")

    return {
      vr: vrSupported,
      mobile: isMobile,
      desktop: isDesktop,
      features,
    }
  }

  // 性能測試
  async runPerformanceTest(): Promise<{
    fps: number
    renderTime: number
    memoryUsage?: number
  }> {
    return new Promise((resolve) => {
      let frameCount = 0
      const startTime = performance.now()
      const testDuration = 1000 // 1秒

      const testFrame = () => {
        frameCount++
        const currentTime = performance.now()

        if (currentTime - startTime < testDuration) {
          requestAnimationFrame(testFrame)
        } else {
          const fps = Math.round((frameCount * 1000) / (currentTime - startTime))
          const renderTime = (currentTime - startTime) / frameCount

          const result: any = {
            fps,
            renderTime,
          }

          // 如果支持，添加內存使用情況
          if ("memory" in performance) {
            result.memoryUsage = (performance as any).memory.usedJSHeapSize
          }

          resolve(result)
        }
      }

      requestAnimationFrame(testFrame)
    })
  }
}

export const diagnosticsManager = new DiagnosticsManager()
export default diagnosticsManager
export type { SystemDiagnostics }
