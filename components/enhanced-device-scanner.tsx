"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Search, 
  Wifi, 
  Bluetooth, 
  Monitor, 
  Smartphone, 
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Zap
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Device {
  id: string
  name: string
  type: 'vr' | 'mobile' | 'desktop' | 'tablet'
  ip?: string
  macAddress?: string
  status: 'discovered' | 'connecting' | 'connected' | 'disconnected' | 'error'
  capabilities: string[]
  batteryLevel?: number
  lastSeen: Date
  connectionMethod: 'bluetooth' | 'wifi' | 'usb' | 'qr'
  metadata?: Record<string, any>
}

interface ScanProgress {
  isScanning: boolean
  progress: number
  currentMethod: string
  discoveredCount: number
  errorCount: number
}

export function EnhancedDeviceScanner() {
  const [devices, setDevices] = useState<Device[]>([])
  const [scanProgress, setScanProgress] = useState<ScanProgress>({
    isScanning: false,
    progress: 0,
    currentMethod: '',
    discoveredCount: 0,
    errorCount: 0
  })
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)

  // 初始化連接
  useEffect(() => {
    // 檢查API連接
    const checkConnection = async () => {
      try {
        const response = await fetch('/api/health')
        if (response.ok) {
          setConnectionStatus('connected')
          toast({
            title: "連接成功",
            description: "API連接已建立",
            variant: "default"
          })
        } else {
          setConnectionStatus('error')
        }
      } catch (error) {
        setConnectionStatus('error')
        toast({
          title: "連接失敗",
          description: "無法連接到API",
          variant: "destructive"
        })
      }
    }

    checkConnection()
  }, [])

  // 自動刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      if (connectionStatus === 'connected' && !scanProgress.isScanning) {
        refreshDevices()
      }
    }, 30000) // 30秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh, connectionStatus, scanProgress.isScanning])

  // 掃描設備
  const scanDevices = useCallback(async (methods: string[] = ['wifi', 'bluetooth']) => {
    if (scanProgress.isScanning) return

    try {
      setScanProgress(prev => ({ 
        ...prev, 
        isScanning: true, 
        progress: 0,
        currentMethod: methods.join(', '),
        discoveredCount: 0,
        errorCount: 0
      }))

      // 模擬掃描進度
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          if (prev.progress < 90) {
            return { ...prev, progress: prev.progress + 10 }
          }
          return prev
        })
      }, 200)

      // 調用API掃描設備
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'scan',
          methods: methods
        })
      })

      if (!response.ok) {
        throw new Error('掃描請求失敗')
      }

      const result = await response.json()
      const devices = result.devices || []

      clearInterval(progressInterval)
      setScanProgress(prev => ({ ...prev, progress: 100 }))

      // 更新設備列表
      setDevices(devices)

      toast({
        title: "掃描完成",
        description: `發現 ${devices.length} 個設備`,
        variant: "default"
      })

    } catch (error) {
      console.error('Device scan failed:', error)
      setScanProgress(prev => ({ 
        ...prev, 
        isScanning: false,
        errorCount: prev.errorCount + 1
      }))
      
      toast({
        title: "掃描失敗",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive"
      })
    } finally {
      setTimeout(() => {
        setScanProgress(prev => ({ ...prev, isScanning: false }))
      }, 1000)
    }
  }, [scanProgress.isScanning])

  // 連接設備
  const connectDevice = useCallback(async (deviceId: string) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'connect',
          deviceId: deviceId
        })
      })

      if (!response.ok) {
        throw new Error('連接請求失敗')
      }

      const result = await response.json()
      
      if (result.success) {
        // 更新本地設備狀態
        setDevices(prev => 
          prev.map(d => d.id === deviceId ? { ...d, status: 'connected' } : d)
        )
        
        toast({
          title: "連接成功",
          description: `${result.device.name} 已連接`,
          variant: "default"
        })
      } else {
        toast({
          title: "連接失敗",
          description: result.error || "無法連接到設備",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Device connection failed:', error)
      toast({
        title: "連接錯誤",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive"
      })
    }
  }, [])

  // 斷開設備
  const disconnectDevice = useCallback(async (deviceId: string) => {
    try {
      const response = await fetch('/api/devices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'disconnect',
          deviceId: deviceId
        })
      })

      if (!response.ok) {
        throw new Error('斷開請求失敗')
      }

      const result = await response.json()
      
      if (result.success) {
        // 更新本地設備狀態
        setDevices(prev => 
          prev.map(d => d.id === deviceId ? { ...d, status: 'disconnected' } : d)
        )
        
        toast({
          title: "斷開成功",
          description: "設備已斷開連接",
          variant: "default"
        })
      } else {
        toast({
          title: "斷開失敗",
          description: result.error || "無法斷開設備連接",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Device disconnection failed:', error)
      toast({
        title: "斷開錯誤",
        description: error instanceof Error ? error.message : "未知錯誤",
        variant: "destructive"
      })
    }
  }, [])

  // 刷新設備列表
  const refreshDevices = useCallback(async () => {
    try {
      const response = await fetch('/api/devices')
      if (response.ok) {
        const result = await response.json()
        setDevices(result.devices || [])
      }
    } catch (error) {
      console.error('Failed to refresh devices:', error)
    }
  }, [])

  // 過濾設備
  const filteredDevices = useMemo(() => {
    if (activeTab === 'all') return devices
    
    return devices.filter(device => {
      switch (activeTab) {
        case 'vr':
          return device.type === 'vr'
        case 'mobile':
          return device.type === 'mobile'
        case 'desktop':
          return device.type === 'desktop'
        case 'connected':
          return device.status === 'connected'
        case 'discovered':
          return device.status === 'discovered'
        default:
          return true
      }
    })
  }, [devices, activeTab])

  // 獲取連接統計
  const connectionStats = useMemo(() => {
    const totalDevices = devices.length
    const connectedDevices = devices.filter(d => d.status === 'connected').length
    const disconnectedDevices = devices.filter(d => d.status === 'disconnected').length
    const errorDevices = devices.filter(d => d.status === 'error').length

    return {
      totalDevices,
      connectedDevices,
      disconnectedDevices,
      errorDevices
    }
  }, [devices])

  // 獲取狀態圖標
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'connecting':
        return <Activity className="h-4 w-4 text-yellow-500 animate-pulse" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'discovered':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />
    }
  }

  // 獲取設備類型圖標
  const getDeviceTypeIcon = (type: string) => {
    switch (type) {
      case 'vr':
        return <Monitor className="h-4 w-4" />
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'desktop':
        return <Monitor className="h-4 w-4" />
      case 'tablet':
        return <Smartphone className="h-4 w-4" />
      default:
        return <Monitor className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* 連接狀態和掃描控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            設備掃描器
          </CardTitle>
          <CardDescription>
            發現和連接VR設備、移動設備和桌面設備
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 連接狀態 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
                {connectionStatus === 'connected' ? '已連接' : '未連接'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {connectionStatus === 'connected' ? 'WebSocket連接正常' : '無法連接到服務器'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDevices}
                disabled={scanProgress.isScanning}
              >
                <RefreshCw className="h-4 w-4" />
                刷新
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-primary text-primary-foreground' : ''}
              >
                <Settings className="h-4 w-4" />
                自動刷新
              </Button>
            </div>
          </div>

          {/* 掃描進度 */}
          {scanProgress.isScanning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>正在掃描: {scanProgress.currentMethod}</span>
                <span>{scanProgress.progress}%</span>
              </div>
              <Progress value={scanProgress.progress} className="w-full" />
            </div>
          )}

          {/* 掃描按鈕 */}
          <div className="flex gap-2">
            <Button
              onClick={() => scanDevices(['wifi'])}
              disabled={scanProgress.isScanning || connectionStatus !== 'connected'}
              className="flex-1"
            >
              <Wifi className="h-4 w-4 mr-2" />
              掃描WiFi設備
            </Button>
            
            <Button
              onClick={() => scanDevices(['bluetooth'])}
              disabled={scanProgress.isScanning || connectionStatus !== 'connected'}
              className="flex-1"
            >
              <Bluetooth className="h-4 w-4 mr-2" />
              掃描藍牙設備
            </Button>
            
            <Button
              onClick={() => scanDevices(['wifi', 'bluetooth'])}
              disabled={scanProgress.isScanning || connectionStatus !== 'connected'}
              className="flex-1"
            >
              <Search className="h-4 w-4 mr-2" />
              掃描所有設備
            </Button>
          </div>

          {/* 統計信息 */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{connectionStats.totalDevices}</div>
              <div className="text-xs text-muted-foreground">總設備</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">{connectionStats.connectedDevices}</div>
              <div className="text-xs text-muted-foreground">已連接</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{connectionStats.disconnectedDevices}</div>
              <div className="text-xs text-muted-foreground">未連接</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-red-600">{connectionStats.errorDevices}</div>
              <div className="text-xs text-muted-foreground">錯誤</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 設備列表 */}
      <Card>
        <CardHeader>
          <CardTitle>設備列表</CardTitle>
          <CardDescription>
            發現的設備 ({filteredDevices.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="vr">VR設備</TabsTrigger>
              <TabsTrigger value="mobile">移動設備</TabsTrigger>
              <TabsTrigger value="desktop">桌面設備</TabsTrigger>
              <TabsTrigger value="connected">已連接</TabsTrigger>
              <TabsTrigger value="discovered">已發現</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {filteredDevices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {activeTab === 'all' ? '暫無設備' : `暫無${activeTab}設備`}
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredDevices.map((device) => (
                    <div
                      key={device.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getDeviceTypeIcon(device.type)}
                        <div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {device.ip && `IP: ${device.ip}`}
                            {device.macAddress && ` • MAC: ${device.macAddress}`}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {device.type.toUpperCase()}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {device.connectionMethod}
                            </Badge>
                            {device.batteryLevel && (
                              <Badge variant="outline" className="text-xs">
                                電池: {device.batteryLevel}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(device.status)}
                          <span className="text-sm capitalize">{device.status}</span>
                        </div>

                        <div className="flex gap-2">
                          {device.status === 'discovered' && (
                            <Button
                              size="sm"
                              onClick={() => connectDevice(device.id)}
                              disabled={scanProgress.isScanning}
                            >
                              連接
                            </Button>
                          )}
                          
                          {device.status === 'connected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => disconnectDevice(device.id)}
                              disabled={scanProgress.isScanning}
                            >
                              斷開
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
