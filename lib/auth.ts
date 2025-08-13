interface User {
  id: string
  username: string
  email: string
  role: "admin" | "user" | "guest"
}

interface AuthResponse {
  sessionId: string
  user: User
}

class AuthManager {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  }

  // 註冊用戶
  async register(username: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "註冊失敗")
    }

    const data = await response.json()

    // 保存會話信息到localStorage
    localStorage.setItem("session_id", data.sessionId)
    localStorage.setItem("user", JSON.stringify(data.user))

    return data
  }

  // 用戶登錄
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "登錄失敗")
    }

    const data = await response.json()

    // 保存會話信息到localStorage
    localStorage.setItem("session_id", data.sessionId)
    localStorage.setItem("user", JSON.stringify(data.user))

    return data
  }

  // 訪客登錄
  async guestLogin(): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/api/auth/guest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "訪客登錄失敗")
    }

    const data = await response.json()

    // 保存會話信息到localStorage
    localStorage.setItem("session_id", data.sessionId)
    localStorage.setItem("user", JSON.stringify(data.user))

    return data
  }

  // Google OAuth登錄 (免費版本 - 使用簡單的彈窗模擬)
  async googleLogin(): Promise<AuthResponse> {
    // 模擬Google登錄流程
    const mockGoogleUser = {
      id: `google_${Date.now()}`,
      name: "Google用戶",
      email: "user@gmail.com",
    }

    // 創建模擬的Google用戶會話
    const sessionId = `google_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const user = {
      id: mockGoogleUser.id,
      username: mockGoogleUser.name,
      email: mockGoogleUser.email,
      role: "user" as const,
    }

    // 保存會話信息
    localStorage.setItem("session_id", sessionId)
    localStorage.setItem("user", JSON.stringify(user))

    return { sessionId, user }
  }

  // 登出
  logout(): void {
    localStorage.removeItem("session_id")
    localStorage.removeItem("user")
  }

  // 獲取當前用戶
  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem("user")
      return userStr ? JSON.parse(userStr) : null
    } catch (error) {
      return null
    }
  }

  // 獲取會話ID
  getSessionId(): string | null {
    return localStorage.getItem("session_id")
  }

  // 檢查是否已登錄
  isAuthenticated(): boolean {
    return !!this.getSessionId() && !!this.getCurrentUser()
  }

  // 獲取認證頭
  getAuthHeaders(): Record<string, string> {
    const sessionId = this.getSessionId()
    return sessionId ? { "X-Session-ID": sessionId } : {}
  }

  // 檢查用戶角色
  hasRole(role: string): boolean {
    const user = this.getCurrentUser()
    return user?.role === role
  }

  // 檢查是否為管理員
  isAdmin(): boolean {
    return this.hasRole("admin")
  }

  // 檢查是否為訪客
  isGuest(): boolean {
    return this.hasRole("guest")
  }

  // 創建WebSocket連接
  createWebSocketConnection(): WebSocket | null {
    const sessionId = this.getSessionId()
    if (!sessionId) return null

    const wsUrl = `ws://localhost:8080?sessionId=${sessionId}`
    return new WebSocket(wsUrl)
  }
}

export const authManager = new AuthManager()
export default authManager
export type { User, AuthResponse }
