import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const systemInfo = {
      platform: 'vercel_frontend',
      timestamp: new Date().toISOString(),
      status: 'requires_local_servers',
      note: '100%真實數據系統，無模擬功能',
      required_services: {
        deviceScanner: 'localhost:3002',
        vrBackend: 'localhost:3001',
        websocket: 'localhost:3001'
      },
      services: {
        api: 'running',
        database: 'requires_local',
        websocket: 'requires_local'
      },
      endpoints: {
        devices: '/api/devices',
        websocket: '/api/websocket',
        health: '/api/health',
        system: '/api/system'
      },
      version: '2.0.0',
      environment: 'production_frontend',
      data_policy: 'real_data_only',
      no_mock_data: true
    }

    return NextResponse.json(systemInfo)
  } catch (error) {
    return NextResponse.json(
      { 
        error: '獲取系統信息失敗',
        note: '本系統只允許真實數據'
      },
      { status: 500 }
    )
  }
}
