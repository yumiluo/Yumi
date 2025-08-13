"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Wifi,
  Search,
  Plus,
  Smartphone,
  Monitor,
  Battery,
  Trash2,
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Cable,
  Bluetooth,
} from "lucide-react"
import { translations, type Language } from "@/lib/i18n"
import { deviceService, type DeviceInfo, type NetworkDevice } from "@/lib/device-manager"
import { bluetoothService, type BluetoothDeviceInfo } from "@/lib/bluetooth-manager"

interface DeviceConnectionProps {
  language: Language
  devices: DeviceInfo[]
  onDeviceAdded: (device: DeviceInfo) => void
  onDeviceRemoved: (deviceId: string) => void
  canManageDevices: boolean
}

export function DeviceConnection({
  language,
  devices,
  onDeviceAdded,
  onDeviceRemoved,
  canManageDevices,
}: DeviceConnectionProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [discoveredDevices, setDiscoveredDevices] = useState<NetworkDevice[]>([])
  const [bluetoothDevices, setBluetoothDevices] = useState<BluetoothDeviceInfo[]>([])
  const [scanProgress, setScanProgress] = useState(0)
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false)
  const [isPairingOpen, setIsPairingOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<NetworkDevice | null>(null)
  const [selectedBluetoothDevice, setSelectedBluetoothDevice] = useState<BluetoothDeviceInfo | null>(null)
  const [pairingCode, setPairingCode] = useState("")
  const [manualIP, setManualIP] = useState("")
  const [manualAuthCode, setManualAuthCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const t = translations[language]

  const handleScanDevices = async () => {
    console.log("開始掃描網絡設備...")
    setIsScanning(true)
    setScanProgress(0)
    setDiscoveredDevices([])
    setError("")

    // 模擬掃描進度
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 300)

    try {
      console.log("調用設備服務掃描...")
      const result = await deviceService.scanForDevices()
      console.log("掃描結果:", result)

      setDiscoveredDevices(result)
      setScanProgress(100)
      setSuccess(language === "zh" ? `發現 ${result.length} 個設備` : `Found ${result.length} devices`)

      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("掃描設備失敗:", error)
      setError(error.message || (language === "zh" ? "掃描失敗" : "Scan failed"))
    } finally {
      setIsScanning(false)
      setTimeout(() => setScanProgress(0), 1000)
    }
  }

  const handleScanBluetooth = async () => {
    console.log("開始掃描藍牙設備...")
    setIsScanning(true)
    setScanProgress(0)
    setBluetoothDevices([])
    setError("")

    // 模擬掃描進度
    const progressInterval = setInterval(() => {
      setScanProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 15
      })
    }, 400)

    try {
      console.log("調用藍牙服務掃描...")
      const result = await bluetoothService.scanForBluetoothDevices()
      console.log("藍牙掃描結果:", result)

      setBluetoothDevices(result)
      setScanProgress(100)
      setSuccess(language === "zh" ? `發現 ${result.length} 個藍牙設備` : `Found ${result.length} Bluetooth devices`)

      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("藍牙掃描失敗:", error)
      setError(error.message || (language === "zh" ? "藍牙掃描失敗" : "Bluetooth scan failed"))
    } finally {
      setIsScanning(false)
      setTimeout(() => setScanProgress(0), 1000)
    }
  }

  const handleConnectDevice = async (networkDevice: NetworkDevice, authCode?: string) => {
    console.log("連接設備:", networkDevice)
    setIsConnecting(true)
    setError("")

    try {
      const deviceInfo = await deviceService.connectToDevice(networkDevice.ipAddress, authCode)
      console.log("設備連接成功:", deviceInfo)

      onDeviceAdded(deviceInfo)
      setSuccess(language === "zh" ? "設備連接成功！" : "Device connected successfully!")

      setIsAddDeviceOpen(false)
      setIsPairingOpen(false)
      setSelectedDevice(null)
      setPairingCode("")

      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("設備連接失敗:", error)
      setError(error.message || (language === "zh" ? "設備連接失敗" : "Device connection failed"))
    } finally {
      setIsConnecting(false)
    }
  }

  const handleConnectBluetoothDevice = async (bluetoothDevice: BluetoothDeviceInfo) => {
    console.log("連接藍牙設備:", bluetoothDevice)
    setIsConnecting(true)
    setError("")

    try {
      const success = await bluetoothService.connectToBluetoothDevice(bluetoothDevice.id)

      if (success) {
        // 將藍牙設備轉換為DeviceInfo格式
        const deviceInfo: DeviceInfo = {
          id: bluetoothDevice.id,
          name: bluetoothDevice.name,
          type: bluetoothDevice.isVRDevice ? "standalone_vr" : "mobile_vr",
          brand: "Unknown",
          model: bluetoothDevice.name,
          ipAddress: "bluetooth://" + bluetoothDevice.address,
          macAddress: bluetoothDevice.address,
          status: "online",
          firmwareVersion: "1.0.0",
          connectionType: "wifi", // 藍牙設備也可能通過WiFi連接
          capabilities: bluetoothDevice.isVRDevice ? ["6DOF", "Bluetooth"] : ["Bluetooth"],
          currentTime: 0,
          lastSeen: "剛剛",
          isAuthenticated: true,
          authCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
        }

        onDeviceAdded(deviceInfo)
        setSuccess(language === "zh" ? "藍牙設備連接成功！" : "Bluetooth device connected successfully!")

        setIsPairingOpen(false)
        setSelectedBluetoothDevice(null)

        setTimeout(() => setSuccess(""), 3000)
      } else {
        throw new Error("Bluetooth connection failed")
      }
    } catch (error: any) {
      console.error("藍牙設備連接失敗:", error)
      setError(error.message || (language === "zh" ? "藍牙設備連接失敗" : "Bluetooth device connection failed"))
    } finally {
      setIsConnecting(false)
    }
  }

  const handleManualConnect = async () => {
    if (!manualIP) {
      setError(language === "zh" ? "請輸入設備IP地址" : "Please enter device IP address")
      return
    }

    console.log("手動連接設備:", manualIP)
    setIsConnecting(true)
    setError("")

    try {
      const deviceInfo = await deviceService.connectToDevice(manualIP, manualAuthCode)
      console.log("手動連接成功:", deviceInfo)

      onDeviceAdded(deviceInfo)
      setSuccess(language === "zh" ? "設備連接成功！" : "Device connected successfully!")

      setManualIP("")
      setManualAuthCode("")
      setIsAddDeviceOpen(false)

      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("手動連接失敗:", error)
      setError(error.message || (language === "zh" ? "設備連接失敗" : "Device connection failed"))
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRemoveDevice = async (deviceId: string) => {
    try {
      await deviceService.removeDevice(deviceId)
      onDeviceRemoved(deviceId)
      setSuccess(language === "zh" ? "設備移除成功" : "Device removed successfully")
      setTimeout(() => setSuccess(""), 3000)
    } catch (error: any) {
      console.error("設備移除失敗:", error)
      setError(error.message || (language === "zh" ? "設備移除失敗" : "Device removal failed"))
    }
  }

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "VR Headset":
        return <Monitor className="w-5 h-5" />
      case "Mobile Device":
        return <Smartphone className="w-5 h-5" />
      default:
        return <Monitor className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: DeviceInfo["status"]) => {
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

  return (
    <div className="space-y-6">
      {/* 成功/錯誤提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* 設備連接控制 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wifi className="w-5 h-5" />
                {language === "zh" ? "設備連接" : "Device Connection"}
              </CardTitle>
              <CardDescription>
                {language === "zh" ? "掃描和連接VR設備到系統" : "Scan and connect VR devices to the system"}
              </CardDescription>
            </div>
            {canManageDevices && (
              <div className="flex gap-2">
                <Button onClick={handleScanDevices} disabled={isScanning} variant="outline" data-scan-devices>
                  {isScanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  {language === "zh" ? "掃描網絡" : "Scan Network"}
                </Button>
                <Button onClick={handleScanBluetooth} disabled={isScanning} variant="outline">
                  {isScanning ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Bluetooth className="w-4 h-4 mr-2" />
                  )}
                  {language === "zh" ? "掃描藍牙" : "Scan Bluetooth"}
                </Button>
                <Dialog open={isAddDeviceOpen} onOpenChange={setIsAddDeviceOpen}>
                  <DialogTrigger asChild>
                    <Button data-add-device>
                      <Plus className="w-4 h-4 mr-2" />
                      {language === "zh" ? "添加設備" : "Add Device"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>{language === "zh" ? "添加VR設備" : "Add VR Device"}</DialogTitle>
                      <DialogDescription>
                        {language === "zh" ? "通過掃描或手動輸入來添加設備" : "Add devices by scanning or manual input"}
                      </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="network" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="network">
                          <Wifi className="w-4 h-4 mr-2" />
                          {language === "zh" ? "網絡掃描" : "Network Scan"}
                        </TabsTrigger>
                        <TabsTrigger value="bluetooth">
                          <Bluetooth className="w-4 h-4 mr-2" />
                          {language === "zh" ? "藍牙掃描" : "Bluetooth Scan"}
                        </TabsTrigger>
                        <TabsTrigger value="manual">
                          <Cable className="w-4 h-4 mr-2" />
                          {language === "zh" ? "手動添加" : "Manual Add"}
                        </TabsTrigger>
                      </TabsList>

                      {/* 網絡掃描 */}
                      <TabsContent value="network" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            {language === "zh" ? "掃描網絡中的VR設備" : "Scan for VR devices on network"}
                          </p>
                          <Button onClick={handleScanDevices} disabled={isScanning} size="sm">
                            <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
                            {language === "zh" ? "重新掃描" : "Rescan"}
                          </Button>
                        </div>

                        {isScanning && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">
                                {language === "zh" ? "正在掃描網絡..." : "Scanning network..."}
                              </span>
                            </div>
                            <Progress value={scanProgress} className="w-full" />
                          </div>
                        )}

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {discoveredDevices.map((device, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                {getDeviceIcon(device.deviceType)}
                                <div>
                                  <p className="font-medium">{device.deviceName}</p>
                                  <p className="text-sm text-gray-500">
                                    {device.ipAddress} • {device.manufacturer}
                                  </p>
                                </div>
                                {device.isVRDevice && (
                                  <Badge variant="default">{language === "zh" ? "VR設備" : "VR Device"}</Badge>
                                )}
                              </div>
                              {device.isVRDevice && (
                                <Button size="sm" onClick={() => handleConnectDevice(device)} disabled={isConnecting}>
                                  {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                  {language === "zh" ? "連接" : "Connect"}
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>

                        {discoveredDevices.length === 0 && !isScanning && (
                          <div className="text-center py-8 text-gray-500">
                            <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>{language === "zh" ? "未發現設備，請點擊掃描" : "No devices found, click scan"}</p>
                          </div>
                        )}
                      </TabsContent>

                      {/* 藍牙掃描 */}
                      <TabsContent value="bluetooth" className="space-y-4">
                        <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-600">
                            {language === "zh" ? "掃描藍牙VR設備" : "Scan for Bluetooth VR devices"}
                          </p>
                          <Button onClick={handleScanBluetooth} disabled={isScanning} size="sm">
                            <RefreshCw className={`w-4 h-4 mr-2 ${isScanning ? "animate-spin" : ""}`} />
                            {language === "zh" ? "重新掃描" : "Rescan"}
                          </Button>
                        </div>

                        {isScanning && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">
                                {language === "zh" ? "正在掃描藍牙..." : "Scanning Bluetooth..."}
                              </span>
                            </div>
                            <Progress value={scanProgress} className="w-full" />
                          </div>
                        )}

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {bluetoothDevices.map((device, index) => (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center gap-3">
                                <Bluetooth className="w-5 h-5 text-blue-500" />
                                <div>
                                  <p className="font-medium">{device.name}</p>
                                  <p className="text-sm text-gray-500">
                                    {device.address} • RSSI: {device.rssi}dBm
                                  </p>
                                </div>
                                {device.isVRDevice && (
                                  <Badge variant="default">{language === "zh" ? "VR設備" : "VR Device"}</Badge>
                                )}
                                {device.isPaired && (
                                  <Badge variant="secondary">{language === "zh" ? "已配對" : "Paired"}</Badge>
                                )}
                              </div>
                              <Button
                                size="sm"
                                onClick={() => handleConnectBluetoothDevice(device)}
                                disabled={isConnecting}
                              >
                                {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {device.isConnected
                                  ? language === "zh"
                                    ? "已連接"
                                    : "Connected"
                                  : language === "zh"
                                    ? "連接"
                                    : "Connect"}
                              </Button>
                            </div>
                          ))}
                        </div>

                        {bluetoothDevices.length === 0 && !isScanning && (
                          <div className="text-center py-8 text-gray-500">
                            <Bluetooth className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>
                              {language === "zh"
                                ? "未發現藍牙設備，請點擊掃描"
                                : "No Bluetooth devices found, click scan"}
                            </p>
                          </div>
                        )}
                      </TabsContent>

                      {/* 手動添加 */}
                      <TabsContent value="manual" className="space-y-4">
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="manual-ip">{language === "zh" ? "設備IP地址" : "Device IP Address"}</Label>
                            <Input
                              id="manual-ip"
                              placeholder="192.168.1.100"
                              value={manualIP}
                              onChange={(e) => setManualIP(e.target.value)}
                            />
                          </div>
                          <div>
                            <Label htmlFor="manual-auth">
                              {language === "zh" ? "認證碼 (可選)" : "Auth Code (Optional)"}
                            </Label>
                            <Input
                              id="manual-auth"
                              placeholder="ABC123"
                              value={manualAuthCode}
                              onChange={(e) => setManualAuthCode(e.target.value)}
                            />
                          </div>
                          <Button onClick={handleManualConnect} disabled={isConnecting} className="w-full">
                            {isConnecting ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Cable className="w-4 h-4 mr-2" />
                            )}
                            {language === "zh" ? "連接設備" : "Connect Device"}
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* 已連接設備列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5" />
            {language === "zh" ? "已連接設備" : "Connected Devices"}
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
                      <h3 className="font-medium">{device.name}</h3>
                      <Badge variant="outline">
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
                      <span>{device.ipAddress}</span>
                      <span className="mx-2">•</span>
                      <span>{device.connectionType === "wifi" ? "WiFi" : device.connectionType}</span>
                      <span className="mx-2">•</span>
                      <span>{device.firmwareVersion}</span>
                    </div>
                    <div className="flex gap-1 mt-1">
                      {device.capabilities.map((capability, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {capability}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {device.status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                  {device.status === "online" && <CheckCircle className="w-5 h-5 text-green-500" />}

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
                            <AlertDialogTitle>{language === "zh" ? "移除設備" : "Remove Device"}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {language === "zh"
                                ? `確定要移除設備 "${device.name}" 嗎？此操作無法撤銷。`
                                : `Are you sure you want to remove device "${device.name}"? This action cannot be undone.`}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{language === "zh" ? "取消" : "Cancel"}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveDevice(device.id)}>
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

            {devices.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{language === "zh" ? "尚未連接任何設備" : "No devices connected yet"}</p>
                <p className="text-sm mt-1">
                  {language === "zh" ? "點擊上方按鈕來添加設備" : "Click the button above to add devices"}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
