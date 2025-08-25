"use client"

import React, { useState, useCallback, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { 
  Wifi, 
  Bluetooth, 
  Usb, 
  Monitor, 
  Smartphone, 
  Zap,
  RefreshCw,
  Signal,
  Shield,
  Activity,
  Clock,
  Info
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Device {
  id: string
  name: string
  type: 'network' | 'bluetooth' | 'usb' | 'wifi'
  ip?: string
  mac?: string
  signal?: string
  security?: string
  vendor?: string
  status: 'discovered' | 'connected' | 'disconnected' | 'error'
  capabilities: string[]
  connectionMethod: string
  lastSeen: string
}

interface ScanProgress {
  isScanning: boolean
  progress: number
  currentMethod: string
  discoveredCount: number
  errorCount: number
}

interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'error'
  message: string
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
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    message: '未連接'
  })
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false)
  const [selectedMethods, setSelectedMethods] = useState<string[]>(['wifi', 'bluetooth', 'usb', 'network'])

  // 初始化連接
  useEffect(() => {
    // 檢查真實數據連接
    const checkRealDataConnection = async () => {
      try {
        // 檢查本地掃描服務器
        const scannerResponse = await fetch('http://localhost:3002/api/health')
        if (scannerResponse.ok) {
          setConnectionStatus({
            status: 'connected',
            message: '真實數據連接已建立'
          })
          toast({
            title: "真實數據連接成功",
            description: "本地掃描服務器運行正常",
            variant: "default"
          })
        } else {
          throw new Error('本地掃描服務器不可用')
        }
      } catch (error) {
        setConnectionStatus({
          status: 'error',
          message: '無法連接到真實數據源'
        })
        toast({
          title: "真實數據連接失敗",
          description: "請啟動本地掃描服務器: npm run scanner",
          variant: "destructive"
        })
      }
    }

    checkRealDataConnection()
  }, [])

  // 掃描設備
  const scanDevices = useCallback(async (methods: string[] = ['wifi', 'bluetooth', 'usb', 'network']) => {
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

      // 直接調用本地掃描服務器
      const response = await fetch('http://localhost:3002/api/devices', {
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
        throw new Error('本地掃描服務器掃描失敗')
      }

      const result = await response.json()
      const devices = result.devices || []

      clearInterval(progressInterval)
      setScanProgress(prev => ({ ...prev, progress: 100 }))

      // 更新設備列表
      setDevices(devices)

      toast({
        title: "掃描完成",
        description: `發現 ${devices.length} 個真實設備`,
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
      const response = await fetch('http://localhost:3002/api/devices', {
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
      const response = await fetch('http://localhost:3002/api/devices', {
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
      const response = await fetch('http://localhost:3002/api/devices')
      if (response.ok) {
        const result = await response.json()
        setDevices(result.devices || [])
      }
    } catch (error) {
      console.error('Failed to refresh devices:', error)
    }
  }, [])

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

  // 獲取設備類型統計
  const deviceTypeStats = useMemo(() => {
    const stats = {
      network: 0,
      bluetooth: 0,
      usb: 0,
      wifi: 0
    }
    
    devices.forEach(device => {
      if (stats.hasOwnProperty(device.type)) {
        stats[device.type as keyof typeof stats]++
      }
    })
    
    return stats
  }, [devices])

  // 自動刷新
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshDevices()
    }, 30000) // 30秒刷新一次

    return () => clearInterval(interval)
  }, [autoRefresh, refreshDevices])

  // 獲取設備圖標
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'network':
        return <Monitor className="h-4 w-4" />
      case 'bluetooth':
        return <Bluetooth className="h-4 w-4" />
      case 'usb':
        return <Usb className="h-4 w-4" />
      case 'wifi':
        return <Wifi className="h-4 w-4" />
      default:
        return <Smartphone className="h-4 w-4" />
    }
  }

  // 獲取狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'disconnected':
        return 'bg-gray-500'
      case 'error':
        return 'bg-red-500'
      default:
        return 'bg-blue-500'
    }
  }

  return (
    <div className="space-y-6">
      {/* 掃描控制 */}
      <Card>
        <CardHeader>
                      <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              100%真實設備掃描器
            </CardTitle>
            <CardDescription>
              掃描真實的網絡、藍牙、USB和WiFi設備，無任何虛擬數據
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 掃描方法選擇 */}
          <div className="space-y-2">
            <Label>選擇掃描方法：</Label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'wifi', label: 'WiFi網絡', icon: <Wifi className="h-4 w-4" /> },
                { key: 'bluetooth', label: '藍牙設備', icon: <Bluetooth className="h-4 w-4" /> },
                { key: 'usb', label: 'USB設備', icon: <Usb className="h-4 w-4" /> },
                { key: 'network', label: '網絡設備', icon: <Monitor className="h-4 w-4" /> }
              ].map(({ key, label, icon }) => (
                <Button
                  key={key}
                  variant={selectedMethods.includes(key) ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    if (selectedMethods.includes(key)) {
                      setSelectedMethods(prev => prev.filter(m => m !== key))
                    } else {
                      setSelectedMethods(prev => [...prev, key])
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {icon}
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* 掃描按鈕 */}
          <div className="flex gap-2">
            <Button 
              onClick={() => scanDevices(selectedMethods)} 
              disabled={scanProgress.isScanning || selectedMethods.length === 0}
              className="flex-1"
            >
              <Wifi className="mr-2 h-4 w-4" />
              {scanProgress.isScanning ? "掃描中..." : "掃描設備"}
            </Button>
            <Button 
              variant="outline" 
              onClick={refreshDevices}
              disabled={scanProgress.isScanning}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* 掃描進度 */}
          {scanProgress.isScanning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>掃描進度: {scanProgress.currentMethod}</span>
                <span>{scanProgress.progress}%</span>
              </div>
              <Progress value={scanProgress.progress} className="h-2" />
            </div>
          )}

          {/* 真實數據狀態 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(connectionStatus.status)}`} />
              <span className="text-sm text-gray-600">{connectionStatus.message}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-green-600 font-medium">100%真實數據模式</span>
            </div>
          </div>

          {/* 自動刷新 */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="auto-refresh">自動刷新 (30秒)</Label>
          </div>
        </CardContent>
      </Card>

      {/* 統計信息 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{connectionStats.totalDevices}</p>
                <p className="text-xs text-gray-500">總設備數</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{connectionStats.connectedDevices}</p>
                <p className="text-xs text-gray-500">已連接</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Signal className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{deviceTypeStats.wifi}</p>
                <p className="text-xs text-gray-500">WiFi網絡</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{deviceTypeStats.bluetooth}</p>
                <p className="text-xs text-gray-500">藍牙設備</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 設備列表 */}
      <Card>
        <CardHeader>
          <CardTitle>發現的設備</CardTitle>
          <CardDescription>
            共發現 {devices.length} 個設備
          </CardDescription>
        </CardHeader>
        <CardContent>
          {devices.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有發現設備</h3>
              <p className="text-gray-600 mb-4">點擊"掃描設備"來發現網絡上的真實設備</p>
              <Button onClick={() => scanDevices(selectedMethods)} disabled={scanProgress.isScanning}>
                <Wifi className="mr-2 h-4 w-4" />
                開始掃描
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {devices.map((device) => (
                <Card key={device.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getDeviceIcon(device.type)}
                          <h3 className="font-semibold">{device.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            {device.type.toUpperCase()}
                          </Badge>
                          <Badge 
                            variant={device.status === 'connected' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {device.status === 'connected' ? '已連接' : 
                             device.status === 'disconnected' ? '已斷開' : '錯誤'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                          {device.ip && (
                            <div className="flex items-center gap-1">
                              <Monitor className="h-3 w-3" />
                              <span>IP: {device.ip}</span>
                            </div>
                          )}
                          {device.mac && (
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span>MAC: {device.mac}</span>
                            </div>
                          )}
                          {device.signal && (
                            <div className="flex items-center gap-1">
                              <Signal className="h-3 w-3" />
                              <span>信號: {device.signal}</span>
                            </div>
                          )}
                          {device.security && (
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              <span>安全: {device.security}</span>
                            </div>
                          )}
                          {device.vendor && (
                            <div className="flex items-center gap-1">
                              <Info className="h-3 w-3" />
                              <span>廠商: {device.vendor}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>發現: {new Date(device.lastSeen).toLocaleTimeString()}</span>
                          </div>
                        </div>

                        {/* 設備能力 */}
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {device.capabilities.map((capability, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {capability}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {device.status === 'connected' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => disconnectDevice(device.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            斷開
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => connectDevice(device.id)}
                            disabled={device.status === 'error'}
                          >
                            連接
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
