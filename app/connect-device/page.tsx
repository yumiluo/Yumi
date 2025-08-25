"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Plus, 
  Wifi, 
  Bluetooth, 
  Monitor, 
  Smartphone, 
  Zap,
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  Link,
  Unlink
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Device {
  id: string
  name: string
  type: string
  ip?: string
  mac?: string
  status: 'connected' | 'disconnected' | 'connecting' | 'failed'
  capabilities: string[]
  connectionMethod: string
  lastSeen: string
  connectionTime?: string
  metadata?: any
}

export default function ConnectDevicePage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [newDevice, setNewDevice] = useState({
    name: '',
    type: 'unknown',
    ip: '',
    mac: '',
    connectionMethod: 'manual',
    capabilities: []
  })
  const [isConnecting, setIsConnecting] = useState(false)

  // 獲取已連接設備
  const fetchConnectedDevices = async () => {
    try {
      const response = await fetch('/api/connect-device')
      if (response.ok) {
        const result = await response.json()
        setDevices(result.devices || [])
      }
    } catch (error) {
      console.error('獲取設備失敗:', error)
    }
  }

  useEffect(() => {
    fetchConnectedDevices()
  }, [])

  // 連接新設備
  const connectNewDevice = async () => {
    if (!newDevice.name.trim()) {
      toast({
        title: "錯誤",
        description: "請輸入設備名稱",
        variant: "destructive"
      })
      return
    }

    setIsConnecting(true)
    try {
      const response = await fetch('/api/connect-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'connect',
          deviceInfo: {
            ...newDevice,
            id: `device_${Date.now()}`,
            capabilities: newDevice.capabilities.length > 0 ? newDevice.capabilities : ['manual_connection']
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "連接成功",
            description: `${result.device.name} 已連接`,
            variant: "default"
          })
          
          // 重置表單
          setNewDevice({
            name: '',
            type: 'unknown',
            ip: '',
            mac: '',
            connectionMethod: 'manual',
            capabilities: []
          })
          
          // 刷新設備列表
          fetchConnectedDevices()
        } else {
          toast({
            title: "連接失敗",
            description: result.error || "無法連接到設備",
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      toast({
        title: "連接錯誤",
        description: "連接過程中發生錯誤",
        variant: "destructive"
      })
    } finally {
      setIsConnecting(false)
    }
  }

  // 斷開設備
  const disconnectDevice = async (deviceId: string) => {
    try {
      const response = await fetch('/api/connect-device', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'disconnect',
          deviceId: deviceId
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          toast({
            title: "斷開成功",
            description: "設備已斷開連接",
            variant: "default"
          })
          fetchConnectedDevices()
        }
      }
    } catch (error) {
      toast({
        title: "斷開失敗",
        description: "無法斷開設備",
        variant: "destructive"
      })
    }
  }

  // 獲取設備類型圖標
  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'network':
        return <Monitor className="h-4 w-4" />
      case 'mobile':
        return <Smartphone className="h-4 w-4" />
      case 'bluetooth':
        return <Bluetooth className="h-4 w-4" />
      case 'wifi':
        return <Wifi className="h-4 w-4" />
      case 'cloud':
        return <Zap className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  // 獲取狀態顏色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-500'
      case 'connecting':
        return 'bg-yellow-500'
      case 'failed':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">設備連接中心</h1>
        <p className="text-gray-600">連接和管理您的所有設備</p>
      </div>

      <Tabs defaultValue="connect" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="connect">連接新設備</TabsTrigger>
          <TabsTrigger value="manage">管理設備</TabsTrigger>
        </TabsList>

        <TabsContent value="connect" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                連接新設備
              </CardTitle>
              <CardDescription>
                手動添加和連接您的設備
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device-name">設備名稱 *</Label>
                  <Input
                    id="device-name"
                    placeholder="例如：我的手機、路由器"
                    value={newDevice.name}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-type">設備類型</Label>
                  <Select
                    value={newDevice.type}
                    onValueChange={(value) => setNewDevice(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選擇設備類型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobile">移動設備</SelectItem>
                      <SelectItem value="network">網絡設備</SelectItem>
                      <SelectItem value="bluetooth">藍牙設備</SelectItem>
                      <SelectItem value="wifi">WiFi設備</SelectItem>
                      <SelectItem value="cloud">雲端設備</SelectItem>
                      <SelectItem value="unknown">其他</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-ip">IP地址</Label>
                  <Input
                    id="device-ip"
                    placeholder="例如：192.168.1.100"
                    value={newDevice.ip}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, ip: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="device-mac">MAC地址</Label>
                  <Input
                    id="device-mac"
                    placeholder="例如：AA:BB:CC:DD:EE:FF"
                    value={newDevice.mac}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, mac: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="device-capabilities">設備能力</Label>
                <Input
                  id="device-capabilities"
                  placeholder="例如：vr, 360_video, spatial_audio (用逗號分隔)"
                  value={newDevice.capabilities.join(', ')}
                  onChange={(e) => setNewDevice(prev => ({ 
                    ...prev, 
                    capabilities: e.target.value.split(',').map(c => c.trim()).filter(c => c)
                  }))}
                />
              </div>

              <Button 
                onClick={connectNewDevice} 
                disabled={isConnecting || !newDevice.name.trim()}
                className="w-full"
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    連接中...
                  </>
                ) : (
                  <>
                    <Link className="mr-2 h-4 w-4" />
                    連接設備
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                已連接設備 ({devices.length})
              </CardTitle>
              <CardDescription>
                管理您當前連接的所有設備
              </CardDescription>
            </CardHeader>
            <CardContent>
              {devices.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">沒有連接的設備</h3>
                  <p className="text-gray-600">在"連接新設備"標籤中添加您的第一個設備</p>
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
                                 device.status === 'connecting' ? '連接中' : 
                                 device.status === 'failed' ? '連接失敗' : '已斷開'}
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
                              <div className="flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" />
                                <span>連接時間: {device.connectionTime ? new Date(device.connectionTime).toLocaleTimeString() : 'N/A'}</span>
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
                                <Unlink className="mr-1 h-3 w-3" />
                                斷開
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                disabled={device.status === 'connecting'}
                              >
                                <Link className="mr-1 h-3 w-3" />
                                重新連接
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
