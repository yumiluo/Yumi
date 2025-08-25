"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Wifi, 
  QrCode, 
  Monitor, 
  Smartphone,
  X,
  AlertTriangle
} from 'lucide-react'
import { WiFiScanner, WiFiDevice } from './wifi-scanner'
import { QRScanner } from './qr-scanner'
import { DeviceList, ConnectedDevice } from './device-list'

interface DeviceInfo {
  id: string
  name: string
  type: string
  connectionMethod: 'wifi' | 'qr' | 'network'
  status: 'connected' | 'disconnected' | 'playing' | 'paused' | 'error'
  lastSeen: string
}

interface DeviceManagementModalProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  sessionCode?: string
  onDeviceConnected: (device: DeviceInfo) => void
  onDeviceDisconnected: (deviceId: string) => void
  connectedDevices: DeviceInfo[]
}

export const DeviceManagementModal: React.FC<DeviceManagementModalProps> = ({
  isOpen: externalIsOpen,
  onOpenChange: externalOnOpenChange,
  sessionCode,
  onDeviceConnected,
  onDeviceDisconnected,
  connectedDevices
}) => {
  const [internalIsOpen, setInternalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('wifi')
  const [currentSession, setCurrentSession] = useState<string | null>(null)
  
  // 使用外部或內部的開關狀態
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = externalOnOpenChange || setInternalIsOpen

  // 處理Wi-Fi設備連接
  const handleWiFiDeviceConnected = (device: WiFiDevice) => {
    const deviceInfo: DeviceInfo = {
      id: device.id,
      name: device.name,
      type: device.deviceType,
      connectionMethod: 'wifi',
      status: 'connected',
      lastSeen: new Date().toLocaleString()
    }
    
    onDeviceConnected(deviceInfo)
    console.log('Wi-Fi設備已連接:', deviceInfo)
    
    // 連接成功後關閉模態窗口
    setIsOpen(false)
  }

  // 處理Wi-Fi設備斷開
  const handleWiFiDeviceDisconnected = (deviceId: string) => {
    onDeviceDisconnected(deviceId)
    console.log('Wi-Fi設備已斷開:', deviceId)
  }

  // 處理QR碼設備加入
  const handleQRDeviceJoined = (deviceInfo: { id: string; name: string; type: string }) => {
    const device: DeviceInfo = {
      ...deviceInfo,
      connectionMethod: 'qr',
      status: 'connected',
      lastSeen: new Date().toLocaleString()
    }
    
    onDeviceConnected(device)
    console.log('QR碼設備已加入:', device)
    
    // 連接成功後關閉模態窗口
    setIsOpen(false)
  }

  // 獲取設備類型圖標
  const getDeviceIcon = (device: DeviceInfo) => {
    if (device.type === 'vr') {
      return <Monitor className="h-5 w-5 text-blue-600" />
    }
    return <Smartphone className="h-5 w-5 text-green-600" />
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          添加設備
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            設備管理
          </DialogTitle>
          <DialogDescription>
            選擇連接方式來添加新的VR設備或手機
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 實時設備列表 */}
          <DeviceList
            sessionCode={sessionCode}
            onDeviceConnected={onDeviceConnected}
            onDeviceDisconnected={onDeviceDisconnected}
          />

          {/* 連接方式選項卡 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="wifi" className="flex items-center gap-2">
                <Wifi className="h-4 w-4" />
                Wi-Fi掃描
              </TabsTrigger>
              <TabsTrigger value="qr" className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR碼掃描
              </TabsTrigger>
            </TabsList>

            <TabsContent value="wifi" className="space-y-4">
              <div className="p-4 border rounded-lg bg-blue-50">
                <h3 className="font-medium text-blue-900 mb-2">Wi-Fi連接說明</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• 掃描同一Wi-Fi網絡中的設備</li>
                  <li>• 支持VR頭顯和手機設備</li>
                  <li>• 需要設備在同一本地網絡</li>
                  <li>• 僅用於設備發現和初始連接</li>
                </ul>
              </div>
              
                      <WiFiScanner
          onDeviceConnected={handleWiFiDeviceConnected}
          onDeviceDisconnected={handleWiFiDeviceDisconnected}
        />
            </TabsContent>

            <TabsContent value="qr" className="space-y-4">
              <div className="p-4 border rounded-lg bg-green-50">
                <h3 className="font-medium text-green-900 mb-2">QR碼連接說明</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• 掃描設備上顯示的QR碼</li>
                  <li>• 支持相機掃描和手動輸入</li>
                  <li>• 快速連接網絡設備</li>
                  <li>• 適用於所有支持相機的設備</li>
                </ul>
              </div>
              
              <QRScanner onDeviceJoined={handleQRDeviceJoined} />
            </TabsContent>
          </Tabs>

          {/* 注意事項 */}
          <Card className="border-yellow-200 bg-yellow-50">
            <CardHeader>
              <CardTitle className="text-yellow-800">重要提示</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-yellow-700 space-y-2">
                <p><strong>Wi-Fi功能：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>需要所有設備在同一Wi-Fi網絡</li>
                  <li>後端服務必須在端口5001運行</li>
                  <li>支持常見本地IP範圍掃描</li>
                  <li>掃描時間約30秒，請耐心等待</li>
                </ul>
                
                <p className="mt-3"><strong>QR碼功能：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>需要相機權限</li>
                  <li>建議使用後置相機掃描</li>
                  <li>支持手動輸入設備代碼</li>
                </ul>
                
                <p className="mt-3"><strong>設備管理：</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>僅顯示真實連接的設備</li>
                  <li>設備斷開後會自動從列表中移除</li>
                  <li>支持手動斷開設備連接</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
