import { EventEmitter } from 'events'
import websocketManager from './websocket-manager'

export interface Device {
  id: string
  name: string
  type: 'vr' | 'mobile' | 'desktop' | 'tablet'
  ip?: string
  macAddress?: string
  status: 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'error'
  capabilities: string[]
  batteryLevel?: number
  lastSeen: Date
  connectionMethod: 'bluetooth' | 'wifi' | 'usb' | 'qr'
  metadata?: Record<string, any>
}

export interface DeviceScanOptions {
  timeout?: number
  methods?: ('bluetooth' | 'wifi' | 'usb' | 'qr')[]
  filterTypes?: string[]
}

export interface ConnectionResult {
  success: boolean
  device: Device
  error?: string
  connectionId?: string
}

export class EnhancedDeviceManager extends EventEmitter {
  private devices: Map<string, Device> = new Map()
  private activeConnections: Map<string, Device> = new Map()
  private scanInProgress = false
  private connectionPool = new Map<string, WebSocket>()
  private deviceCapabilities = new Map<string, Set<string>>()

  constructor() {
    super()
    this.initializeWebSocket()
    this.setupEventHandlers()
  }

  // 初始化WebSocket連接
  private initializeWebSocket(): void {
    websocketManager.on('connected', () => {
      this.emit('websocketConnected')
      this.syncDeviceStates()
    })

    websocketManager.on('disconnected', () => {
      this.emit('websocketDisconnected')
    })

    websocketManager.on('deviceDiscovered', (deviceData: any) => {
      this.addDevice(deviceData)
    })

    websocketManager.on('deviceStatusChanged', (data: any) => {
      this.updateDeviceStatus(data.deviceId, data.status, data.metadata)
    })
  }

  // 設置事件處理器
  private setupEventHandlers(): void {
    // 處理設備相關的WebSocket消息
    websocketManager.on('message', (message: any) => {
      switch (message.type) {
        case 'deviceList':
          this.updateDeviceList(message.data)
          break
        case 'deviceUpdate':
          this.updateDevice(message.data)
          break
        case 'deviceRemoved':
          this.removeDevice(message.data.deviceId)
          break
      }
    })
  }

  // 掃描設備
  async scanDevices(options: DeviceScanOptions = {}): Promise<Device[]> {
    if (this.scanInProgress) {
      throw new Error('Device scan already in progress')
    }

    this.scanInProgress = true
    this.emit('scanStarted')

    try {
      const scanResult = await websocketManager.sendWithResponse('scanDevices', {
        methods: options.methods || ['wifi', 'bluetooth'],
        timeout: options.timeout || 10000,
        filterTypes: options.filterTypes
      })

      if (scanResult.success) {
        this.updateDeviceList(scanResult.devices)
        this.emit('scanCompleted', scanResult.devices)
        return scanResult.devices
      } else {
        throw new Error(scanResult.error || 'Device scan failed')
      }
    } catch (error) {
      this.emit('scanError', error)
      throw error
    } finally {
      this.scanInProgress = false
      this.emit('scanStopped')
    }
  }

  // 連接設備
  async connectDevice(deviceId: string): Promise<ConnectionResult> {
    const device = this.devices.get(deviceId)
    if (!device) {
      return {
        success: false,
        device: {} as Device,
        error: 'Device not found'
      }
    }

    if (device.status === 'connected') {
      return {
        success: true,
        device,
        connectionId: deviceId
      }
    }

    try {
      this.updateDeviceStatus(deviceId, 'connecting')
      
      const result = await websocketManager.sendWithResponse('connectDevice', {
        deviceId,
        deviceType: device.type,
        connectionMethod: device.connectionMethod
      })

      if (result.success) {
        this.updateDeviceStatus(deviceId, 'connected')
        this.activeConnections.set(deviceId, device)
        this.emit('deviceConnected', device)
        
        return {
          success: true,
          device,
          connectionId: result.connectionId
        }
      } else {
        this.updateDeviceStatus(deviceId, 'error')
        return {
          success: false,
          device,
          error: result.error
        }
      }
    } catch (error) {
      this.updateDeviceStatus(deviceId, 'error')
      return {
        success: false,
        device,
        error: error instanceof Error ? error.message : 'Connection failed'
      }
    }
  }

  // 斷開設備連接
  async disconnectDevice(deviceId: string): Promise<boolean> {
    const device = this.devices.get(deviceId)
    if (!device || device.status !== 'connected') {
      return false
    }

    try {
      const result = await websocketManager.sendWithResponse('disconnectDevice', {
        deviceId,
        connectionId: this.activeConnections.get(deviceId)?.id
      })

      if (result.success) {
        this.updateDeviceStatus(deviceId, 'disconnected')
        this.activeConnections.delete(deviceId)
        this.emit('deviceDisconnected', device)
        return true
      }
      return false
    } catch (error) {
      console.error('Disconnect device error:', error)
      return false
    }
  }

  // 獲取設備列表
  getDevices(): Device[] {
    return Array.from(this.devices.values())
  }

  // 獲取已連接的設備
  getConnectedDevices(): Device[] {
    return Array.from(this.activeConnections.values())
  }

  // 獲取設備狀態
  getDeviceStatus(deviceId: string): string | null {
    const device = this.devices.get(deviceId)
    return device?.status || null
  }

  // 添加設備
  private addDevice(deviceData: any): void {
    const device: Device = {
      id: deviceData.id,
      name: deviceData.name,
      type: deviceData.type,
      ip: deviceData.ip,
      macAddress: deviceData.macAddress,
      status: 'discovered',
      capabilities: deviceData.capabilities || [],
      batteryLevel: deviceData.batteryLevel,
      lastSeen: new Date(),
      connectionMethod: deviceData.connectionMethod,
      metadata: deviceData.metadata
    }

    this.devices.set(device.id, device)
    this.emit('deviceAdded', device)
  }

  // 更新設備
  private updateDevice(deviceData: any): void {
    const existingDevice = this.devices.get(deviceData.id)
    if (existingDevice) {
      const updatedDevice = { ...existingDevice, ...deviceData }
      this.devices.set(deviceData.id, updatedDevice)
      this.emit('deviceUpdated', updatedDevice)
    }
  }

  // 更新設備狀態
  private updateDeviceStatus(deviceId: string, status: Device['status'], metadata?: any): void {
    const device = this.devices.get(deviceId)
    if (device) {
      device.status = status
      device.lastSeen = new Date()
      if (metadata) {
        device.metadata = { ...device.metadata, ...metadata }
      }
      
      this.devices.set(deviceId, device)
      this.emit('deviceStatusChanged', { deviceId, status, device })
    }
  }

  // 移除設備
  private removeDevice(deviceId: string): void {
    const device = this.devices.get(deviceId)
    if (device) {
      this.devices.delete(deviceId)
      this.activeConnections.delete(deviceId)
      this.emit('deviceRemoved', device)
    }
  }

  // 更新設備列表
  private updateDeviceList(devices: Device[]): void {
    devices.forEach(deviceData => {
      this.addDevice(deviceData)
    })
  }

  // 同步設備狀態
  private async syncDeviceStates(): Promise<void> {
    try {
      const result = await websocketManager.sendWithResponse('getDeviceStates', {})
      if (result.success) {
        result.devices.forEach((deviceData: any) => {
          this.updateDevice(deviceData)
        })
      }
    } catch (error) {
      console.error('Failed to sync device states:', error)
    }
  }

  // 獲取設備能力
  getDeviceCapabilities(deviceId: string): string[] {
    return Array.from(this.deviceCapabilities.get(deviceId) || [])
  }

  // 檢查設備是否支持特定功能
  deviceSupports(deviceId: string, capability: string): boolean {
    const capabilities = this.deviceCapabilities.get(deviceId)
    return capabilities?.has(capability) || false
  }

  // 獲取連接統計
  getConnectionStats(): {
    totalDevices: number
    connectedDevices: number
    disconnectedDevices: number
    errorDevices: number
  } {
    const devices = Array.from(this.devices.values())
    return {
      totalDevices: devices.length,
      connectedDevices: devices.filter(d => d.status === 'connected').length,
      disconnectedDevices: devices.filter(d => d.status === 'disconnected').length,
      errorDevices: devices.filter(d => d.status === 'error').length
    }
  }

  // 清理離線設備
  cleanupOfflineDevices(timeoutMinutes = 5): void {
    const now = new Date()
    const timeoutMs = timeoutMinutes * 60 * 1000

    this.devices.forEach((device, deviceId) => {
      if (now.getTime() - device.lastSeen.getTime() > timeoutMs) {
        this.removeDevice(deviceId)
      }
    })
  }

  // 重置管理器
  reset(): void {
    this.devices.clear()
    this.activeConnections.clear()
    this.connectionPool.clear()
    this.deviceCapabilities.clear()
    this.scanInProgress = false
    this.emit('reset')
  }
}

// 創建單例實例
export const enhancedDeviceManager = new EnhancedDeviceManager()
export default enhancedDeviceManager


