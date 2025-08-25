import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WebSocket模擬API',
    endpoints: {
      devices: '/api/devices',
      health: '/api/health',
      system: '/api/system'
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, data } = body

    // 模擬WebSocket消息處理
    switch (type) {
      case 'heartbeat':
        return NextResponse.json({
          success: true,
          type: 'heartbeat',
          timestamp: Date.now(),
          serverTime: new Date().toISOString()
        })

      case 'scanDevices':
        // 模擬設備掃描
        await new Promise(resolve => setTimeout(resolve, 1000))
        return NextResponse.json({
          success: true,
          type: 'deviceList',
          devices: [
            {
              id: 'vr_headset_001',
              name: 'VR Headset Pro',
              type: 'vr',
              status: 'discovered'
            },
            {
              id: 'mobile_vr_001',
              name: 'Mobile VR Device',
              type: 'mobile',
              status: 'discovered'
            }
          ]
        })

      case 'connectDevice':
        return NextResponse.json({
          success: true,
          type: 'deviceStatusChanged',
          deviceId: data.deviceId,
          status: 'connected'
        })

      case 'disconnectDevice':
        return NextResponse.json({
          success: true,
          type: 'deviceStatusChanged',
          deviceId: data.deviceId,
          status: 'disconnected'
        })

      default:
        return NextResponse.json({
          success: false,
          error: '未知的消息類型'
        })
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: '消息處理失敗' },
      { status: 500 }
    )
  }
}
