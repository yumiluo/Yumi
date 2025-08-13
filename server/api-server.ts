import express from "express"
import cors from "cors"
import multer from "multer"
import path from "path"
import fs from "fs"

const app = express()
const PORT = process.env.PORT || 3001

// 中間件
app.use(cors())
app.use(express.json())
app.use(express.static("public"))

// 文件上傳配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "public/uploads"
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
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
    password: "admin123", // 實際應用中應該加密
    role: "admin",
  },
  {
    id: "2",
    username: "user",
    email: "user@example.com",
    password: "user123",
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
    url: "/uploads/sample-video.mp4",
    thumbnail: "/uploads/sample-thumb.jpg",
    duration: "5:30",
    createdAt: new Date().toISOString(),
  },
]

const devices = []

// 認證中間件（簡化版，不使用JWT）
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

  // 生成簡單的會話ID
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

  // 檢查用戶是否已存在
  if (users.find((u) => u.email === email)) {
    return res.status(400).json({ error: "用戶已存在" })
  }

  const newUser = {
    id: Date.now().toString(),
    username,
    email,
    password, // 實際應用中應該加密
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
      thumbnail: `/uploads/default-thumb.jpg`, // 默認縮略圖
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

    // 簡單的YouTube URL驗證
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      return res.status(400).json({ error: "無效的YouTube URL" })
    }

    // 提取視頻ID（簡化版）
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

  // 如果是本地文件，刪除文件
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
  // 模擬設備掃描
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

  // 模擬掃描延遲
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

// 錯誤處理中間件
app.use((error, req, res, next) => {
  console.error("API錯誤:", error)
  res.status(500).json({ error: "內部服務器錯誤" })
})

// 404處理
app.use((req, res) => {
  res.status(404).json({ error: "API端點不存在" })
})

// 啟動服務器
app.listen(PORT, () => {
  console.log(`API服務器運行在端口 ${PORT}`)
})

export default app
