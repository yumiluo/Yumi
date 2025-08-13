// 模擬數據庫存儲
interface DatabaseSchema {
  videos: VRVideo[]
  devices: DeviceInfo[]
  mobileDevices: MobileDeviceInfo[]
  users: User[]
}

class LocalDatabase {
  private data: DatabaseSchema = {
    videos: [],
    devices: [],
    mobileDevices: [],
    users: [],
  }

  constructor() {
    this.loadFromStorage()
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem("vr-video-manager-db")
      if (stored) {
        this.data = JSON.parse(stored)
        // 確保新字段存在
        if (!this.data.mobileDevices) {
          this.data.mobileDevices = []
        }
      }
    } catch (error) {
      console.error("Failed to load from storage:", error)
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem("vr-video-manager-db", JSON.stringify(this.data))
    } catch (error) {
      console.error("Failed to save to storage:", error)
    }
  }

  // Video operations
  async saveVideo(video: VRVideo): Promise<VRVideo> {
    const existingIndex = this.data.videos.findIndex((v) => v.id === video.id)
    if (existingIndex >= 0) {
      this.data.videos[existingIndex] = video
    } else {
      this.data.videos.push(video)
    }
    this.saveToStorage()
    return video
  }

  async getVideos(): Promise<VRVideo[]> {
    return [...this.data.videos]
  }

  async deleteVideo(id: string): Promise<boolean> {
    const initialLength = this.data.videos.length
    this.data.videos = this.data.videos.filter((v) => v.id !== id)
    this.saveToStorage()
    return this.data.videos.length < initialLength
  }

  // Device operations
  async saveDevice(device: DeviceInfo): Promise<DeviceInfo> {
    const existingIndex = this.data.devices.findIndex((d) => d.id === device.id)
    if (existingIndex >= 0) {
      this.data.devices[existingIndex] = device
    } else {
      this.data.devices.push(device)
    }
    this.saveToStorage()
    return device
  }

  async getDevices(): Promise<DeviceInfo[]> {
    return [...this.data.devices]
  }

  async deleteDevice(id: string): Promise<boolean> {
    const initialLength = this.data.devices.length
    this.data.devices = this.data.devices.filter((d) => d.id !== id)
    this.saveToStorage()
    return this.data.devices.length < initialLength
  }

  // Mobile Device operations
  async saveMobileDevice(device: MobileDeviceInfo): Promise<MobileDeviceInfo> {
    const existingIndex = this.data.mobileDevices.findIndex((d) => d.id === device.id)
    if (existingIndex >= 0) {
      this.data.mobileDevices[existingIndex] = device
    } else {
      this.data.mobileDevices.push(device)
    }
    this.saveToStorage()
    return device
  }

  async getMobileDevices(): Promise<MobileDeviceInfo[]> {
    return [...this.data.mobileDevices]
  }

  async deleteMobileDevice(id: string): Promise<boolean> {
    const initialLength = this.data.mobileDevices.length
    this.data.mobileDevices = this.data.mobileDevices.filter((d) => d.id !== id)
    this.saveToStorage()
    return this.data.mobileDevices.length < initialLength
  }

  // User operations
  async saveUser(user: User): Promise<User> {
    const existingIndex = this.data.users.findIndex((u) => u.id === user.id)
    if (existingIndex >= 0) {
      this.data.users[existingIndex] = user
    } else {
      this.data.users.push(user)
    }
    this.saveToStorage()
    return user
  }

  async getUsers(): Promise<User[]> {
    return [...this.data.users]
  }
}

export const db = new LocalDatabase()

interface VRVideo {
  id: string
  title: string
  url: string
  category: string
  duration: string
  thumbnail: string
  isYoutube: boolean
  isLocal: boolean
  fileSize?: string
  format?: string
  resolution?: string
  uploadDate: string
  description?: string
}

interface DeviceInfo {
  id: string
  name: string
  type: "vr_headset" | "mobile_vr" | "pc_vr" | "standalone_vr"
  brand: string
  model: string
  ipAddress: string
  macAddress: string
  status: "online" | "offline" | "playing" | "paused" | "synced" | "connecting" | "error"
  batteryLevel?: number
  firmwareVersion: string
  lastSeen: string
  connectionType: "wifi" | "ethernet" | "usb"
  capabilities: string[]
  currentVideo?: string
  currentTime: number
  isAuthenticated: boolean
  authCode?: string
}

interface MobileDeviceInfo {
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

interface User {
  id: string
  username: string
  email?: string
  role: "admin" | "operator" | "viewer" | "guest"
  loginType: "local" | "google" | "guest"
  avatar?: string
  createdAt: string
}
