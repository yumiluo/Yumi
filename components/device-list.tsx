"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Monitor, 
  Smartphone, 
  Network, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Wifi,
  QrCode,
  Clock,
  Signal
} from 'lucide-react'
import { io, Socket } from 'socket.io-client'

export interface ConnectedDevice {
  id: string
  name: string
  type: 'vr' | 'mobile' | 'desktop' | 'unknown'
  model: string
  connectionMethod: 'wifi' | 'qr' | 'network'
  status: 'connected' | 'disconnected' | 'playing' | 'paused' | 'error'
  lastSeen: string
  ip?: string
  port?: number
  responseTime?: number
}

interface DeviceListProps {
  sessionCode?: string
  onDeviceConnected?: (device: ConnectedDevice) => void
  onDeviceDisconnected?: (deviceId: string) => void
}

export const DeviceList: React.FC<DeviceListProps> = ({
  sessionCode,
  onDeviceConnected,
  onDeviceDisconnected
}) => {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [devices, setDevices] = useState<ConnectedDevice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 初始化Socket.io連接
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['polling', 'websocket'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true
    })

    newSocket.on('connect', () => {
      console.log('🔌 設備列表已連接到Socket.io服務器')
      setIsConnected(true)
      setError(null)
      setIsLoading(false)
      
      // 連接成功後，如果有會話代碼，自動獲取設備列表
      if (sessionCode) {
        console.log('📱 自動獲取會話設備列表:', sessionCode)
        newSocket.emit('get-session-devices', { sessionCode })
      }
    })

    newSocket.on('disconnect', () => {
      console.log('🔌 設備列表與Socket.io服務器斷開連接')
      setIsConnected(false)
      setError('與服務器斷開連接')
    })

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.io連接錯誤:', error)
      setError(`連接錯誤: ${error.message}`)
      setIsLoading(false)
    })

    // 監聽設備加入事件
    newSocket.on('device-joined', (data) => {
      console.log('📱 收到設備加入事件:', data)
      
      const newDevice: ConnectedDevice = {
        id: data.deviceId,
        name: data.deviceName || 'Unknown Device',
        type: data.deviceType || 'unknown',
        model: data.deviceModel || 'Unknown Model',
        connectionMethod: data.connectionMethod || 'network',
        status: 'connected',
        lastSeen: new Date().toLocaleString(),
        ip: data.ip,
        port: data.port,
        responseTime: data.responseTime
      }

      setDevices(prev => {
        // 檢查設備是否已存在
        const existingIndex = prev.findIndex(d => d.id === newDevice.id)
        if (existingIndex >= 0) {
          // 更新現有設備
          const updated = [...prev]
          updated[existingIndex] = { ...updated[existingIndex], ...newDevice }
          return updated
        } else {
          // 添加新設備
          return [...prev, newDevice]
        }
      })

      // 通知父組件
      onDeviceConnected?.(newDevice)
    })

    // 監聽設備離開事件
    newSocket.on('device-left', (data) => {
      console.log('📱 收到設備離開事件:', data)
      
      setDevices(prev => {
        const updated = prev.filter(d => d.id !== data.deviceId)
        return updated
      })

      // 通知父組件
      onDeviceDisconnected?.(data.deviceId)
    })

    // 監聽會話狀態更新
    newSocket.on('session-state', (data) => {
      console.log('📊 收到會話狀態更新:', data)
      // 可以根據需要更新會話相關信息
    })

    // 監聽會話設備列表
    newSocket.on('session-devices', (data) => {
      console.log('📱 收到會話設備列表:', data)
      
      if (data.devices && Array.isArray(data.devices)) {
        const deviceList: ConnectedDevice[] = data.devices.map((device: any) => ({
          id: device.deviceId,
          name: device.deviceName || 'Unknown Device',
          type: device.deviceType || 'unknown',
          model: device.deviceModel || 'Unknown Model',
          connectionMethod: device.connectionMethod || 'network',
          status: device.status || 'connected',
          lastSeen: new Date(device.lastSeen).toLocaleString(),
          ip: device.ip,
          port: device.port,
          responseTime: device.responseTime
        }))
        
        setDevices(deviceList)
      }
    })

    setSocket(newSocket)

    // 清理函數
    return () => {
      newSocket.close()
    }
  }, [onDeviceConnected, onDeviceDisconnected, sessionCode])

  // 當會話代碼變化時，重新獲取設備列表
  useEffect(() => {
    if (socket && isConnected && sessionCode) {
      console.log('📱 會話代碼變化，重新獲取設備列表:', sessionCode)
      socket.emit('get-session-devices', { sessionCode })
    }
  }, [socket, isConnected, sessionCode])

  // 獲取設備類型圖標
  const getDeviceIcon = (device: ConnectedDevice) => {
    switch (device.type) {
      case 'vr':
        return <Monitor className="h-5 w-5 text-blue-600" />
      case 'mobile':
        return <Smartphone className="h-5 w-5 text-green-600" />
      case 'desktop':
        return <Network className="h-5 w-5 text-purple-600" />
      default:
        return <Network className="h-5 w-5 text-gray-600" />
    }
  }

  // 獲取連接方法標籤
  const getConnectionMethodBadge = (method: string) => {
    switch (method) {
      case 'wifi':
        return <Badge variant="outline" className="border-blue-200 text-blue-700">Wi-Fi</Badge>
      case 'qr':
        return <Badge variant="outline" className="border-green-200 text-green-700">QR碼</Badge>
      case 'network':
        return <Badge variant="outline" className="border-purple-200 text-purple-700">網絡</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  // 獲取設備狀態標籤
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">已連接</Badge>
      case 'disconnected':
        return <Badge variant="destructive">已斷開</Badge>
      case 'playing':
        return <Badge variant="default" className="bg-blue-600">播放中</Badge>
      case 'paused':
        return <Badge variant="outline">已暫停</Badge>
      case 'error':
        return <Badge variant="destructive">錯誤</Badge>
      default:
        return <Badge variant="outline">未知</Badge>
    }
  }

  // 獲取設備顯示名稱（包含型號）
  const getDeviceDisplayName = (device: ConnectedDevice) => {
    if (device.model && device.model !== 'Unknown Model') {
      return `${device.name} (${device.model})`
    }
    return device.name
  }

  // 獲取響應時間顏色
  const getResponseTimeColor = (responseTime?: number) => {
    if (!responseTime) return 'text-gray-600'
    if (responseTime < 100) return 'text-green-600'
    if (responseTime < 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 手動刷新設備列表
  const refreshDeviceList = () => {
    if (socket && sessionCode) {
      socket.emit('get-session-devices', { sessionCode })
    }
  }

  // 斷開設備連接
  const disconnectDevice = (deviceId: string) => {
    if (socket && sessionCode) {
      socket.emit('disconnect-device', { sessionCode, deviceId })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">正在連接設備管理服務...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          無法連接到設備管理服務。請檢查網絡連接和後端服務狀態。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* 連接狀態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Signal className="h-5 w-5" />
            設備管理狀態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                {isConnected ? '已連接' : '未連接'}
              </span>
            </div>
            <Button
              onClick={refreshDeviceList}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              刷新列表
            </Button>
          </div>
          {sessionCode && (
            <div className="mt-2 text-sm text-gray-600">
              當前會話: {sessionCode}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 錯誤提示 */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* 已連接設備列表 */}
      {devices.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              已連接設備 ({devices.length})
            </CardTitle>
            <CardDescription>
              當前會話中連接的真實設備
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device)}
                    <div>
                      <div className="font-medium text-green-800">
                        {getDeviceDisplayName(device)}
                      </div>
                      <div className="text-sm text-green-700">
                        連接方式: {device.connectionMethod === 'wifi' ? 'Wi-Fi' : 
                                   device.connectionMethod === 'qr' ? 'QR碼' : '網絡'}
                      </div>
                      {device.ip && device.port && (
                        <div className="text-xs text-green-600">
                          {device.ip}:{device.port}
                        </div>
                      )}
                      {device.responseTime && (
                        <div className="flex items-center gap-1 text-xs">
                          <Signal className={`h-3 w-3 ${getResponseTimeColor(device.responseTime)}`} />
                          <span className={getResponseTimeColor(device.responseTime)}>
                            {device.responseTime}ms
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getConnectionMethodBadge(device.connectionMethod)}
                    {getStatusBadge(device.status)}
                    <div className="text-xs text-green-600">
                      {device.lastSeen}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectDevice(device.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      斷開
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                無設備連接
              </h3>
              <p className="text-yellow-700 mb-4">
                還沒有設備加入會話。請使用Wi-Fi掃描或QR碼掃描來邀請設備加入。
              </p>
              <div className="text-sm text-yellow-600 space-y-1">
                <p>• 確保設備在同一Wi-Fi網絡中</p>
                <p>• 後端服務必須在端口5001運行</p>
                <p>• 支持VR頭顯和手機設備</p>
                <p>• 設備會自動顯示在此列表中</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 連接說明 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Wifi className="h-5 w-5" />
            設備連接說明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Wi-Fi連接：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>使用Wi-Fi掃描發現同一網絡中的設備</li>
              <li>設備會自動加入當前會話</li>
              <li>支持VR頭顯、手機、桌面設備</li>
            </ul>
            
            <p className="mt-3"><strong>QR碼連接：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>掃描會話QR碼快速加入</li>
              <li>適用於所有支持相機的設備</li>
              <li>無需手動配置網絡</li>
            </ul>
            
            <p className="mt-3"><strong>實時同步：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>設備列表實時更新</li>
              <li>自動顯示設備類型和型號</li>
              <li>支持設備狀態監控</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
