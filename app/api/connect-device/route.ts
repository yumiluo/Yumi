import { NextResponse } from 'next/server'

// 設備連接管理器
class DeviceConnectionManager {
  private connectedDevices = new Map()

  // 連接設備
  async connectDevice(deviceInfo: any) {
    try {
      const deviceId = deviceInfo.id || `device_${Date.now()}`
      
      const device = {
        id: deviceId,
        name: deviceInfo.name || 'Unknown Device',
        type: deviceInfo.type || 'unknown',
        ip: deviceInfo.ip,
        mac: deviceInfo.mac,
        status: 'connecting',
        capabilities: deviceInfo.capabilities || [],
        connectionMethod: deviceInfo.connectionMethod || 'manual',
        lastSeen: new Date().toISOString(),
        connectionTime: new Date().toISOString(),
        metadata: deviceInfo.metadata || {}
      }

      // 測試設備連接
      const isReachable = await this.testDeviceReachability(device)
      
      if (isReachable) {
        device.status = 'connected'
        this.connectedDevices.set(deviceId, device)
        
        return {
          success: true,
          device: device,
          message: '設備連接成功'
        }
      } else {
        device.status = 'failed'
        return {
          success: false,
          error: '設備不可達'
        }
      }
    } catch (error) {
      return {
        success: false,
        error: '連接失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      }
    }
  }

  // 斷開設備
  async disconnectDevice(deviceId: string) {
    const device = this.connectedDevices.get(deviceId)
    if (device) {
      device.status = 'disconnected'
      device.disconnectionTime = new Date().toISOString()
      this.connectedDevices.delete(deviceId)
      
      return {
        success: true,
        message: '設備斷開成功'
      }
    }
    
    return {
      success: false,
      error: '設備不存在'
    }
  }

  // 獲取已連接設備
  getConnectedDevices() {
    return Array.from(this.connectedDevices.values())
  }

  // 測試設備可達性
  private async testDeviceReachability(device: any) {
    try {
      if (device.ip) {
        // 測試IP連接
        const response = await fetch(`https://dns.google/resolve?name=${device.ip}`, {
          signal: AbortSignal.timeout(3000)
        })
        return response.ok
      } else if (device.url) {
        // 測試URL連接
        const response = await fetch(device.url, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000)
        })
        return response.ok
      }
      return true // 如果沒有IP或URL，假設可以連接
    } catch (error) {
      return false
    }
  }
}

// 創建連接管理器實例
const connectionManager = new DeviceConnectionManager()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, deviceInfo, deviceId } = body

    switch (action) {
      case 'connect':
        if (!deviceInfo) {
          return NextResponse.json(
            { success: false, error: '缺少設備信息' },
            { status: 400 }
          )
        }
        
        const connectResult = await connectionManager.connectDevice(deviceInfo)
        return NextResponse.json(connectResult)

      case 'disconnect':
        if (!deviceId) {
          return NextResponse.json(
            { success: false, error: '缺少設備ID' },
            { status: 400 }
          )
        }
        
        const disconnectResult = await connectionManager.disconnectDevice(deviceId)
        return NextResponse.json(disconnectResult)

      case 'list':
        const connectedDevices = connectionManager.getConnectedDevices()
        return NextResponse.json({
          success: true,
          devices: connectedDevices,
          count: connectedDevices.length
        })

      default:
        return NextResponse.json(
          { success: false, error: '無效的操作' },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: '操作失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const connectedDevices = connectionManager.getConnectedDevices()
    
    return NextResponse.json({
      success: true,
      devices: connectedDevices,
      count: connectedDevices.length,
      message: `當前已連接 ${connectedDevices.length} 個設備`
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: '獲取連接設備列表失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}
