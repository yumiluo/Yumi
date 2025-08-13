// 藍牙設備管理
export interface BluetoothDeviceInfo {
  id: string
  name: string
  address: string
  rssi: number
  deviceClass: number
  isVRDevice: boolean
  isPaired: boolean
  isConnected: boolean
  services: string[]
}

class BluetoothService {
  private isScanning = false
  private discoveredDevices = new Map<string, BluetoothDeviceInfo>()

  async isBluetoothAvailable(): Promise<boolean> {
    if (!navigator.bluetooth) {
      console.warn("Web Bluetooth API not supported")
      return false
    }

    try {
      const availability = await navigator.bluetooth.getAvailability()
      return availability
    } catch (error) {
      console.error("Bluetooth availability check failed:", error)
      return false
    }
  }

  async scanForBluetoothDevices(): Promise<BluetoothDeviceInfo[]> {
    if (this.isScanning) {
      throw new Error("Bluetooth scan already in progress")
    }

    const isAvailable = await this.isBluetoothAvailable()
    if (!isAvailable) {
      throw new Error("Bluetooth not available")
    }

    this.isScanning = true
    this.discoveredDevices.clear()

    try {
      // 使用 Web Bluetooth API 掃描設備
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "device_information", "generic_access", "generic_attribute"],
      })

      if (device) {
        const deviceInfo: BluetoothDeviceInfo = {
          id: device.id,
          name: device.name || "Unknown Device",
          address: device.id, // Web Bluetooth doesn't expose MAC address
          rssi: -50, // Simulated RSSI
          deviceClass: 0,
          isVRDevice: this.isVRDevice(device.name || ""),
          isPaired: false,
          isConnected: device.gatt?.connected || false,
          services: [],
        }

        this.discoveredDevices.set(device.id, deviceInfo)
      }

      // 模擬發現更多設備
      await this.simulateDeviceDiscovery()

      return Array.from(this.discoveredDevices.values())
    } catch (error) {
      console.error("Bluetooth scan failed:", error)
      // 如果用戶取消或出錯，返回模擬設備
      return this.getSimulatedBluetoothDevices()
    } finally {
      this.isScanning = false
    }
  }

  private async simulateDeviceDiscovery(): Promise<void> {
    // 模擬發現一些VR設備
    const simulatedDevices = [
      {
        id: "bt_quest_001",
        name: "Meta Quest 3",
        address: "00:1A:2B:3C:4D:5E",
        rssi: -45,
        deviceClass: 0x240404,
        isVRDevice: true,
        isPaired: false,
        isConnected: false,
        services: ["battery_service", "device_information"],
      },
      {
        id: "bt_pico_001",
        name: "PICO 4",
        address: "00:1A:2B:3C:4D:5F",
        rssi: -52,
        deviceClass: 0x240404,
        isVRDevice: true,
        isPaired: false,
        isConnected: false,
        services: ["battery_service"],
      },
    ]

    for (const device of simulatedDevices) {
      this.discoveredDevices.set(device.id, device)
    }
  }

  private getSimulatedBluetoothDevices(): BluetoothDeviceInfo[] {
    return [
      {
        id: "bt_quest_sim",
        name: "Meta Quest 3 (模擬)",
        address: "00:1A:2B:3C:4D:5E",
        rssi: -45,
        deviceClass: 0x240404,
        isVRDevice: true,
        isPaired: false,
        isConnected: false,
        services: ["battery_service", "device_information"],
      },
      {
        id: "bt_pico_sim",
        name: "PICO 4 (模擬)",
        address: "00:1A:2B:3C:4D:5F",
        rssi: -52,
        deviceClass: 0x240404,
        isVRDevice: true,
        isPaired: false,
        isConnected: false,
        services: ["battery_service"],
      },
      {
        id: "bt_phone_sim",
        name: "iPhone 15",
        address: "00:1A:2B:3C:4D:60",
        rssi: -38,
        deviceClass: 0x200404,
        isVRDevice: false,
        isPaired: true,
        isConnected: false,
        services: ["generic_access"],
      },
    ]
  }

  private isVRDevice(deviceName: string): boolean {
    const vrKeywords = ["quest", "vive", "pico", "oculus", "valve", "index", "varjo"]
    return vrKeywords.some((keyword) => deviceName.toLowerCase().includes(keyword))
  }

  async connectToBluetoothDevice(deviceId: string): Promise<boolean> {
    try {
      const device = this.discoveredDevices.get(deviceId)
      if (!device) {
        throw new Error("Device not found")
      }

      // 模擬連接過程
      await new Promise((resolve) => setTimeout(resolve, 2000))

      device.isConnected = true
      device.isPaired = true
      this.discoveredDevices.set(deviceId, device)

      return true
    } catch (error) {
      console.error("Bluetooth connection failed:", error)
      return false
    }
  }
}

export const bluetoothService = new BluetoothService()
