const express = require("express")
const cors = require("cors")
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { WebSocketServer } = require("ws")
const { createServer } = require("http")

const app = express()
const PORT = process.env.PORT || 3001

// 中間件
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

// 確保上傳目錄存在
const uploadDir = "public/uploads"
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// 文件上傳配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB限制
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|ogg|avi|mov/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)

    if (mimetype && extname) {
      return cb(null, true)
    } else {
      cb(new Error("不支持的文件類型"))
    }
  },
})

// 簡單的內存數據庫
const users = [
  {
    id: "1",
    username: "admin",
    email: "admin@example.com",
    password: "123456",
    role: "admin",
  },
  {
    id: "2",
    username: "user",
    email: "user@example.com",
    password: "123456",
    role: "user",
  },
]

const videos = [
  {
    id: "1",
    title: "示例VR視頻",
    description: "這是一個示例VR視頻",
    category: "演示",
    type: "local",
    url: "/placeholder.svg?height=200&width=300&text=Sample+VR+Video",
    thumbnail: "/placeholder.svg?height=120&width=200&text=VR+Video",
    duration: "5:30",
    createdAt: new Date().toISOString(),
  },
]

const devices = []

// 認證中間件
const authenticate = (req, res, next) => {
  const sessionId = req.headers["x-session-id"]
  if (!sessionId) {
    return res.status(401).json({ error: "需要會話ID" })
  }
  req.sessionId = sessionId
  next()
}

// 用戶認證路由
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body

  const user = users.find((u) => u.email === email && u.password === password)
  if (!user) {
    return res.status(401).json({ error: "無效的憑證" })
  }

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  res.json({
    sessionId,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  })
})

app.post("/api/auth/register", (req, res) => {
  const { username, email, password } = req.body

  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "用戶已存在" })
  }

  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    password,
    role: "user",
  }

  users.push(newUser)

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  res.json({
    sessionId,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    },
  })
})

app.post("/api/auth/guest", (req, res) => {
  const sessionId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  res.json({
    sessionId,
    user: {
      id: sessionId,
      username: `訪客_${sessionId.slice(-4)}`,
      email: "",
      role: "guest",
    },
  })
})

// 視頻管理路由
app.get("/api/videos", (req, res) => {
  res.json(videos)
})

app.post("/api/videos", authenticate, upload.single("video"), (req, res) => {
  try {
    const { title, description, category } = req.body
    const file = req.file

    if (!file) {
      return res.status(400).json({ error: "沒有上傳文件" })
    }

    const newVideo = {
      id: Date.now().toString(),
      title: title || file.originalname,
      description: description || "",
      category: category || "未分類",
      type: "local",
      url: `/uploads/${file.filename}`,
      thumbnail: "/placeholder.svg?height=120&width=200&text=VR+Video",
      duration: "未知",
      createdAt: new Date().toISOString(),
    }

    videos.push(newVideo)
    res.json(newVideo)
  } catch (error) {
    console.error("視頻上傳錯誤:", error)
    res.status(500).json({ error: "視頻上傳失敗" })
  }
})

app.post("/api/videos/youtube", authenticate, (req, res) => {
  try {
    const { url, title, category, description } = req.body

    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      return res.status(400).json({ error: "無效的YouTube URL" })
    }

    let videoId = ""
    if (url.includes("youtube.com/watch?v=")) {
      videoId = url.split("v=")[1].split("&")[0]
    } else if (url.includes("youtu.be/")) {
      videoId = url.split("youtu.be/")[1].split("?")[0]
    }

    const newVideo = {
      id: Date.now().toString(),
      title: title || `YouTube視頻_${videoId}`,
      description: description || "",
      category: category || "YouTube",
      type: "youtube",
      url: url,
      thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration: "未知",
      createdAt: new Date().toISOString(),
    }

    videos.push(newVideo)
    res.json(newVideo)
  } catch (error) {
    console.error("YouTube視頻添加錯誤:", error)
    res.status(500).json({ error: "YouTube視頻添加失敗" })
  }
})

app.delete("/api/videos/:id", authenticate, (req, res) => {
  const { id } = req.params
  const videoIndex = videos.findIndex((v) => v.id === id)

  if (videoIndex === -1) {
    return res.status(404).json({ error: "視頻不存在" })
  }

  const video = videos[videoIndex]

  if (video.type === "local" && video.url.startsWith("/uploads/")) {
    const filePath = path.join(__dirname, "../public", video.url)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  }

  videos.splice(videoIndex, 1)
  res.json({ message: "視頻已刪除" })
})

// 設備管理路由
app.get("/api/devices", authenticate, (req, res) => {
  res.json(devices)
})

app.post("/api/devices/scan", authenticate, (req, res) => {
  const mockDevices = [
    {
      id: `device_${Date.now()}_1`,
      name: "Meta Quest 3",
      type: "vr",
      ip: "192.168.1.100",
      status: "discovered",
      capabilities: ["6DOF", "Hand Tracking"],
    },
    {
      id: `device_${Date.now()}_2`,
      name: "HTC Vive Pro",
      type: "vr",
      ip: "192.168.1.101",
      status: "discovered",
      capabilities: ["6DOF", "Room Scale"],
    },
    {
      id: `device_${Date.now()}_3`,
      name: "iPhone 15",
      type: "mobile",
      ip: "192.168.1.102",
      status: "discovered",
      capabilities: ["Touch", "Gyroscope"],
    },
  ]

  setTimeout(() => {
    res.json(mockDevices)
  }, 2000)
})

app.post("/api/devices/connect", authenticate, (req, res) => {
  const { deviceId, ip, name, type } = req.body

  const newDevice = {
    id: deviceId || `device_${Date.now()}`,
    name: name || `設備_${ip}`,
    type: type || "unknown",
    ip: ip,
    status: "connected",
    connectedAt: new Date().toISOString(),
    capabilities: [],
    lastSeen: "剛剛",
  }

  devices.push(newDevice)
  res.json(newDevice)
})

app.delete("/api/devices/:id", authenticate, (req, res) => {
  const { id } = req.params
  const deviceIndex = devices.findIndex((d) => d.id === id)

  if (deviceIndex === -1) {
    return res.status(404).json({ error: "設備不存在" })
  }

  devices.splice(deviceIndex, 1)
  res.json({ message: "設備已移除" })
})

// 系統診斷路由
app.get("/api/diagnostics/system", authenticate, (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    },
    services: {
      api: true,
      websocket: true,
      database: true,
    },
    devices: devices.length,
    videos: videos.length,
    users: users.length,
  }

  res.json(diagnostics)
})

// 健康檢查
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// WebSocket服務器
const server = createServer(app)
const wss = new WebSocketServer({ server })

const sessions = new Map()

wss.on("connection", (ws, request) => {
  console.log("新的WebSocket連接")

  ws.on("message", async (data) => {
    try {
      const message = JSON.parse(data.toString())
      const { type, payload, sessionId } = message

      if (sessionId) {
        ws.sessionId = sessionId
      }

      switch (type) {
        case "device_register":
          const { deviceId, deviceName, deviceType } = payload
          ws.deviceId = deviceId

          let session = sessions.get(ws.sessionId || "default")
          if (!session) {
            session = {
              devices: new Map(),
              playbackState: "stopped",
            }
            sessions.set(ws.sessionId || "default", session)
          }

          session.devices.set(deviceId, {
            id: deviceId,
            name: deviceName,
            type: deviceType,
            ws: ws,
            status: "connected",
          })

          ws.send(
            JSON.stringify({
              type: "device_registered",
              payload: { deviceId, status: "connected" },
            }),
          )
          break

        case "play_video":
          broadcastToSession(ws.sessionId || "default", {
            type: "play_command",
            payload: payload,
          })
          break

        case "pause_video":
          broadcastToSession(ws.sessionId || "default", {
            type: "pause_command",
            payload: payload,
          })
          break

        case "stop_video":
          broadcastToSession(ws.sessionId || "default", {
            type: "stop_command",
            payload: payload,
          })
          break

        case "emergency_stop":
          broadcastToSession(ws.sessionId || "default", {
            type: "emergency_stop",
            payload: payload,
          })
          break
      }
    } catch (error) {
      console.error("WebSocket消息錯誤:", error)
    }
  })

  ws.on("close", () => {
    if (ws.sessionId && ws.deviceId) {
      const session = sessions.get(ws.sessionId)
      if (session) {
        session.devices.delete(ws.deviceId)
        if (session.devices.size === 0) {
          sessions.delete(ws.sessionId)
        }
      }
    }
    console.log("WebSocket連接關閉")
  })
})

function broadcastToSession(sessionId, message) {
  const session = sessions.get(sessionId)
  if (!session) return

  session.devices.forEach((device) => {
    if (device.ws.readyState === device.ws.OPEN) {
      try {
        device.ws.send(JSON.stringify(message))
      } catch (error) {
        console.error("廣播消息失敗:", error)
      }
    }
  })
}

// 啟動服務器
server.listen(PORT, () => {
  console.log(`VR視頻管理系統運行在 http://localhost:${PORT}`)
  console.log(`WebSocket服務器運行在 ws://localhost:${PORT}`)
})
