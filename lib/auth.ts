import jwt from 'jsonwebtoken';
import { IUser } from './models/User';

// JWT密鑰（在生產環境中應該使用環境變量）
const JWT_SECRET = process.env.JWT_SECRET || 'vr-travel-secret-key-2024';

// JWT配置
const JWT_CONFIG = {
  expiresIn: '24h', // 24小時過期
  issuer: 'vr-travel-system',
  audience: 'vr-travel-users'
};

// 生成JWT token
export function generateToken(user: IUser): string {
  const payload = {
    userId: user._id,
    email: user.email,
    role: user.role
  };

  return jwt.sign(payload, JWT_SECRET, JWT_CONFIG);
}

// 驗證JWT token
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET, JWT_CONFIG);
  } catch (error) {
    throw new Error('無效的token');
  }
}

// 從請求頭中提取token
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  return null;
}

// 中間件：驗證JWT token
export function authenticateToken(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: '缺少認證token'
      });
    }

    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '無效的token'
    });
  }
}

// 中間件：檢查用戶角色
export function requireRole(role: 'controller' | 'user') {
  return function(req: any, res: any, next: any) {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未認證'
      });
    }

    if (req.user.role !== role && req.user.role !== 'controller') {
      return res.status(403).json({
        success: false,
        message: '權限不足'
      });
    }

    next();
  };
}

// 檢查token是否過期
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
}

// 刷新token（如果需要）
export function refreshToken(oldToken: string): string | null {
  try {
    const decoded = verifyToken(oldToken) as any;
    
    // 創建新的payload
    const payload = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    return jwt.sign(payload, JWT_SECRET, JWT_CONFIG);
  } catch (error) {
    return null;
  }
}

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
