import { NextResponse } from 'next/server'

// 只允許真實數據的API
async function getRealDeviceData(action: string, deviceId?: string, connectionMethod?: string) {
  // 必須連接到本地掃描服務器
  const localScannerUrl = 'http://localhost:3002'
  
  try {
    if (action === 'scan') {
      const response = await fetch(`${localScannerUrl}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, methods: ['wifi', 'bluetooth', 'usb', 'network'] })
      })
      
      if (response.ok) {
        const result = await response.json()
        return { success: true, data: result, source: 'real' }
      } else {
        throw new Error(`掃描請求失敗: ${response.status}`)
      }
    } else if (action === 'connect' || action === 'disconnect') {
      const response = await fetch(`${localScannerUrl}/api/devices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, deviceId, connectionMethod })
      })
      
      if (response.ok) {
        const result = await response.json()
        return { success: true, data: result, source: 'real' }
      } else {
        throw new Error(`${action}請求失敗: ${response.status}`)
      }
    } else {
      const response = await fetch(`${localScannerUrl}/api/devices`)
      if (response.ok) {
        const result = await response.json()
        return { success: true, data: result, source: 'real' }
      } else {
        throw new Error(`獲取設備列表失敗: ${response.status}`)
      }
    }
  } catch (error) {
    console.error('本地掃描服務器連接失敗:', error)
    throw new Error('本地掃描服務器不可用，無法獲取真實設備數據')
  }
}

export async function GET() {
  try {
    const result = await getRealDeviceData('list')
    
    return NextResponse.json({
      success: true,
      devices: result.data.devices || result.data,
      message: result.data.message || '設備列表獲取成功',
      scanTime: result.data.scanTime || new Date().toISOString(),
      source: result.source,
      note: '100%真實數據，來自本地掃描服務器'
    })
  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: '無法獲取真實設備數據',
        details: error instanceof Error ? error.message : '未知錯誤',
        solution: '請確保本地掃描服務器正在運行 (npm run scanner)',
        note: '本系統不允許使用任何虛擬數據'
      },
      { status: 503 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, deviceId, connectionMethod } = body

    const result = await getRealDeviceData(action, deviceId, connectionMethod)
    
    if (result.success) {
      return NextResponse.json({
        ...result.data,
        source: result.source,
        note: '100%真實數據，來自本地掃描服務器'
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
        error: '無法執行操作',
        details: error instanceof Error ? error.message : '未知錯誤',
        solution: '請確保本地掃描服務器正在運行 (npm run scanner)',
        note: '本系統不允許使用任何虛擬數據'
      },
      { status: 503 }
    )
  }
}
