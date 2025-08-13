// YouTube API 集成
export interface YouTubeVideoInfo {
  id: string
  title: string
  description: string
  thumbnail: string
  duration: string
  channelTitle: string
  publishedAt: string
}

class YouTubeService {
  private apiKey = "YOUR_YOUTUBE_API_KEY" // 在實際使用中應該從環境變量獲取

  extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/user\/[^/]+#[^/]*\/[^/]*\/[^/]*\/([^&\n?#]+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  async getVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
    try {
      // 模擬 YouTube API 調用
      // 在實際環境中，這裡會調用真實的 YouTube Data API
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // 模擬返回的視頻信息
      return {
        id: videoId,
        title: `YouTube VR Video ${videoId}`,
        description: "This is a VR video from YouTube",
        thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        duration: "10:30",
        channelTitle: "VR Channel",
        publishedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Failed to fetch YouTube video info:", error)
      return null
    }
  }

  async validateVideoUrl(url: string): Promise<boolean> {
    const videoId = this.extractVideoId(url)
    if (!videoId) return false

    try {
      const info = await this.getVideoInfo(videoId)
      return info !== null
    } catch {
      return false
    }
  }

  getThumbnailUrl(videoId: string, quality: "default" | "medium" | "high" | "maxres" = "maxres"): string {
    return `https://img.youtube.com/vi/${videoId}/${quality}default.jpg`
  }
}

export const youtubeService = new YouTubeService()
