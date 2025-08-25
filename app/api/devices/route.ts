import { NextResponse } from 'next/server'

// 智能API選擇器
async function getDeviceData(action: string, deviceId?: string, connectionMethod?: string) {
  // 嘗試連接到本地掃描服務器
  try {
    const localScannerUrl = 'http://localhost:3002'
    
    if (action === 'scan') {
      const response = await fetch(`${localScannerUrl}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, methods: ['wifi', 'bluetooth', 'usb', 'network'] })
      })
      
      if (response.ok) {
        const result = await response.json()
        return { success: true, data: result, source: 'local' }
      }
    } else if (action === 'connect' || action === 'disconnect') {
      const response = await fetch(`${localScannerUrl}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deviceId, connectionMethod })
      })
      
      if (response.ok) {
        const result = await response.json()
        return { success: true, data: result, source: 'local' }
      }
    } else {
      const response = await fetch(`${localScannerUrl}/api/devices`)
      if (response.ok) {
        const result = await response.json()
        return { success: true, data: result, source: 'local' }
      }
    }
  } catch (error) {
    console.log('本地掃描服務器不可用，使用模擬數據')
  }

  // 如果本地服務器不可用，返回模擬數據
  return { success: true, data: getMockData(action, deviceId), source: 'mock' }
}

// 模擬數據生成器
function getMockData(action: string, deviceId?: string) {
  const mockDevices = [
    {
      id: 'network_router_001',
      name: 'WiFi Router',
      type: 'network',
      ip: '192.168.1.1',
      mac: 'AA:BB:CC:DD:EE:FF',
      status: 'discovered',
      capabilities: ['network', 'internet', 'wifi'],
      connectionMethod: 'wifi',
      lastSeen: new Date().toISOString()
    },
    {
      id: 'bluetooth_headphones_001',
      name: 'Wireless Headphones',
      type: 'bluetooth',
      mac: '11:22:33:44:55:66',
      status: 'discovered',
      capabilities: ['bluetooth', 'audio', 'wireless'],
      connectionMethod: 'bluetooth',
      lastSeen: new Date().toISOString()
    },
    {
      id: 'usb_keyboard_001',
      name: 'USB Keyboard',
      type: 'usb',
      status: 'discovered',
      capabilities: ['usb', 'input', 'data_transfer'],
      connectionMethod: 'usb',
      lastSeen: new Date().toISOString()
    },
    {
      id: 'wifi_network_001',
      name: 'Home WiFi',
      type: 'wifi',
      signal: '-45 dBm',
      security: 'WPA2',
      status: 'discovered',
      capabilities: ['wifi', 'internet', 'secure'],
      connectionMethod: 'wifi',
      lastSeen: new Date().toISOString()
    }
  ]

  switch (action) {
    case 'scan':
      return {
        success: true,
        devices: mockDevices,
        message: `掃描完成，發現 ${mockDevices.length} 個設備 (模擬模式)`,
        scanTime: new Date().toISOString(),
        note: '本地掃描服務器未運行，顯示模擬數據'
      }
    
    case 'connect':
      const deviceToConnect = mockDevices.find(d => d.id === deviceId)
      if (deviceToConnect) {
        deviceToConnect.status = 'connected'
        return {
          success: true,
          device: deviceToConnect,
          message: '設備連接成功 (模擬模式)',
          note: '本地掃描服務器未運行，使用模擬連接'
        }
      }
      return { success: false, error: '設備不存在' }
    
    case 'disconnect':
      const deviceToDisconnect = mockDevices.find(d => d.id === deviceId)
      if (deviceToDisconnect) {
        deviceToDisconnect.status = 'disconnected'
        return {
          success: true,
          message: '設備斷開成功 (模擬模式)',
          note: '本地掃描服務器未運行，使用模擬斷開'
        }
      }
      return { success: false, error: '設備不存在' }
    
    default:
      return {
        success: true,
        devices: mockDevices,
        message: `發現 ${mockDevices.length} 個設備 (模擬模式)`,
        scanTime: new Date().toISOString(),
        note: '本地掃描服務器未運行，顯示模擬數據'
      }
  }
}

export async function GET() {
  try {
    const result = await getDeviceData('list')
    
    return NextResponse.json({
      success: true,
      devices: result.data.devices || result.data,
      message: result.data.message || '設備列表獲取成功',
      scanTime: result.data.scanTime || new Date().toISOString(),
      source: result.source,
      note: result.data.note || ''
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: '獲取設備列表失敗',
        details: error instanceof Error ? error.message : '未知錯誤'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, deviceId, connectionMethod } = body

    const result = await getDeviceData(action, deviceId, connectionMethod)
    
    if (result.success) {
      return NextResponse.json({
        ...result.data,
        source: result.source,
        note: result.data.note || ''
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.data.error || '操作失敗' },
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
