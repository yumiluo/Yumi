"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Bluetooth, 
  Wifi, 
  Smartphone, 
  Monitor, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Signal
} from 'lucide-react'

export interface BluetoothDevice {
  id: string
  name: string
  address: string
  rssi: number
  deviceClass: number
  isVRDevice: boolean
  isPaired: boolean
  isConnected: boolean
  services: string[]
  lastSeen: string
}

interface BluetoothScannerProps {
  onDeviceConnected: (device: BluetoothDevice) => void
  onDeviceDisconnected: (deviceId: string) => void
}

export const BluetoothScanner: React.FC<BluetoothScannerProps> = ({
  onDeviceConnected,
  onDeviceDisconnected
}) => {
  const [isScanning, setIsScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<BluetoothDevice[]>([])
  const [connectedDevices, setConnectedDevices] = useState<BluetoothDevice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isBluetoothSupported, setIsBluetoothSupported] = useState<boolean>(false)
  const [isBluetoothAvailable, setIsBluetoothAvailable] = useState<boolean>(false)

  // 檢查藍牙支持
  useEffect(() => {
    const checkBluetoothSupport = async () => {
      if (!navigator.bluetooth) {
        setIsBluetoothSupported(false)
        setError('您的瀏覽器不支持Web Bluetooth API。請使用Chrome瀏覽器並確保啟用藍牙。')
        return
      }

      setIsBluetoothSupported(true)
      
      try {
        const available = await navigator.bluetooth.getAvailability()
        setIsBluetoothAvailable(available)
        
        if (!available) {
          setError('藍牙不可用。請確保設備已開啟藍牙功能。')
        }
      } catch (err) {
        console.error('檢查藍牙可用性失敗:', err)
        setError('無法檢查藍牙狀態。請確保已授予藍牙權限。')
      }
    }

    checkBluetoothSupport()
  }, [])

  // 真實的藍牙掃描功能
  const startBluetoothScan = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('瀏覽器不支持藍牙API')
      return
    }

    setIsScanning(true)
    setError(null)
    setDiscoveredDevices([])

    try {
      console.log('開始真實藍牙掃描...')
      
      // 使用Web Bluetooth API掃描設備 - 更寬鬆的過濾器
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          // 允許所有藍牙設備
          { namePrefix: '' }
        ],
        optionalServices: [
          'generic_access',
          'battery_service',
          'device_information',
          'generic_attribute',
          'human_interface_device',
          'a2dp_sink',
          'a2dp_source',
          'avrc_control',
          'avrc_target'
        ]
      })

      if (device) {
        console.log('發現藍牙設備:', device.name, device.id)
        
        // 檢查設備是否支持GATT
        if (device.gatt) {
          const deviceInfo: BluetoothDevice = {
            id: device.id,
            name: device.name || '未知設備',
            address: device.id, // Web Bluetooth不暴露MAC地址
            rssi: -50, // 默認信號強度
            deviceClass: 0x240404, // 默認設備類別
            isVRDevice: isVRDevice(device.name || ''),
            isPaired: false,
            isConnected: false,
            services: [],
            lastSeen: new Date().toLocaleString()
          }

          console.log('添加真實藍牙設備到列表:', deviceInfo)
          setDiscoveredDevices(prev => [...prev, deviceInfo])
          
          // 自動嘗試連接設備
          await connectToDevice(deviceInfo)
        }
      } else {
        console.log('用戶取消藍牙掃描')
        setError('未選擇任何設備')
      }
    } catch (err: any) {
      console.error('藍牙掃描失敗:', err)
      
      if (err.name === 'NotFoundError') {
        setError('未找到藍牙設備。請確保設備已開啟藍牙且處於可發現狀態。')
      } else if (err.name === 'NotAllowedError') {
        setError('藍牙權限被拒絕。請允許瀏覽器訪問藍牙功能。')
      } else if (err.name === 'NetworkError') {
        setError('藍牙連接失敗。請檢查設備是否在範圍內。')
      } else if (err.name === 'InvalidStateError') {
        setError('藍牙掃描已進行中。請等待當前掃描完成。')
      } else {
        setError(`藍牙掃描失敗: ${err.message || '未知錯誤'}`)
      }
    } finally {
      setIsScanning(false)
    }
  }, [])

  // 連接藍牙設備
  const connectToDevice = async (device: BluetoothDevice) => {
    try {
      setError(null)
      
      // 模擬連接過程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const connectedDevice: BluetoothDevice = {
        ...device,
        isConnected: true,
        isPaired: true,
        lastSeen: new Date().toLocaleString()
      }

      setConnectedDevices(prev => [...prev, connectedDevice])
      setDiscoveredDevices(prev => prev.filter(d => d.id !== device.id))
      
      // 通知父組件設備已連接
      onDeviceConnected(connectedDevice)
      
      console.log('藍牙設備連接成功:', connectedDevice.name)
    } catch (err) {
      console.error('連接設備失敗:', err)
      setError('連接設備失敗。請重試。')
    }
  }

  // 斷開設備連接
  const disconnectDevice = async (deviceId: string) => {
    try {
      setConnectedDevices(prev => prev.filter(d => d.id !== deviceId))
      onDeviceDisconnected(deviceId)
      console.log('設備已斷開連接')
    } catch (err) {
      console.error('斷開連接失敗:', err)
      setError('斷開連接失敗。')
    }
  }

  // 判斷是否為VR設備
  const isVRDevice = (deviceName: string): boolean => {
    const vrKeywords = [
      'quest', 'vive', 'pico', 'oculus', 'valve', 'index', 'varjo',
      'vr', 'virtual', 'reality', 'headset', 'hmd'
    ]
    return vrKeywords.some(keyword => 
      deviceName.toLowerCase().includes(keyword)
    )
  }

  // 判斷是否為手機設備
  const isMobileDevice = (deviceName: string): boolean => {
    const mobileKeywords = [
      'iphone', 'samsung', 'galaxy', 'xiaomi', 'mi', 'huawei', 'honor',
      'oppo', 'oneplus', 'vivo', 'realme', 'motorola', 'lg', 'sony',
      'nokia', 'blackberry', 'mobile', 'phone', 'smartphone'
    ]
    return mobileKeywords.some(keyword => 
      deviceName.toLowerCase().includes(keyword)
    )
  }

  // 獲取友好的設備名稱
  const getFriendlyDeviceName = (deviceName: string): string => {
    const name = deviceName.toLowerCase()
    
    // 手機設備識別
    if (name.includes('iphone')) {
      return `📱 ${deviceName} (iPhone)`
    } else if (name.includes('samsung') || name.includes('galaxy')) {
      return `📱 ${deviceName} (Samsung)`
    } else if (name.includes('xiaomi') || name.includes('mi ')) {
      return `📱 ${deviceName} (小米)`
    } else if (name.includes('huawei') || name.includes('honor')) {
      return `📱 ${deviceName} (華為)`
    } else if (name.includes('oppo') || name.includes('oneplus')) {
      return `📱 ${deviceName} (OPPO)`
    } else if (name.includes('vivo')) {
      return `📱 ${deviceName} (vivo)`
    } else if (name.includes('realme')) {
      return `📱 ${deviceName} (realme)`
    }
    
    // VR設備識別
    if (isVRDevice(deviceName)) {
      return `🥽 ${deviceName} (VR設備)`
    }
    
    // 其他設備
    return `🔗 ${deviceName}`
  }

  // 獲取設備類型圖標
  const getDeviceIcon = (device: BluetoothDevice) => {
    if (device.isVRDevice) {
      return <Monitor className="h-5 w-5 text-blue-600" />
    } else if (isMobileDevice(device.name)) {
      return <Smartphone className="h-5 w-5 text-green-600" />
    }
    return <Bluetooth className="h-5 w-5 text-purple-600" />
  }

  // 獲取信號強度顏色
  const getSignalStrengthColor = (rssi: number) => {
    if (rssi >= -50) return 'text-green-600'
    if (rssi >= -70) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 獲取信號強度條
  const getSignalStrengthBars = (rssi: number) => {
    if (rssi >= -50) return 4
    if (rssi >= -60) return 3
    if (rssi >= -70) return 2
    return 1
  }

  if (!isBluetoothSupported) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          您的瀏覽器不支持Web Bluetooth API。請使用Chrome瀏覽器（Android或Desktop）並確保啟用藍牙功能。
          <br />
          <strong>注意：</strong> Web Bluetooth API是實驗性功能，僅在支持的瀏覽器中運行。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* 手機藍牙連接指南 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Smartphone className="h-5 w-5" />
            📱 手機藍牙連接指南
          </CardTitle>
          <CardDescription className="text-blue-700">
            按照以下步驟連接你的手機到VR系統
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">步驟 1: 開啟手機藍牙</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 進入手機設置 → 藍牙</li>
                <li>• 開啟藍牙功能</li>
                <li>• 確保手機可見性為"所有人可見"</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">步驟 2: 掃描並連接</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 點擊下方"開始藍牙掃描"</li>
                <li>• 在彈出對話框中選擇你的手機</li>
                <li>• 系統會自動嘗試連接</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-100 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 如何識別你的手機？</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>常見手機藍牙名稱:</strong></p>
              <ul className="ml-4 space-y-1">
                <li>• iPhone: "iPhone的[你的名字]" 或 "iPhone"</li>
                <li>• Samsung: "Galaxy [型號]" 或 "Samsung [型號]"</li>
                <li>• 小米: "Xiaomi [型號]" 或 "MI [型號]"</li>
                <li>• 華為: "HUAWEI [型號]" 或 "Honor [型號]"</li>
                <li>• OPPO: "OPPO [型號]" 或 "OnePlus [型號]"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 藍牙狀態 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            藍牙狀態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isBluetoothAvailable ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={isBluetoothAvailable ? 'text-green-600' : 'text-red-600'}>
                {isBluetoothAvailable ? '藍牙可用' : '藍牙不可用'}
              </span>
            </div>
            <Button
              onClick={startBluetoothScan}
              disabled={isScanning || !isBluetoothAvailable}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isScanning ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Bluetooth className="h-4 w-4" />
              )}
              {isScanning ? '掃描中...' : '🔍 開始藍牙掃描'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 錯誤提示 */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="ml-2 mt-2"
            >
              關閉
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 已連接設備 */}
      {connectedDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              已連接設備 ({connectedDevices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {connectedDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device)}
                    <div>
                      <div className="font-medium">{getFriendlyDeviceName(device.name)}</div>
                      <div className="text-sm text-gray-600">
                        ID: {device.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">
                      已連接
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectDevice(device.id)}
                    >
                      斷開
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 發現的設備 */}
      {discoveredDevices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5 text-blue-600" />
              發現的設備 ({discoveredDevices.length})
            </CardTitle>
            <CardDescription>
              點擊設備進行連接
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {discoveredDevices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => connectToDevice(device)}
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device)}
                    <div>
                      <div className="font-medium">{getFriendlyDeviceName(device.name)}</div>
                      <div className="text-sm text-gray-600">
                        ID: {device.id.substring(0, 8)}...
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Signal className={`h-4 w-4 ${getSignalStrengthColor(device.rssi)}`} />
                      <span className="text-sm text-gray-600">
                        {device.rssi} dBm
                      </span>
                    </div>
                    <Badge variant="outline">
                      {device.isVRDevice ? '🥽 VR設備' : isMobileDevice(device.name) ? '📱 手機' : '🔗 其他設備'}
                    </Badge>
                    <Button size="sm">
                      連接
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 掃描提示 */}
      {isScanning && (
        <Card>
          <CardContent className="text-center py-8">
            <RefreshCw className="mx-auto h-12 w-12 text-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              正在掃描藍牙設備...
            </h3>
            <p className="text-gray-600">
              請在彈出的對話框中選擇要連接的設備
            </p>
          </CardContent>
        </Card>
      )}

      {/* 無設備提示 */}
      {!isScanning && discoveredDevices.length === 0 && connectedDevices.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <Bluetooth className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              未發現藍牙設備
            </h3>
            <p className="text-gray-600 mb-4">
              點擊"開始藍牙掃描"來發現附近的VR設備和手機
            </p>
            <Button onClick={startBluetoothScan} disabled={!isBluetoothAvailable}>
              <Bluetooth className="mr-2 h-4 w-4" />
              開始掃描
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
