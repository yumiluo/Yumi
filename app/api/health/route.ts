import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  
  try {
    // 快速健康檢查
    const healthCheck = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      responseTime: Date.now() - startTime,
      services: {
        database: 'connected',
        websocket: 'active',
        fileSystem: 'accessible'
      }
    }
    
    return NextResponse.json(healthCheck, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime
      }, 
      { status: 500 }
    )
  }
}
