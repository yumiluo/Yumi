"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Smartphone,
  Battery,
  Wifi,
  Trash2,
  Settings,
  CheckCircle,
  AlertCircle,
  Apple,
  Chrome,
  Monitor,
} from "lucide-react"
import { translations, type Language } from "@/lib/i18n"
import type { MobileDeviceInfo } from "@/lib/mobile-device-manager"

interface MobileDeviceListProps {
  language: Language
  devices: MobileDeviceInfo[]
  onDeviceRemoved: (deviceId: string) => void
  canManageDevices: boolean
}

export function MobileDeviceList({ language, devices, onDeviceRemoved, canManageDevices }: MobileDeviceListProps) {
  const t = translations[language]

  const getStatusColor = (status: MobileDeviceInfo["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "playing":
      case "synced":
        return "bg-blue-500"
      case "paused":
        return "bg-yellow-500"
      case "connecting":
        return "bg-orange-500"
      case "error":
        return "bg-red-500"
      case "offline":
      default:
        return "bg-gray-500"
    }
  }

  const getStatusText = (status: MobileDeviceInfo["status"]) => {
    const statusMap = {
      online: t.online,
      playing: t.playing,
      synced: t.synced,
      paused: t.paused,
      offline: t.offline,
      connecting: "連接中",
      error: "錯誤",
    }
    return statusMap[status] || t.offline
  }

  const getDeviceIcon = (type: MobileDeviceInfo["type"]) => {
    switch (type) {
      case "ios":
        return <Apple className="w-5 h-5 text-gray-600" />
      case "android":
        return <Chrome className="w-5 h-5 text-green-600" />
      case "web":
        return <Monitor className="w-5 h-5 text-blue-600" />
      default:
        return <Smartphone className="w-5 h-5" />
    }
  }

  const getDeviceTypeLabel = (type: MobileDeviceInfo["type"]) => {
    switch (type) {
      case "ios":
        return "iOS"
      case "android":
        return "Android"
      case "web":
        return "Web"
      default:
        return "Mobile"
    }
  }

  if (devices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            {language === "zh" ? "已連接手機設備" : "Connected Mobile Devices"}
            <Badge variant="secondary">0</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{language === "zh" ? "尚未連接任何手機設備" : "No mobile devices connected yet"}</p>
            <p className="text-sm mt-1">
              {language === "zh"
                ? "使用上方的QR碼或連接碼來添加手機設備"
                : "Use QR code or connection code above to add mobile devices"}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          {language === "zh" ? "已連接手機設備" : "Connected Mobile Devices"}
          <Badge variant="secondary">{devices.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map((device) => (
            <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(device.status)}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getDeviceIcon(device.type)}
                    <h3 className="font-medium">{device.name}</h3>
                    <Badge variant="outline">{getDeviceTypeLabel(device.type)}</Badge>
                    <Badge variant="secondary">
                      {device.brand} {device.model}
                    </Badge>
                    {device.batteryLevel && (
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Battery className="w-3 h-3" />
                        {device.batteryLevel}%
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    <span>{device.screenSize}</span>
                    <span className="mx-2">•</span>
                    <span>{device.osVersion}</span>
                    <span className="mx-2">•</span>
                    <span>{device.browserInfo}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {getStatusText(device.status)} • {device.lastSeen}
                  </div>
                  <div className="flex gap-1 mt-2">
                    {device.capabilities.map((capability, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {capability}
                      </Badge>
                    ))}
                  </div>
                  {device.currentVideo && (
                    <div className="mt-2">
                      <Badge variant="default" className="text-xs">
                        正在播放: {device.currentVideo}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {device.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                {device.status === "online" && <CheckCircle className="w-5 h-5 text-green-500" />}
                {device.isConnected && <Wifi className="w-4 h-4 text-blue-500" />}

                {canManageDevices && (
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {language === "zh" ? "移除手機設備" : "Remove Mobile Device"}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {language === "zh"
                              ? `確定要移除手機設備 "${device.name}" 嗎？此操作無法撤銷。`
                              : `Are you sure you want to remove mobile device "${device.name}"? This action cannot be undone.`}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{language === "zh" ? "取消" : "Cancel"}</AlertDialogCancel>
                          <AlertDialogAction onClick={() => onDeviceRemoved(device.id)}>
                            {language === "zh" ? "移除" : "Remove"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
