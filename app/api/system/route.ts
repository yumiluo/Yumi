import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const systemInfo = {
      platform: 'vercel',
      timestamp: new Date().toISOString(),
      status: 'healthy',
      services: {
        api: 'running',
        database: 'connected',
        websocket: 'simulated'
      },
      endpoints: {
        devices: '/api/devices',
        websocket: '/api/websocket',
        health: '/api/health',
        system: '/api/system'
      },
      version: '1.0.0',
      environment: 'production'
    }

    return NextResponse.json(systemInfo)
  } catch (error) {
    return NextResponse.json(
      { error: '獲取系統信息失敗' },
      { status: 500 }
    )
  }
}
