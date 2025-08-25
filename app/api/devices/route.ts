import { NextResponse } from 'next/server'

// 模擬設備數據
const mockDevices = [
  {
    id: 'vr_headset_001',
    name: 'VR Headset Pro',
    type: 'vr',
    ip: '192.168.1.100',
    status: 'discovered',
    capabilities: ['vr', '360_video', 'spatial_audio'],
    connectionMethod: 'wifi',
    lastSeen: new Date().toISOString()
  },
  {
    id: 'mobile_vr_001',
    name: 'Mobile VR Device',
    type: 'mobile',
    ip: '192.168.1.101',
    status: 'discovered',
    capabilities: ['mobile_vr', 'touch', 'gyroscope'],
    connectionMethod: 'bluetooth',
    lastSeen: new Date().toISOString()
  }
]

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      devices: mockDevices,
      message: '設備列表獲取成功'
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '獲取設備列表失敗' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, deviceId, connectionMethod } = body

    switch (action) {
      case 'scan':
        // 模擬掃描設備
        await new Promise(resolve => setTimeout(resolve, 2000))
        return NextResponse.json({
          success: true,
          devices: mockDevices,
          message: '設備掃描完成'
        })

      case 'connect':
        // 模擬連接設備
        const device = mockDevices.find(d => d.id === deviceId)
        if (device) {
          device.status = 'connected'
          return NextResponse.json({
            success: true,
            device,
            message: '設備連接成功'
          })
        }
        return NextResponse.json(
          { success: false, error: '設備不存在' },
          { status: 404 }
        )

      case 'disconnect':
        // 模擬斷開設備
        const deviceToDisconnect = mockDevices.find(d => d.id === deviceId)
        if (deviceToDisconnect) {
          deviceToDisconnect.status = 'disconnected'
          return NextResponse.json({
            success: true,
            message: '設備斷開成功'
          })
        }
        return NextResponse.json(
          { success: false, error: '設備不存在' },
          { status: 404 }
        )

      default:
        return NextResponse.json(
          { success: false, error: '無效的操作' },
          { status: 400 }
        )
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '操作失敗' },
      { status: 500 }
    )
  }
}
