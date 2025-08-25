import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'WebSocket真實API端點',
    endpoints: {
      devices: '/api/devices',
      health: '/api/health',
      system: '/api/system'
    },
    note: '100%真實數據，無模擬功能',
    websocketServer: 'ws://localhost:3001',
    status: 'requires_local_server'
  })
}

export async function POST(request: Request) {
  return NextResponse.json(
    { 
      success: false, 
      error: 'WebSocket模擬功能已禁用',
      note: '本系統只允許真實數據，請使用本地WebSocket服務器',
      solution: '啟動本地服務器: npm run vr'
    },
    { status: 501 }
  )
}
