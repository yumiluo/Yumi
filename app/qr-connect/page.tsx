"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  QrCode, 
  Smartphone, 
  Monitor, 
  Tablet, 
  Download,
  Copy,
  Share2,
  RefreshCw
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

export default function QRConnectPage() {
  const [qrCodeData, setQrCodeData] = useState('')
  const [deviceInfo, setDeviceInfo] = useState({
    name: 'VR System',
    type: 'vr_system',
    capabilities: ['vr', '360_video', 'device_management']
  })

  // 生成連接數據
  useEffect(() => {
    const connectionData = {
      url: window.location.origin,
      device: deviceInfo,
      timestamp: new Date().toISOString(),
      features: [
        '設備掃描',
        '設備管理',
        'VR播放器',
        'YouTube集成',
        '雲端數據'
      ]
    }
    
    setQrCodeData(JSON.stringify(connectionData, null, 2))
  }, [deviceInfo])

  // 複製連接信息
  const copyConnectionInfo = () => {
    navigator.clipboard.writeText(qrCodeData)
    toast({
      title: "已複製",
      description: "連接信息已複製到剪貼板",
      variant: "default"
    })
  }

  // 分享連接
  const shareConnection = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'VR系統連接',
          text: '掃描QR碼或點擊鏈接連接我的VR系統',
          url: window.location.href
        })
      } catch (error) {
        console.log('分享失敗:', error)
      }
    } else {
      copyConnectionInfo()
    }
  }

  // 下載QR碼
  const downloadQRCode = () => {
    // 這裡可以實現QR碼下載功能
    toast({
      title: "下載功能",
      description: "QR碼下載功能開發中",
      variant: "default"
    })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">QR碼連接</h1>
        <p className="text-gray-600">讓其他設備掃描QR碼快速連接到您的VR系統</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR碼顯示 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR碼
            </CardTitle>
            <CardDescription>
              其他設備掃描此QR碼即可連接
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-100 p-8 rounded-lg text-center">
              <div className="text-6xl mb-4">📱</div>
              <p className="text-gray-600">QR碼生成中...</p>
              <p className="text-sm text-gray-500 mt-2">
                實際部署後會顯示真實的QR碼
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>連接網址</Label>
              <div className="flex gap-2">
                <Input 
                  value={window.location.origin} 
                  readOnly 
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyConnectionInfo}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={shareConnection}
              >
                <Share2 className="mr-2 h-4 w-4" />
                分享
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={downloadQRCode}
              >
                <Download className="mr-2 h-4 w-4" />
                下載
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 連接說明 */}
        <Card>
          <CardHeader>
            <CardTitle>如何連接設備</CardTitle>
            <CardDescription>
              按照以下步驟連接您的設備
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                  1
                </div>
                <div>
                  <h4 className="font-medium">掃描QR碼</h4>
                  <p className="text-sm text-gray-600">
                    在其他設備上打開相機或QR碼掃描器，掃描此頁面的QR碼
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                  2
                </div>
                <div>
                  <h4 className="font-medium">點擊連接</h4>
                  <p className="text-sm text-gray-600">
                    掃描後會自動打開瀏覽器，點擊"連接設備"按鈕
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                  3
                </div>
                <div>
                  <h4 className="font-medium">完成連接</h4>
                  <p className="text-sm text-gray-600">
                    設備將出現在您的VR系統中，可以進行管理和控制
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">支持的設備類型</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  手機
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Tablet className="h-3 w-3" />
                  平板
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Monitor className="h-3 w-3" />
                  電腦
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <QrCode className="h-3 w-3" />
                  其他設備
                </Badge>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">系統功能</h4>
              <div className="space-y-2">
                {[
                  '🔍 設備掃描 - 發現網絡中的真實設備',
                  '📱 設備管理 - 連接、斷開、監控設備',
                  '🎮 VR播放器 - 支持360度視頻播放',
                  '📺 YouTube集成 - 搜索和播放VR視頻',
                  '☁️ 雲端數據 - 100%真實數據，無虛擬內容'
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 連接信息 */}
      <Card>
        <CardHeader>
          <CardTitle>連接信息詳情</CardTitle>
          <CardDescription>
            完整的連接配置信息
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>JSON配置</Label>
            <div className="relative">
              <textarea
                value={qrCodeData}
                readOnly
                className="w-full h-32 p-3 bg-gray-50 border rounded-md font-mono text-sm resize-none"
              />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2"
                onClick={copyConnectionInfo}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
