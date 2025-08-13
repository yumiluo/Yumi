import authManager from "./auth"

interface Video {
  id: string
  title: string
  description?: string
  category: string
  type: "local" | "youtube"
  url: string
  thumbnail?: string
  duration: string
  createdAt: string
}

class VideoManager {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
  }

  // 獲取所有視頻
  async getAllVideos(): Promise<Video[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/videos`, {
        headers: {
          ...authManager.getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error("獲取視頻列表失敗")
      }

      return await response.json()
    } catch (error) {
      console.error("獲取視頻錯誤:", error)
      throw error
    }
  }

  // 上傳視頻
  async uploadVideo(file: File, metadata: { title: string; description?: string; category: string }): Promise<Video> {
    try {
      const formData = new FormData()
      formData.append("video", file)
      formData.append("title", metadata.title)
      formData.append("description", metadata.description || "")
      formData.append("category", metadata.category)

      const response = await fetch(`${this.baseUrl}/api/videos`, {
        method: "POST",
        headers: {
          ...authManager.getAuthHeaders(),
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error("視頻上傳失敗")
      }

      return await response.json()
    } catch (error) {
      console.error("視頻上傳錯誤:", error)
      throw error
    }
  }

  // 添加YouTube視頻
  async addYouTubeVideo(
    url: string,
    metadata: { title?: string; description?: string; category?: string },
  ): Promise<Video> {
    try {
      const response = await fetch(`${this.baseUrl}/api/videos/youtube`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authManager.getAuthHeaders(),
        },
        body: JSON.stringify({
          url,
          title: metadata.title,
          description: metadata.description,
          category: metadata.category || "YouTube",
        }),
      })

      if (!response.ok) {
        throw new Error("YouTube視頻添加失敗")
      }

      return await response.json()
    } catch (error) {
      console.error("YouTube視頻添加錯誤:", error)
      throw error
    }
  }

  // 刪除視頻
  async deleteVideo(videoId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/videos/${videoId}`, {
        method: "DELETE",
        headers: {
          ...authManager.getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error("視頻刪除失敗")
      }
    } catch (error) {
      console.error("視頻刪除錯誤:", error)
      throw error
    }
  }

  // 獲取視頻詳情
  async getVideo(videoId: string): Promise<Video> {
    try {
      const response = await fetch(`${this.baseUrl}/api/videos/${videoId}`, {
        headers: {
          ...authManager.getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error("獲取視頻詳情失敗")
      }

      return await response.json()
    } catch (error) {
      console.error("獲取視頻詳情錯誤:", error)
      throw error
    }
  }

  // 搜索視頻
  async searchVideos(query: string, category?: string): Promise<Video[]> {
    try {
      const params = new URLSearchParams()
      params.append("q", query)
      if (category) {
        params.append("category", category)
      }

      const response = await fetch(`${this.baseUrl}/api/videos/search?${params}`, {
        headers: {
          ...authManager.getAuthHeaders(),
        },
      })

      if (!response.ok) {
        throw new Error("視頻搜索失敗")
      }

      return await response.json()
    } catch (error) {
      console.error("視頻搜索錯誤:", error)
      throw error
    }
  }
}

export const videoManager = new VideoManager()
export default videoManager
export type { Video }
