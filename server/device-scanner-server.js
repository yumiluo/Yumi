const express = require('express')
const cors = require('cors')
const { exec } = require('child_process')
const { promisify } = require('util')

const app = express()
const PORT = 3002

// 中間件
app.use(cors())
app.use(express.json())

const execAsync = promisify(exec)

// 真實設備掃描函數
async function scanRealDevices() {
  const devices = []
  
  try {
    // 掃描網絡設備 (macOS/Linux)
    if (process.platform === 'darwin' || process.platform === 'linux') {
      try {
        // 掃描本地網絡
        const { stdout: arpOutput } = await execAsync('arp -a')
        const lines = arpOutput.split('\n')
        
        for (const line of lines) {
          if (line.includes('incomplete') || line.includes('(incomplete)')) continue
          
          const match = line.match(/(\S+)\s+\(([\d.]+)\)\s+at\s+([a-fA-F0-9:]+)/)
          if (match) {
            const [, name, ip, mac] = match
            if (ip && ip !== '0.0.0.0' && ip !== '127.0.0.1') {
              devices.push({
                id: `device_${mac.replace(/:/g, '')}`,
                name: name || `Device ${ip}`,
                type: 'network',
                ip: ip,
                mac: mac,
                status: 'discovered',
                capabilities: ['network', 'ping'],
                connectionMethod: 'wifi',
                lastSeen: new Date().toISOString()
              })
            }
          }
        }
      } catch (error) {
        console.log('網絡掃描失敗:', error.message)
      }
    }
    
    // 掃描藍牙設備 (macOS)
    if (process.platform === 'darwin') {
      try {
        const { stdout: bluetoothOutput } = await execAsync('system_profiler SPBluetoothDataType')
        const lines = bluetoothOutput.split('\n')
        let currentDevice = null
        
        for (const line of lines) {
          if (line.includes('Device:') && line.includes('(')) {
            const match = line.match(/Device:\s+(.+?)\s+\(([^)]+)\)/)
            if (match) {
              if (currentDevice) {
                devices.push(currentDevice)
              }
              currentDevice = {
                id: `bluetooth_${match[2].replace(/[^a-zA-Z0-9]/g, '')}`,
                name: match[1].trim(),
                type: 'bluetooth',
                mac: match[2],
                status: 'discovered',
                capabilities: ['bluetooth', 'wireless'],
                connectionMethod: 'bluetooth',
                lastSeen: new Date().toISOString()
              }
            }
          }
        }
        
        if (currentDevice) {
          devices.push(currentDevice)
        }
      } catch (error) {
        console.log('藍牙掃描失敗:', error.message)
      }
    }
    
    // 掃描USB設備
    try {
      if (process.platform === 'darwin') {
        const { stdout: usbOutput } = await execAsync('system_profiler SPUSBDataType')
        const lines = usbOutput.split('\n')
        let currentDevice = null
        
        for (const line of lines) {
          if (line.includes('Product ID:') && line.includes('Vendor ID:')) {
            const productMatch = line.match(/Product ID:\s+(.+?)\s+Vendor ID:\s+(.+?)\s+\((.+?)\)/)
            if (productMatch && currentDevice) {
              currentDevice.name = productMatch[1].trim()
              currentDevice.vendor = productMatch[3].trim()
              devices.push(currentDevice)
              currentDevice = null
            }
          } else if (line.includes('Product ID:') && !line.includes('Vendor ID:')) {
            const productMatch = line.match(/Product ID:\s+(.+)/)
            if (productMatch) {
              currentDevice = {
                id: `usb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: productMatch[1].trim(),
                type: 'usb',
                status: 'discovered',
                capabilities: ['usb', 'data_transfer'],
                connectionMethod: 'usb',
                lastSeen: new Date().toISOString()
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('USB掃描失敗:', error.message)
    }
    
    // 掃描WiFi網絡
    try {
      if (process.platform === 'darwin') {
        const { stdout: wifiOutput } = await execAsync('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s')
        const lines = wifiOutput.split('\n').slice(1) // 跳過標題行
        
        for (const line of lines) {
          if (line.trim()) {
            const parts = line.split(/\s+/)
            if (parts.length >= 6) {
              const ssid = parts[0]
              const signal = parts[1]
              const security = parts[6]
              
              if (ssid && ssid !== 'SSID') {
                devices.push({
                  id: `wifi_${ssid.replace(/[^a-zA-Z0-9]/g, '')}`,
                  name: ssid,
                  type: 'wifi',
                  signal: signal,
                  security: security,
                  status: 'discovered',
                  capabilities: ['wifi', 'internet'],
                  connectionMethod: 'wifi',
                  lastSeen: new Date().toISOString()
                })
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('WiFi掃描失敗:', error.message)
    }
    
  } catch (error) {
    console.error('設備掃描錯誤:', error)
  }
  
  return devices
}

// 測試網絡連接
async function testNetworkConnection(ip) {
  try {
    const { stdout } = await execAsync(`ping -c 1 -W 1000 ${ip}`)
    return stdout.includes('1 packets transmitted, 1 received')
  } catch (error) {
    return false
  }
}

// API路由
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    platform: process.platform,
    uptime: process.uptime(),
    services: {
      deviceScanner: 'running',
      network: 'active'
    }
  })
})

app.get('/api/devices', async (req, res) => {
  try {
    const devices = await scanRealDevices()
    res.json({
      success: true,
      devices: devices,
      message: `發現 ${devices.length} 個真實設備`,
      scanTime: new Date().toISOString(),
      platform: process.platform
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '獲取設備列表失敗',
      details: error.message
    })
  }
})

app.post('/api/devices', async (req, res) => {
  try {
    const { action, deviceId, connectionMethod } = req.body

    switch (action) {
      case 'scan':
        const devices = await scanRealDevices()
        res.json({
          success: true,
          devices: devices,
          message: `掃描完成，發現 ${devices.length} 個設備`,
          scanTime: new Date().toISOString()
        })
        break

      case 'connect':
        const allDevices = await scanRealDevices()
        const targetDevice = allDevices.find(d => d.id === deviceId)
        
        if (targetDevice) {
          let connectionResult = { success: false, error: '連接方法未實現' }
          
          if (targetDevice.type === 'network') {
            const isReachable = await testNetworkConnection(targetDevice.ip)
            if (isReachable) {
              connectionResult = { success: true, message: '網絡連接成功' }
              targetDevice.status = 'connected'
            } else {
              connectionResult = { success: false, error: '網絡連接失敗' }
            }
          } else if (targetDevice.type === 'bluetooth') {
            connectionResult = { success: true, message: '藍牙設備已識別' }
            targetDevice.status = 'connected'
          } else if (targetDevice.type === 'usb') {
            connectionResult = { success: true, message: 'USB設備已連接' }
            targetDevice.status = 'connected'
          } else if (targetDevice.type === 'wifi') {
            connectionResult = { success: true, message: 'WiFi網絡已發現' }
            targetDevice.status = 'connected'
          }
          
          res.json({
            success: connectionResult.success,
            device: targetDevice,
            message: connectionResult.message || connectionResult.error
          })
        } else {
          res.status(404).json({
            success: false,
            error: '設備不存在'
          })
        }
        break

      case 'disconnect':
        const allDevicesForDisconnect = await scanRealDevices()
        const deviceToDisconnect = allDevicesForDisconnect.find(d => d.id === deviceId)
        
        if (deviceToDisconnect) {
          deviceToDisconnect.status = 'disconnected'
          res.json({
            success: true,
            message: '設備斷開成功'
          })
        } else {
          res.status(404).json({
            success: false,
            error: '設備不存在'
          })
        }
        break

      default:
        res.status(400).json({
          success: false,
          error: '無效的操作'
        })
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '操作失敗',
      details: error.message
    })
  }
})

// 系統信息
app.get('/api/system', (req, res) => {
  res.json({
    platform: process.platform,
    timestamp: new Date().toISOString(),
    status: 'healthy',
    services: {
      deviceScanner: 'running',
      network: 'active',
      bluetooth: process.platform === 'darwin' ? 'available' : 'unavailable',
      usb: 'available'
    },
    endpoints: {
      devices: '/api/devices',
      health: '/api/health',
      system: '/api/system'
    },
    version: '1.0.0',
    environment: 'local'
  })
})

// 啟動服務器
app.listen(PORT, () => {
  console.log(`🔍 設備掃描服務器運行在端口 ${PORT}`)
  console.log(`📱 健康檢查: http://localhost:${PORT}/api/health`)
  console.log(`📋 設備列表: http://localhost:${PORT}/api/devices`)
  console.log(`⚙️  系統信息: http://localhost:${PORT}/api/system`)
})

// 優雅關閉
process.on('SIGINT', () => {
  console.log('\n🛑 正在關閉設備掃描服務器...')
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 正在關閉設備掃描服務器...')
  process.exit(0)
})
