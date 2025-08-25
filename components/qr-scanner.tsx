"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  QrCode, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Smartphone
} from 'lucide-react'
import jsQR from 'jsqr'

interface QRScannerProps {
  onDeviceJoined: (deviceInfo: { id: string; name: string; type: string }) => void
}

export const QRScanner: React.FC<QRScannerProps> = ({ onDeviceJoined }) => {
  const [isScanning, setIsScanning] = useState(false)
  const [scannedData, setScannedData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraSupported, setIsCameraSupported] = useState<boolean>(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 檢查相機支持
  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setIsCameraSupported(false)
          setError('您的瀏覽器不支持相機功能')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        stream.getTracks().forEach(track => track.stop()) // 立即停止測試流
        setIsCameraSupported(true)
      } catch (err) {
        console.error('相機檢查失敗:', err)
        setIsCameraSupported(false)
        setError('無法訪問相機。請確保已授予相機權限。')
      }
    }

    checkCameraSupport()
  }, [])

  // 開始掃描
  const startScanning = async () => {
    if (!isCameraSupported) {
      setError('相機不可用')
      return
    }

    try {
      setIsScanning(true)
      setError(null)
      setScannedData(null)

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // 使用後置相機
      })

      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      // 開始掃描循環
      requestAnimationFrame(scanFrame)
    } catch (err: any) {
      console.error('啟動相機失敗:', err)
      if (err.name === 'NotAllowedError') {
        setError('相機權限被拒絕。請允許瀏覽器訪問相機。')
      } else if (err.name === 'NotFoundError') {
        setError('未找到相機設備。')
      } else {
        setError(`啟動相機失敗: ${err.message}`)
      }
      setIsScanning(false)
    }
  }

  // 停止掃描
  const stopScanning = () => {
    setIsScanning(false)
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  // 掃描幀
  const scanFrame = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return

    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext('2d')

      if (!context) return

      // 設置canvas尺寸
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // 繪製視頻幀到canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height)

      // 獲取圖像數據
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height)

      // 使用jsQR庫掃描QR碼
      const qrFound = scanQRCode(imageData)
      if (qrFound) {
        return // 如果找到QR碼，停止掃描
      }

      // 繼續掃描
      if (isScanning) {
        requestAnimationFrame(scanFrame)
      }
    } catch (err) {
      console.error('掃描幀失敗:', err)
    }
  }

  // 使用jsQR庫掃描QR碼
  const scanQRCode = (imageData: ImageData) => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      if (code) {
        console.log('掃描到QR碼:', code.data)
        handleQRCodeScanned(code.data)
        return true
      }
      return false
    } catch (err) {
      console.error('QR碼解析失敗:', err)
      return false
    }
  }

  // 處理掃描到的QR碼
  const handleQRCodeScanned = (data: string) => {
    try {
      setScannedData(data)
      stopScanning()

      // 解析QR碼數據
      const url = new URL(data)
      const code = url.searchParams.get('code')
      const deviceId = url.searchParams.get('device')
      const deviceType = url.searchParams.get('type')

      if (code && deviceId && deviceType) {
        // 模擬設備加入
        const deviceInfo = {
          id: deviceId,
          name: `${deviceType.toUpperCase()} Device`,
          type: deviceType
        }

        onDeviceJoined(deviceInfo)
        console.log('設備通過QR碼加入:', deviceInfo)
      } else {
        setError('無效的QR碼格式')
      }
    } catch (err) {
      console.error('解析QR碼失敗:', err)
      setError('無法解析QR碼')
    }
  }

  // 手動輸入設備代碼
  const handleManualCode = () => {
    const code = prompt('請輸入設備連接代碼:')
    if (code) {
      const mockData = `https://yourapp.com/join?code=${code}&device=MANUAL&type=vr`
      handleQRCodeScanned(mockData)
    }
  }

  // 清理
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  if (!isCameraSupported) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          您的瀏覽器不支持相機功能。請使用支持相機的瀏覽器或設備。
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* QR碼掃描器 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR碼掃描器
          </CardTitle>
          <CardDescription>
            掃描設備上的QR碼來連接設備
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 相機預覽 */}
            {isScanning && (
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 object-cover rounded-lg border"
                  autoPlay
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-blue-500 border-dashed w-48 h-48 rounded-lg flex items-center justify-center">
                    <QrCode className="h-12 w-12 text-blue-500 opacity-50" />
                  </div>
                </div>
              </div>
            )}

            {/* 控制按鈕 */}
            <div className="flex gap-2">
              {!isScanning ? (
                <Button onClick={startScanning} className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  開始掃描
                </Button>
              ) : (
                <Button onClick={stopScanning} variant="outline" className="flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  停止掃描
                </Button>
              )}
              
              <Button onClick={handleManualCode} variant="outline" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                手動輸入
              </Button>
            </div>

            {/* 掃描狀態 */}
            {isScanning && (
              <div className="text-center py-4">
                <div className="animate-pulse text-blue-600">
                  正在掃描QR碼...
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  將QR碼對準掃描框
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 掃描結果 */}
      {scannedData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              掃描成功
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800">QR碼數據:</div>
                <div className="text-sm text-green-700 break-all">{scannedData}</div>
              </div>
              <Badge variant="default" className="bg-green-600">
                設備已連接
              </Badge>
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

      {/* 使用說明 */}
      <Card>
        <CardHeader>
          <CardTitle>使用說明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• 點擊"開始掃描"啟動相機</p>
            <p>• 將設備上的QR碼對準掃描框</p>
            <p>• 掃描成功後設備將自動連接</p>
            <p>• 如果掃描失敗，可以使用"手動輸入"功能</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 
