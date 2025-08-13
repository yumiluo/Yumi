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

import type { VRVideo } from "./video-manager"
import type { DeviceInfo } from "./device-manager"
import type { MobileDeviceInfo } from "./mobile-device-manager"
import type { User } from "./auth"
