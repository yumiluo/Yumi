import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import fs from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"

export interface User {
  id: string
  username: string
  email?: string
  passwordHash: string
  role: "admin" | "operator" | "viewer" | "guest"
  loginType: "local" | "google" | "guest"
  avatar?: string
  createdAt: string
  lastLogin?: string
  isActive: boolean
  permissions: string[]
}

export interface LoginResult {
  user: Omit<User, "passwordHash">
  token: string
}

export class UserManagementService {
  private jwtSecret = process.env.JWT_SECRET || "vr-video-manager-secret"
  private saltRounds = 10

  constructor() {
    this.ensureDataDirectory()
    this.createDefaultAdmin()
  }

  private async ensureDataDirectory() {
    try {
      const dataDir = path.join(process.cwd(), "data")
      await fs.mkdir(dataDir, { recursive: true })
    } catch (error) {
      console.error("創建數據目錄失敗:", error)
    }
  }

  private async createDefaultAdmin() {
    try {
      const users = await this.getAllUsers()
      const adminExists = users.some((user) => user.role === "admin")

      if (!adminExists) {
        const passwordHash = await bcrypt.hash("admin123", this.saltRounds)

        const adminUser: User = {
          id: uuidv4(),
          username: "admin",
          email: "admin@vrmanager.com",
          passwordHash,
          role: "admin",
          loginType: "local",
          createdAt: new Date().toISOString(),
          isActive: true,
          permissions: ["*"],
        }

        await this.saveUser(adminUser)
        console.log("默認管理員帳戶已創建: admin / admin123")
      }
    } catch (error) {
      console.error("創建默認管理員失敗:", error)
    }
  }

  async getAllUsers(): Promise<User[]> {
    try {
      const dbPath = path.join(process.cwd(), "data", "users.json")

      try {
        const data = await fs.readFile(dbPath, "utf-8")
        return JSON.parse(data)
      } catch (error) {
        return []
      }
    } catch (error) {
      console.error("獲取用戶列表失敗:", error)
      return []
    }
  }

  private async saveUser(user: User): Promise<User> {
    try {
      const users = await this.getAllUsers()
      const existingIndex = users.findIndex((u) => u.id === user.id)

      if (existingIndex >= 0) {
        users[existingIndex] = user
      } else {
        users.push(user)
      }

      const dbPath = path.join(process.cwd(), "data", "users.json")
      await fs.writeFile(dbPath, JSON.stringify(users, null, 2))

      return user
    } catch (error) {
      console.error("保存用戶失敗:", error)
      throw error
    }
  }

  async login(username: string, password: string): Promise<LoginResult> {
    try {
      const users = await this.getAllUsers()
      const user = users.find(
        (u) => (u.username === username || u.email === username) && u.loginType === "local" && u.isActive,
      )

      if (!user) {
        throw new Error("用戶不存在或已被禁用")
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
      if (!isPasswordValid) {
        throw new Error("密碼錯誤")
      }

      user.lastLogin = new Date().toISOString()
      await this.saveUser(user)

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
        },
        this.jwtSecret,
        { expiresIn: "24h" },
      )

      const { passwordHash, ...userWithoutPassword } = user

      return {
        user: userWithoutPassword,
        token,
      }
    } catch (error) {
      console.error("用戶登錄失敗:", error)
      throw error
    }
  }

  async register(username: string, email: string, password: string): Promise<LoginResult> {
    try {
      const users = await this.getAllUsers()

      if (users.some((u) => u.username === username)) {
        throw new Error("用戶名已存在")
      }

      if (users.some((u) => u.email === email)) {
        throw new Error("郵箱已存在")
      }

      if (password.length < 6) {
        throw new Error("密碼至少需要6個字符")
      }

      const passwordHash = await bcrypt.hash(password, this.saltRounds)

      const newUser: User = {
        id: uuidv4(),
        username,
        email,
        passwordHash,
        role: "viewer",
        loginType: "local",
        createdAt: new Date().toISOString(),
        isActive: true,
        permissions: ["view"],
      }

      await this.saveUser(newUser)

      return this.login(username, password)
    } catch (error) {
      console.error("用戶註冊失敗:", error)
      throw error
    }
  }

  async googleLogin(googleUser: {
    id: string
    name: string
    email: string
    picture?: string
  }): Promise<LoginResult> {
    try {
      const users = await this.getAllUsers()
      let user = users.find((u) => u.email === googleUser.email && u.loginType === "google")

      if (!user) {
        user = {
          id: `google_${googleUser.id}`,
          username: googleUser.name,
          email: googleUser.email,
          passwordHash: "",
          role: "viewer",
          loginType: "google",
          avatar: googleUser.picture,
          createdAt: new Date().toISOString(),
          isActive: true,
          permissions: ["view"],
        }

        await this.saveUser(user)
      } else {
        user.lastLogin = new Date().toISOString()
        if (googleUser.picture) {
          user.avatar = googleUser.picture
        }
        await this.saveUser(user)
      }

      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          role: user.role,
        },
        this.jwtSecret,
        { expiresIn: "24h" },
      )

      const { passwordHash, ...userWithoutPassword } = user

      return {
        user: userWithoutPassword,
        token,
      }
    } catch (error) {
      console.error("Google登錄失敗:", error)
      throw error
    }
  }

  async guestLogin(): Promise<LoginResult> {
    try {
      const guestUser: User = {
        id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        username: `訪客_${Math.random().toString(36).substr(2, 4)}`,
        passwordHash: "",
        role: "guest",
        loginType: "guest",
        createdAt: new Date().toISOString(),
        isActive: true,
        permissions: ["view"],
      }

      const token = jwt.sign(
        {
          userId: guestUser.id,
          username: guestUser.username,
          role: guestUser.role,
        },
        this.jwtSecret,
        { expiresIn: "4h" },
      )

      const { passwordHash, ...userWithoutPassword } = guestUser

      return {
        user: userWithoutPassword,
        token,
      }
    } catch (error) {
      console.error("訪客登錄失敗:", error)
      throw error
    }
  }

  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as any

      if (decoded.role === "guest") {
        return {
          id: decoded.userId,
          username: decoded.username,
          role: decoded.role,
          loginType: "guest",
          isActive: true,
          permissions: ["view"],
        } as User
      }

      const users = await this.getAllUsers()
      const user = users.find((u) => u.id === decoded.userId && u.isActive)

      return user || null
    } catch (error) {
      console.error("令牌驗證失敗:", error)
      return null
    }
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const users = await this.getAllUsers()
      const userIndex = users.findIndex((u) => u.id === userId)

      if (userIndex === -1) {
        throw new Error("用戶不存在")
      }

      const { id, passwordHash, createdAt, ...allowedUpdates } = updates

      users[userIndex] = { ...users[userIndex], ...allowedUpdates }
      await this.saveUser(users[userIndex])

      return users[userIndex]
    } catch (error) {
      console.error("更新用戶失敗:", error)
      throw error
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers()
      const user = users.find((u) => u.id === userId && u.loginType === "local")

      if (!user) {
        throw new Error("用戶不存在")
      }

      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash)
      if (!isOldPasswordValid) {
        throw new Error("原密碼錯誤")
      }

      if (newPassword.length < 6) {
        throw new Error("新密碼至少需要6個字符")
      }

      user.passwordHash = await bcrypt.hash(newPassword, this.saltRounds)
      await this.saveUser(user)

      return true
    } catch (error) {
      console.error("更改密碼失敗:", error)
      throw error
    }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const users = await this.getAllUsers()
      const userIndex = users.findIndex((u) => u.id === userId)

      if (userIndex === -1) {
        throw new Error("用戶不存在")
      }

      const adminUsers = users.filter((u) => u.role === "admin" && u.id !== userId)
      if (users[userIndex].role === "admin" && adminUsers.length === 0) {
        throw new Error("不能刪除最後一個管理員")
      }

      users.splice(userIndex, 1)

      const dbPath = path.join(process.cwd(), "data", "users.json")
      await fs.writeFile(dbPath, JSON.stringify(users, null, 2))

      return true
    } catch (error) {
      console.error("刪除用戶失敗:", error)
      throw error
    }
  }

  hasPermission(user: User, permission: string): boolean {
    if (user.permissions.includes("*")) {
      return true
    }

    return user.permissions.includes(permission)
  }

  getRolePermissions(role: string): string[] {
    const permissions: { [key: string]: string[] } = {
      admin: ["*"],
      operator: ["view", "control", "manage_devices", "manage_videos"],
      viewer: ["view"],
      guest: ["view"],
    }

    return permissions[role] || ["view"]
  }
}
