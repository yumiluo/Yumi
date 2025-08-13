import { exec } from "child_process"
import { promisify } from "util"
import dgram from "dgram"
import net from "net"
import dns from "dns"

const execAsync = promisify(exec)

export interface DiscoveredDevice {
  id: string
  name: string
  ip: string
  mac?: string
  type: "vr" | "mobile" | "desktop" | "unknown"
  port?: number
  services: string[]
  lastSeen: number
  capabilities: string[]
  metadata: any
}

export class DeviceDiscoveryService {
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map()
  private scanInProgress = false

  // 掃描網絡設備
  async scanDevices(method: "arp" | "ping" | "udp" | "mdns" | "all" = "all"): Promise<DiscoveredDevice[]> {
    if (this.scanInProgress) {
      throw new Error("掃描正在進行中")
    }

    this.scanInProgress = true
    console.log(`開始設備掃描，方法: ${method}`)

    try {
      const results: DiscoveredDevice[] = []

      if (method === "all" || method === "arp") {
        const arpDevices = await this.scanWithARP()
        results.push(...arpDevices)
      }

      if (method === "all" || method === "ping") {
        const pingDevices = await this.scanWithPing()
        results.push(...pingDevices)
      }

      if (method === "all" || method === "udp") {
        const udpDevices = await this.scanWithUDP()
        results.push(...udpDevices)
      }

      if (method === "all" || method === "mdns") {
        const mdnsDevices = await this.scanWithMDNS()
        results.push(...mdnsDevices)
      }

      // 去重並更新設備列表
      const uniqueDevices = this.deduplicateDevices(results)

      // 更新內部設備列表
      for (const device of uniqueDevices) {
        this.discoveredDevices.set(device.ip, device)
      }

      console.log(`掃描完成，發現 ${uniqueDevices.length} 個設備`)
      return uniqueDevices
    } finally {
      this.scanInProgress = false
    }
  }

  // ARP表掃描
  private async scanWithARP(): Promise<DiscoveredDevice[]> {
    try {
      console.log("開始ARP掃描...")
      const { stdout } = await execAsync("arp -a")
      const devices: DiscoveredDevice[] = []

      const lines = stdout.split("\n")
      for (const line of lines) {
        const match = line.match(/$$(\d+\.\d+\.\d+\.\d+)$$ at ([a-fA-F0-9:]{17})/)
        if (match) {
          const [, ip, mac] = match

          const device: DiscoveredDevice = {
            id: `arp_${ip.replace(/\./g, "_")}`,
            name: (await this.resolveHostname(ip)) || `設備_${ip}`,
            ip,
            mac,
            type: this.guessDeviceType(mac, ip),
            services: ["network"],
            lastSeen: Date.now(),
            capabilities: [],
            metadata: { discoveryMethod: "arp" },
          }

          devices.push(device)
        }
      }

      console.log(`ARP掃描發現 ${devices.length} 個設備`)
      return devices
    } catch (error) {
      console.error("ARP掃描失敗:", error)
      return []
    }
  }

  // Ping掃描
  private async scanWithPing(): Promise<DiscoveredDevice[]> {
    try {
      console.log("開始Ping掃描...")
      const devices: DiscoveredDevice[] = []
      const subnet = await this.getLocalSubnet()

      const pingPromises: Promise<DiscoveredDevice | null>[] = []

      // 掃描本地子網
      for (let i = 1; i <= 254; i++) {
        const ip = `${subnet}.${i}`
        pingPromises.push(this.pingHost(ip))
      }

      const results = await Promise.allSettled(pingPromises)

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          devices.push(result.value)
        }
      }

      console.log(`Ping掃描發現 ${devices.length} 個設備`)
      return devices
    } catch (error) {
      console.error("Ping掃描失敗:", error)
      return []
    }
  }

  // UDP廣播掃描
  private async scanWithUDP(): Promise<DiscoveredDevice[]> {
    return new Promise((resolve) => {
      console.log("開始UDP廣播掃描...")
      const devices: DiscoveredDevice[] = []
      const socket = dgram.createSocket("udp4")

      const broadcastMessage = JSON.stringify({
        type: "vr_discovery",
        timestamp: Date.now(),
        message: "VR設備發現請求",
      })

      socket.on("message", (msg, rinfo) => {
        try {
          const response = JSON.parse(msg.toString())
          if (response.type === "vr_device_response") {
            const device: DiscoveredDevice = {
              id: `udp_${rinfo.address.replace(/\./g, "_")}`,
              name: response.deviceName || `VR設備_${rinfo.address}`,
              ip: rinfo.address,
              type: response.deviceType || "vr",
              port: response.port || rinfo.port,
              services: response.services || ["vr"],
              lastSeen: Date.now(),
              capabilities: response.capabilities || [],
              metadata: {
                discoveryMethod: "udp",
                ...response.metadata,
              },
            }
            devices.push(device)
          }
        } catch (error) {
          // 忽略無效響應
        }
      })

      socket.bind(() => {
        socket.setBroadcast(true)

        // 發送到多個端口
        const ports = [8080, 8081, 9090, 3000, 3001]
        for (const port of ports) {
          socket.send(broadcastMessage, port, "255.255.255.255")
        }
      })

      // 5秒後結束掃描
      setTimeout(() => {
        socket.close()
        console.log(`UDP掃描發現 ${devices.length} 個設備`)
        resolve(devices)
      }, 5000)
    })
  }

  // mDNS掃描
  private async scanWithMDNS(): Promise<DiscoveredDevice[]> {
    try {
      console.log("開始mDNS掃描...")
      const devices: DiscoveredDevice[] = []

      // 查詢常見的VR和移動設備服務
      const services = [
        "_http._tcp.local",
        "_https._tcp.local",
        "_vr._tcp.local",
        "_oculus._tcp.local",
        "_steamvr._tcp.local",
      ]

      for (const service of services) {
        try {
          const { stdout } = await execAsync(`avahi-browse -t ${service}`)
          // 解析mDNS響應（簡化版本）
          const lines = stdout.split("\n")
          for (const line of lines) {
            if (line.includes("IPv4")) {
              // 提取設備信息（需要更複雜的解析邏輯）
              const parts = line.split(/\s+/)
              if (parts.length >= 4) {
                const name = parts[3]
                // 這裡需要進一步解析獲取IP地址
              }
            }
          }
        } catch (error) {
          // mDNS服務可能不可用
        }
      }

      console.log(`mDNS掃描發現 ${devices.length} 個設備`)
      return devices
    } catch (error) {
      console.error("mDNS掃描失敗:", error)
      return []
    }
  }

  // 連接到設備
  async connectToDevice(ip: string, port = 8080, deviceInfo?: any): Promise<boolean> {
    try {
      console.log(`嘗試連接設備: ${ip}:${port}`)

      // 首先檢查端口是否開放
      const isPortOpen = await this.checkPort(ip, port)
      if (!isPortOpen) {
        console.log(`端口 ${ip}:${port} 不可達`)
        return false
      }

      // 嘗試建立WebSocket連接
      const WebSocket = require("ws")
      const ws = new WebSocket(`ws://${ip}:${port}`)

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          ws.terminate()
          resolve(false)
        }, 10000) // 10秒超時

        ws.on("open", () => {
          clearTimeout(timeout)

          // 發送設備註冊請求
          ws.send(
            JSON.stringify({
              type: "register",
              data: {
                deviceInfo: deviceInfo || {
                  name: `設備_${ip}`,
                  type: "unknown",
                  ip,
                  capabilities: [],
                },
              },
            }),
          )

          ws.close()
          resolve(true)
        })

        ws.on("error", () => {
          clearTimeout(timeout)
          resolve(false)
        })
      })
    } catch (error) {
      console.error(`連接設備失敗 ${ip}:${port}:`, error)
      return false
    }
  }

  // 輔助方法
  private async pingHost(ip: string): Promise<DiscoveredDevice | null> {
    try {
      await execAsync(`ping -c 1 -W 1000 ${ip}`)

      const hostname = await this.resolveHostname(ip)

      return {
        id: `ping_${ip.replace(/\./g, "_")}`,
        name: hostname || `設備_${ip}`,
        ip,
        type: this.guessDeviceType("", ip),
        services: ["network"],
        lastSeen: Date.now(),
        capabilities: [],
        metadata: { discoveryMethod: "ping" },
      }
    } catch (error) {
      return null
    }
  }

  private async resolveHostname(ip: string): Promise<string | null> {
    try {
      const hostnames = await dns.promises.reverse(ip)
      return hostnames[0] || null
    } catch (error) {
      return null
    }
  }

  private async getLocalSubnet(): Promise<string> {
    try {
      const { stdout } = await execAsync("ip route | grep default")
      const match = stdout.match(/via (\d+\.\d+\.\d+)\.\d+/)
      if (match) {
        return match[1]
      }
    } catch (error) {
      // 回退到常見子網
    }
    return "192.168.1"
  }

  private async checkPort(ip: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket()
      const timeout = setTimeout(() => {
        socket.destroy()
        resolve(false)
      }, 3000)

      socket.connect(port, ip, () => {
        clearTimeout(timeout)
        socket.destroy()
        resolve(true)
      })

      socket.on("error", () => {
        clearTimeout(timeout)
        resolve(false)
      })
    })
  }

  private guessDeviceType(mac: string, ip: string): "vr" | "mobile" | "desktop" | "unknown" {
    // 基於MAC地址前綴猜測設備類型
    const macPrefixes: { [key: string]: "vr" | "mobile" | "desktop" } = {
      "00:1B:21": "vr", // Oculus
      "00:15:83": "vr", // HTC
      "28:6A:BA": "mobile", // Apple
      "00:23:76": "mobile", // HTC Mobile
      "00:1A:11": "mobile", // Google
    }

    if (mac) {
      const prefix = mac.substring(0, 8).toUpperCase()
      if (macPrefixes[prefix]) {
        return macPrefixes[prefix]
      }
    }

    // 基於IP範圍猜測
    if (ip.startsWith("192.168.")) {
      return "desktop"
    }

    return "unknown"
  }

  private deduplicateDevices(devices: DiscoveredDevice[]): DiscoveredDevice[] {
    const deviceMap = new Map<string, DiscoveredDevice>()

    for (const device of devices) {
      const existing = deviceMap.get(device.ip)
      if (!existing || device.lastSeen > existing.lastSeen) {
        // 合併服務和能力
        if (existing) {
          device.services = [...new Set([...device.services, ...existing.services])]
          device.capabilities = [...new Set([...device.capabilities, ...existing.capabilities])]
        }
        deviceMap.set(device.ip, device)
      }
    }

    return Array.from(deviceMap.values())
  }

  // 獲取已發現的設備
  getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values())
  }

  // 清除過期設備
  cleanupExpiredDevices(maxAge = 300000): void {
    // 5分鐘
    const now = Date.now()
    for (const [ip, device] of this.discoveredDevices) {
      if (now - device.lastSeen > maxAge) {
        this.discoveredDevices.delete(ip)
      }
    }
  }
}
