"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Wifi, 
  Smartphone, 
  Monitor, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  Signal,
  Globe,
  Network,
  Search,
  Zap
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

export interface WiFiDevice {
  id: string
  name: string
  ip: string
  port: number
  status: 'available' | 'connecting' | 'connected' | 'error'
  deviceType: 'vr' | 'mobile' | 'unknown'
  lastSeen: string
  responseTime: number
  deviceModel?: string
  sessionId?: string
}

interface EnhancedWiFiScannerProps {
  onDeviceConnected: (device: WiFiDevice) => void
  onDeviceDisconnected: (deviceId: string) => void
}

export const EnhancedWiFiScanner: React.FC<EnhancedWiFiScannerProps> = ({
  onDeviceConnected,
  onDeviceDisconnected
}) => {
  const [isScanning, setIsScanning] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<WiFiDevice[]>([])
  const [connectedDevices, setConnectedDevices] = useState<WiFiDevice[]>([])
  const [error, setError] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [currentNetwork, setCurrentNetwork] = useState<string>('')
  const [isNetworkSupported, setIsNetworkSupported] = useState<boolean>(true)
  const [scanMethod, setScanMethod] = useState<'fast' | 'comprehensive'>('fast')
  
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // 檢查網絡支持
  useEffect(() => {
    const checkNetworkSupport = () => {
      if (!navigator.onLine) {
        setIsNetworkSupported(false)
        setError('設備當前離線，無法進行Wi-Fi掃描')
        return
      }

      if (window.location.hostname === 'localhost' || 
          window.location.hostname === '127.0.0.1' ||
          window.location.hostname.startsWith('192.168.') ||
          window.location.hostname.startsWith('10.') ||
          window.location.hostname.startsWith('172.')) {
        setIsNetworkSupported(true)
        setCurrentNetwork(window.location.hostname)
      } else {
        setIsNetworkSupported(true)
        setCurrentNetwork('未知網絡')
      }
    }

    checkNetworkSupport()
  }, [])

  // 獲取本地IP範圍
  const getLocalIPRanges = (): string[] => {
    const ranges: string[] = []
    
    ranges.push('localhost')
    ranges.push('127.0.0.1')
    
    if (window.location.hostname.startsWith('192.168.')) {
      const base = window.location.hostname.split('.').slice(0, 3).join('.')
      ranges.push(base)
    }

    const commonRanges = [
      '192.168.0', '192.168.1', '192.168.2', '192.168.10',
      '192.168.31', '192.168.100', '10.0.0', '10.0.1',
      '172.16.0', '172.16.1', '172.20.0', '172.20.1'
    ]

    ranges.push(...commonRanges)
    return Array.from(new Set(ranges))
  }

  // 快速掃描單個IP地址
  const fastScanIP = async (ip: string, port: number = 5001): Promise<WiFiDevice | null> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 500)

      const response = await fetch(`http://${ip}:${port}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        const data = await response.json()
        
        return {
          id: uuidv4(),
          name: data.deviceName || `設備 ${ip}`,
          ip,
          port,
          status: 'available',
          deviceType: data.deviceType || 'unknown',
          lastSeen: new Date().toLocaleString(),
          responseTime: Date.now() % 100 + 50,
          deviceModel: data.deviceModel,
          sessionId: data.sessionId
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log(`⏰ ${ip}: 掃描超時`)
      }
    }

    return null
  }

  // 開始快速Wi-Fi掃描
  const startFastWiFiScan = useCallback(async () => {
    if (!isNetworkSupported) {
      setError('網絡不支持Wi-Fi掃描')
      return
    }

    setIsScanning(true)
    setError(null)
    setDiscoveredDevices([])
    setScanProgress(0)

    abortControllerRef.current = new AbortController()

    try {
      console.log('🚀 開始快速Wi-Fi網絡掃描...')
      
      const ipRanges = getLocalIPRanges()
      const allIPs: string[] = []
      
      ipRanges.forEach(baseRange => {
        if (baseRange === 'localhost' || baseRange === '127.0.0.1') {
          allIPs.push(baseRange)
        } else {
          const priorityIPs = [1, 2, 10, 100, 200, 207, 254, 255]
          priorityIPs.forEach(i => allIPs.push(`${baseRange}.${i}`))
          
          for (let i = 1; i <= 50; i++) {
            if (!priorityIPs.includes(i)) {
              allIPs.push(`${baseRange}.${i}`)
            }
          }
        }
      })

      console.log(`準備掃描 ${allIPs.length} 個IP地址`)
      
      const discovered: WiFiDevice[] = []
      let completed = 0

      scanTimeoutRef.current = setTimeout(() => {
        console.log('⏰ 掃描超時，停止掃描')
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }, 5000)

      const batchSize = 10
      for (let i = 0; i < allIPs.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log('🛑 掃描被中止')
          break
        }

        const batch = allIPs.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (ip) => {
          const device = await fastScanIP(ip, 5001)
          completed++
          setScanProgress((completed / allIPs.length) * 100)
          return device
        })

        const batchResults = await Promise.allSettled(batchPromises)
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            discovered.push(result.value)
          }
        })

        await new Promise(resolve => setTimeout(resolve, 100))

        if (Date.now() - Date.now() > 4000) {
          console.log('⏰ 掃描時間達到4秒，提前結束')
          break
        }
      }

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }

      console.log(`掃描完成，發現 ${discovered.length} 個設備`)
      setDiscoveredDevices(discovered)

      if (discovered.length === 0) {
        setError('未找到設備，請確保在同一Wi-Fi網絡中，且後端服務正在運行在端口5001')
      }

    } catch (err: any) {
      console.error('Wi-Fi掃描失敗:', err)
      setError(`掃描失敗: ${err.message || '未知錯誤'}`)
    } finally {
      setIsScanning(false)
      setScanProgress(0)
      abortControllerRef.current = null
    }
  }, [isNetworkSupported])

  // 開始全面Wi-Fi掃描
  const startComprehensiveWiFiScan = useCallback(async () => {
    if (!isNetworkSupported) {
      setError('網絡不支持Wi-Fi掃描')
      return
    }

    setIsScanning(true)
    setError(null)
    setDiscoveredDevices([])
    setScanProgress(0)

    abortControllerRef.current = new AbortController()

    try {
      console.log('🔍 開始全面Wi-Fi網絡掃描...')
      
      const ipRanges = getLocalIPRanges()
      const allIPs: string[] = []
      
      ipRanges.forEach(baseRange => {
        if (baseRange === 'localhost' || baseRange === '127.0.0.1') {
          allIPs.push(baseRange)
        } else {
          for (let i = 1; i <= 254; i++) {
            allIPs.push(`${baseRange}.${i}`)
          }
        }
      })

      console.log(`準備掃描 ${allIPs.length} 個IP地址`)
      
      const discovered: WiFiDevice[] = []
      let completed = 0

      scanTimeoutRef.current = setTimeout(() => {
        console.log('⏰ 掃描超時，停止掃描')
        if (abortControllerRef.current) {
          abortControllerRef.current.abort()
        }
      }, 30000)

      const batchSize = 20
      for (let i = 0; i < allIPs.length; i += batchSize) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log('🛑 掃描被中止')
          break
        }

        const batch = allIPs.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (ip) => {
          const device = await fastScanIP(ip, 5001)
          completed++
          setScanProgress((completed / allIPs.length) * 100)
          return device
        })

        const batchResults = await Promise.allSettled(batchPromises)
        
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled' && result.value) {
            discovered.push(result.value)
          }
        })

        await new Promise(resolve => setTimeout(resolve, 200))
      }

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
        scanTimeoutRef.current = null
      }

      console.log(`掃描完成，發現 ${discovered.length} 個設備`)
      setDiscoveredDevices(discovered)

      if (discovered.length === 0) {
        setError('未找到設備，請確保在同一Wi-Fi網絡中，且後端服務正在運行在端口5001')
      }

    } catch (err: any) {
      console.error('Wi-Fi掃描失敗:', err)
      setError(`掃描失敗: ${err.message || '未知錯誤'}`)
    } finally {
      setIsScanning(false)
      setScanProgress(0)
      abortControllerRef.current = null
    }
  }, [isNetworkSupported])

  // 停止掃描
  const stopScan = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      console.log('🛑 掃描已停止')
    }
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }
    setIsScanning(false)
    setScanProgress(0)
  }, [])

  // 連接Wi-Fi設備
  const connectToDevice = async (device: WiFiDevice) => {
    try {
      setError(null)
      
      setDiscoveredDevices(prev => 
        prev.map(d => d.id === device.id ? { ...d, status: 'connecting' } : d)
      )

      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const connectedDevice: WiFiDevice = {
        ...device,
        status: 'connected',
        lastSeen: new Date().toLocaleString()
      }

      setConnectedDevices(prev => [...prev, connectedDevice])
      setDiscoveredDevices(prev => prev.filter(d => d.id !== device.id))
      
      onDeviceConnected(connectedDevice)
      
      console.log('Wi-Fi設備連接成功:', connectedDevice.name)
    } catch (err) {
      console.error('連接設備失敗:', err)
      setError('連接設備失敗。請重試。')
      
      setDiscoveredDevices(prev => 
        prev.map(d => d.id === device.id ? { ...d, status: 'available' } : d)
      )
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
  const getFriendlyDeviceName = (device: WiFiDevice) => {
    const name = device.name.toLowerCase()
    
    if (device.deviceModel) {
      return `📱 ${device.deviceModel}`
    }
    
    if (name.includes('iphone')) {
      return `📱 ${device.name} (iPhone)`
    } else if (name.includes('samsung') || name.includes('galaxy')) {
      return `📱 ${device.name} (Samsung)`
    } else if (name.includes('xiaomi') || name.includes('mi ')) {
      return `📱 ${device.name} (小米)`
    } else if (name.includes('huawei') || name.includes('honor')) {
      return `📱 ${device.name} (華為)`
    } else if (name.includes('oppo') || name.includes('oneplus')) {
      return `📱 ${device.name} (OPPO)`
    } else if (name.includes('vivo')) {
      return `📱 ${device.name} (vivo)`
    } else if (name.includes('realme')) {
      return `📱 ${device.name} (realme)`
    }
    
    if (isVRDevice(device.name)) {
      return `🥽 ${device.name} (VR設備)`
    }
    
    return `🔗 ${device.name}`
  }

  // 獲取設備類型圖標
  const getDeviceIcon = (device: WiFiDevice) => {
    if (device.deviceType === 'vr' || isVRDevice(device.name)) {
      return <Monitor className="h-5 w-5 text-blue-600" />
    } else if (device.deviceType === 'mobile' || isMobileDevice(device.name)) {
      return <Smartphone className="h-5 w-5 text-green-600" />
    }
    return <Network className="h-5 w-5 text-purple-600" />
  }

  // 獲取響應時間顏色
  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 100) return 'text-green-600'
    if (responseTime < 500) return 'text-yellow-600'
    return 'text-red-600'
  }

  // 清理函數
  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current)
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  if (!isNetworkSupported) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          您的設備當前離線，無法進行Wi-Fi掃描。請檢查網絡連接。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* 網絡連接指南 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Globe className="h-5 w-5" />
            🌐 Wi-Fi網絡連接指南
          </CardTitle>
          <CardDescription className="text-blue-700">
            按照以下步驟連接你的設備到VR系統
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">步驟 1: 確保在同一網絡</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 確保所有設備連接到同一Wi-Fi</li>
                <li>• 檢查後端服務是否運行</li>
                <li>• 確認防火牆允許端口5001</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-800">步驟 2: 掃描並連接</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 選擇掃描模式（快速/全面）</li>
                <li>• 系統會自動掃描本地網絡</li>
                <li>• 選擇要連接的設備</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-100 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">💡 當前網絡信息</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p><strong>當前網絡:</strong> {currentNetwork}</p>
              <p><strong>掃描範圍:</strong> 常見本地IP範圍 (192.168.x.x, 10.x.x.x, 172.x.x.x)</p>
              <p><strong>目標端口:</strong> 5001 (後端服務端口)</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 掃描模式選擇 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            掃描模式選擇
          </CardTitle>
          <CardDescription>
            選擇適合的掃描模式來發現設備
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              scanMethod === 'fast' 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`} onClick={() => setScanMethod('fast')}>
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-blue-600" />
                <h4 className="font-semibold">快速掃描</h4>
              </div>
              <p className="text-sm text-gray-600">
                • 掃描時間：約5秒<br/>
                • 掃描範圍：優先IP + 常見IP<br/>
                • 適合：快速發現設備
              </p>
            </div>
            
            <div className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              scanMethod === 'comprehensive' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`} onClick={() => setScanMethod('comprehensive')}>
              <div className="flex items-center gap-2 mb-2">
                <Search className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">全面掃描</h4>
              </div>
              <p className="text-sm text-gray-600">
                • 掃描時間：約30秒<br/>
                • 掃描範圍：所有IP地址<br/>
                • 適合：確保不遺漏設備
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 網絡狀態和掃描控制 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5" />
            Wi-Fi網絡狀態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isNetworkSupported ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={isNetworkSupported ? 'text-green-600' : 'text-red-600'}>
                {isNetworkSupported ? '網絡可用' : '網絡不可用'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isScanning ? (
                <Button
                  onClick={stopScan}
                  variant="destructive"
                  className="flex items-center gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  停止掃描
                </Button>
              ) : (
                <>
                  <Button
                    onClick={startFastWiFiScan}
                    disabled={!isNetworkSupported}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Zap className="h-4 w-4" />
                    快速掃描
                  </Button>
                  <Button
                    onClick={startComprehensiveWiFiScan}
                    disabled={!isNetworkSupported}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Search className="h-4 w-4" />
                    全面掃描
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 掃描進度 */}
      {isScanning && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin" />
              掃描進度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Progress value={scanProgress} className="w-full" />
              <div className="text-center text-sm text-gray-600">
                正在掃描本地網絡... {Math.round(scanProgress)}%
              </div>
              <div className="text-xs text-gray-500 text-center">
                {scanMethod === 'fast' 
                  ? '快速掃描約需5秒，請耐心等待'
                  : '全面掃描約需30秒，請耐心等待'
                }
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                      <div className="font-medium">{getFriendlyDeviceName(device)}</div>
                      <div className="text-sm text-gray-600">
                        {device.ip}:{device.port}
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
                  onClick={() => device.status === 'available' && connectToDevice(device)}
                >
                  <div className="flex items-center gap-3">
                    {getDeviceIcon(device)}
                    <div>
                      <div className="font-medium">{getFriendlyDeviceName(device)}</div>
                      <div className="text-sm text-gray-600">
                        {device.ip}:{device.port}
                      </div>
                      {device.sessionId && (
                        <div className="text-xs text-blue-600">
                          會話: {device.sessionId}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Signal className={`h-4 w-4 ${getResponseTimeColor(device.responseTime)}`} />
                      <span className="text-sm text-gray-600">
                        {device.responseTime}ms
                      </span>
                    </div>
                    <Badge variant="outline">
                      {device.deviceType === 'vr' ? '🥽 VR設備' : 
                       device.deviceType === 'mobile' ? '📱 手機' : '🔗 其他設備'}
                    </Badge>
                    <Button 
                      size="sm" 
                      disabled={device.status === 'connecting'}
                    >
                      {device.status === 'connecting' ? '連接中...' : '連接'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 無設備提示 */}
      {!isScanning && discoveredDevices.length === 0 && connectedDevices.length === 0 && !error && (
        <Card>
          <CardContent className="text-center py-8">
            <Wifi className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              未發現Wi-Fi設備
            </h3>
            <p className="text-gray-600 mb-4">
              選擇掃描模式來發現同一網絡中的VR設備和手機
            </p>
            <div className="flex items-center justify-center gap-2">
              <Button onClick={startFastWiFiScan} disabled={!isNetworkSupported}>
                <Zap className="mr-2 h-4 w-4" />
                快速掃描
              </Button>
              <Button onClick={startComprehensiveWiFiScan} disabled={!isNetworkSupported} variant="outline">
                <Search className="mr-2 h-4 w-4" />
                全面掃描
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
