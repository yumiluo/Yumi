// 手機設備管理
export interface MobileDeviceInfo {
  id: string
  name: string
  type: "ios" | "android" | "web"
  brand: string
  model: string
  userAgent: string
  screenSize: string
  ipAddress: string
  connectionId: string
  status: "online" | "offline" | "playing" | "paused" | "synced" | "connecting" | "error"
  batteryLevel?: number
  osVersion: string
  browserInfo: string
  capabilities: string[]
  currentVideo?: string
  currentTime: number
  lastSeen: string
  isConnected: boolean
}

export interface MobileConnectionRequest {
  deviceInfo: {
    name: string
    type: "ios" | "android" | "web"
    userAgent: string
    screenSize: string
    osVersion: string
    browserInfo: string
  }
  connectionCode: string
}

class MobileDeviceService {
  private connectedDevices = new Map<string, WebSocket>()
  private connectionCodes = new Map<string, { code: string; expires: number }>()
  private qrCodeCallbacks = new Map<string, (device: MobileDeviceInfo) => void>()

  // 生成連接碼
  generateConnectionCode(): { code: string; qrData: string } {
    const code = Math.random().toString(36).substr(2, 8).toUpperCase()
    const expires = Date.now() + 5 * 60 * 1000 // 5分鐘過期

    this.connectionCodes.set(code, { code, expires })

    // 生成QR碼數據 (包含連接信息)
    const qrData = JSON.stringify({
      type: "vr_mobile_connect",
      code: code,
      server: window.location.origin,
      timestamp: Date.now(),
    })

    console.log("生成手機連接碼:", code)
    return { code, qrData }
  }

  // 驗證連接碼
  validateConnectionCode(code: string): boolean {
    const connection = this.connectionCodes.get(code)
    if (!connection) return false

    if (Date.now() > connection.expires) {
      this.connectionCodes.delete(code)
      return false
    }

    return true
  }

  // 處理手機連接請求
  async handleMobileConnection(request: MobileConnectionRequest): Promise<MobileDeviceInfo> {
    const { deviceInfo, connectionCode } = request

    if (!this.validateConnectionCode(connectionCode)) {
      throw new Error("無效或過期的連接碼")
    }

    // 解析設備信息
    const parsedDevice = this.parseDeviceInfo(deviceInfo)

    // 創建設備對象
    const mobileDevice: MobileDeviceInfo = {
      id: `mobile_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: parsedDevice.name,
      type: parsedDevice.type,
      brand: parsedDevice.brand,
      model: parsedDevice.model,
      userAgent: deviceInfo.userAgent,
      screenSize: deviceInfo.screenSize,
      ipAddress: "mobile://connected",
      connectionId: connectionCode,
      status: "online",
      batteryLevel: await this.getBatteryLevel(),
      osVersion: deviceInfo.osVersion,
      browserInfo: deviceInfo.browserInfo,
      capabilities: this.getDeviceCapabilities(parsedDevice.type),
      currentTime: 0,
      lastSeen: "剛剛",
      isConnected: true,
    }

    console.log("手機設備連接成功:", mobileDevice)

    // 清除使用過的連接碼
    this.connectionCodes.delete(connectionCode)

    return mobileDevice
  }

  // 解析設備信息
  private parseDeviceInfo(deviceInfo: any): {
    name: string
    type: "ios" | "android" | "web"
    brand: string
    model: string
  } {
    const userAgent = deviceInfo.userAgent.toLowerCase()

    let type: "ios" | "android" | "web" = "web"
    let brand = "Unknown"
    let model = "Unknown"
    let name = "Mobile Device"

    if (userAgent.includes("iphone")) {
      type = "ios"
      brand = "Apple"
      model = this.extractiOSModel(userAgent)
      name = `iPhone (${model})`
    } else if (userAgent.includes("ipad")) {
      type = "ios"
      brand = "Apple"
      model = this.extractiOSModel(userAgent)
      name = `iPad (${model})`
    } else if (userAgent.includes("android")) {
      type = "android"
      const androidInfo = this.extractAndroidInfo(userAgent)
      brand = androidInfo.brand
      model = androidInfo.model
      name = `${brand} ${model}`
    } else {
      // Web browser on desktop/mobile
      const browserInfo = this.extractBrowserInfo(userAgent)
      name = `${browserInfo.browser} Browser`
      brand = browserInfo.browser
      model = browserInfo.version
    }

    return { name, type, brand, model }
  }

  private extractiOSModel(userAgent: string): string {
    const match = userAgent.match(/os (\d+_\d+)/i)
    return match ? `iOS ${match[1].replace("_", ".")}` : "iOS"
  }

  private extractAndroidInfo(userAgent: string): { brand: string; model: string } {
    // 嘗試提取Android設備信息
    if (userAgent.includes("samsung")) {
      return { brand: "Samsung", model: "Galaxy" }
    } else if (userAgent.includes("huawei")) {
      return { brand: "Huawei", model: "Mobile" }
    } else if (userAgent.includes("xiaomi")) {
      return { brand: "Xiaomi", model: "Mobile" }
    } else if (userAgent.includes("oppo")) {
      return { brand: "OPPO", model: "Mobile" }
    } else if (userAgent.includes("vivo")) {
      return { brand: "Vivo", model: "Mobile" }
    } else if (userAgent.includes("oneplus")) {
      return { brand: "OnePlus", model: "Mobile" }
    }

    return { brand: "Android", model: "Mobile" }
  }

  private extractBrowserInfo(userAgent: string): { browser: string; version: string } {
    if (userAgent.includes("chrome")) {
      const match = userAgent.match(/chrome\/(\d+)/i)
      return { browser: "Chrome", version: match ? match[1] : "Unknown" }
    } else if (userAgent.includes("firefox")) {
      const match = userAgent.match(/firefox\/(\d+)/i)
      return { browser: "Firefox", version: match ? match[1] : "Unknown" }
    } else if (userAgent.includes("safari")) {
      return { browser: "Safari", version: "Unknown" }
    } else if (userAgent.includes("edge")) {
      return { browser: "Edge", version: "Unknown" }
    }

    return { browser: "Unknown", version: "Unknown" }
  }

  private async getBatteryLevel(): Promise<number | undefined> {
    try {
      // 嘗試獲取電池信息 (僅在支持的瀏覽器中)
      if ("getBattery" in navigator) {
        const battery = await (navigator as any).getBattery()
        return Math.round(battery.level * 100)
      }
    } catch (error) {
      console.log("無法獲取電池信息")
    }
    return undefined
  }

  private getDeviceCapabilities(type: "ios" | "android" | "web"): string[] {
    const baseCapabilities = ["Video Playback", "Touch Control", "Web Browser"]

    switch (type) {
      case "ios":
        return [...baseCapabilities, "iOS", "Safari", "Touch ID/Face ID"]
      case "android":
        return [...baseCapabilities, "Android", "Chrome", "Fingerprint"]
      case "web":
        return [...baseCapabilities, "Desktop Browser", "Keyboard", "Mouse"]
      default:
        return baseCapabilities
    }
  }

  // 發送命令到手機設備
  async sendCommandToMobile(
    deviceId: string,
    command: {
      type: "play" | "pause" | "stop" | "sync" | "volume"
      videoUrl?: string
      timestamp?: number
      volume?: number
    },
  ): Promise<boolean> {
    console.log("發送命令到手機設備:", deviceId, command)

    // 模擬命令發送
    await new Promise((resolve) => setTimeout(resolve, 100))

    // 在實際應用中，這裡會通過WebSocket或其他方式發送命令到手機
    return true
  }

  // 生成手機連接QR碼
  generateQRCode(code: string): string {
    // 這裡返回一個QR碼的SVG或使用第三方QR碼庫
    const qrData = JSON.stringify({
      type: "vr_mobile_connect",
      code: code,
      server: window.location.origin,
      timestamp: Date.now(),
    })

    // 返回QR碼的占位符URL，實際應用中應該生成真實的QR碼
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`
  }

  // 模擬手機掃碼連接
  async simulateMobileConnection(code: string): Promise<MobileDeviceInfo> {
    // 模擬不同類型的手機設備
    const mockDevices = [
      {
        name: "iPhone 15 Pro",
        type: "ios" as const,
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        screenSize: "393x852",
        osVersion: "iOS 17.0",
        browserInfo: "Safari 17.0",
      },
      {
        name: "Samsung Galaxy S24",
        type: "android" as const,
        userAgent: "Mozilla/5.0 (Linux; Android 14; SM-S921B) AppleWebKit/537.36 Chrome/120.0.0.0",
        screenSize: "384x854",
        osVersion: "Android 14",
        browserInfo: "Chrome 120.0",
      },
      {
        name: "Xiaomi 14",
        type: "android" as const,
        userAgent: "Mozilla/5.0 (Linux; Android 14; 2312DRA50C) AppleWebKit/537.36 Chrome/119.0.0.0",
        screenSize: "393x873",
        osVersion: "Android 14",
        browserInfo: "Chrome 119.0",
      },
    ]

    const randomDevice = mockDevices[Math.floor(Math.random() * mockDevices.length)]

    return await this.handleMobileConnection({
      deviceInfo: randomDevice,
      connectionCode: code,
    })
  }
}

export const mobileDeviceService = new MobileDeviceService()
