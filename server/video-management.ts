import fs from "fs/promises"
import path from "path"
import { v4 as uuidv4 } from "uuid"
import ytdl from "ytdl-core"
import type Express from "express" // Declare the Express variable

export interface Video {
  id: string
  title: string
  description?: string
  category: string
  type: "youtube" | "local"
  url?: string
  filePath?: string
  thumbnail?: string
  duration?: number
  resolution?: string
  fileSize?: number
  createdAt: string
  updatedAt: string
  metadata: any
}

export class VideoManagementService {
  private videosDbPath = path.join(process.cwd(), "data", "videos.json")

  constructor() {
    this.ensureDataDirectory()
  }

  private async ensureDataDirectory() {
    try {
      const dataDir = path.join(process.cwd(), "data")
      await fs.mkdir(dataDir, { recursive: true })
    } catch (error) {
      console.error("創建數據目錄失敗:", error)
    }
  }

  // 獲取所有視頻
  async getAllVideos(): Promise<Video[]> {
    try {
      const data = await fs.readFile(this.videosDbPath, "utf-8")
      return JSON.parse(data)
    } catch (error) {
      return []
    }
  }

  // 保存視頻數據
  private async saveVideos(videos: Video[]): Promise<void> {
    await fs.writeFile(this.videosDbPath, JSON.stringify(videos, null, 2))
  }

  // 添加YouTube視頻
  async addYouTubeVideo(url: string, title?: string, category = "未分類"): Promise<Video> {
    try {
      console.log(`添加YouTube視頻: ${url}`)

      // 驗證YouTube URL
      if (!ytdl.validateURL(url)) {
        throw new Error("無效的YouTube URL")
      }

      // 獲取視頻信息
      const info = await ytdl.getInfo(url)
      const videoDetails = info.videoDetails

      // 獲取最佳質量的縮略圖
      const thumbnails = videoDetails.thumbnails
      const thumbnail = thumbnails[thumbnails.length - 1]?.url

      const video: Video = {
        id: uuidv4(),
        title: title || videoDetails.title,
        description: videoDetails.description,
        category,
        type: "youtube",
        url,
        thumbnail,
        duration: Number.parseInt(videoDetails.lengthSeconds),
        resolution: this.getBestFormat(info.formats)?.qualityLabel,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          youtubeId: videoDetails.videoId,
          author: videoDetails.author.name,
          viewCount: videoDetails.viewCount,
          publishDate: videoDetails.publishDate,
          keywords: videoDetails.keywords,
        },
      }

      // 保存到數據庫
      const videos = await this.getAllVideos()
      videos.push(video)
      await this.saveVideos(videos)

      console.log(`YouTube視頻添加成功: ${video.title}`)
      return video
    } catch (error) {
      console.error("添加YouTube視頻失敗:", error)
      throw error
    }
  }

  // 添加本地視頻
  async addLocalVideo(
    file: Express.Multer.File,
    title?: string,
    category = "未分類",
    description?: string,
  ): Promise<Video> {
    try {
      console.log(`添加本地視頻: ${file.originalname}`)

      // 生成縮略圖（簡化版本）
      const thumbnail = await this.generateThumbnail(file.path)

      // 獲取視頻元數據（需要ffprobe）
      const metadata = await this.getVideoMetadata(file.path)

      const video: Video = {
        id: uuidv4(),
        title: title || path.parse(file.originalname).name,
        description,
        category,
        type: "local",
        filePath: file.path,
        thumbnail,
        duration: metadata.duration,
        resolution: metadata.resolution,
        fileSize: file.size,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metadata: {
          originalName: file.originalname,
          mimeType: file.mimetype,
          encoding: file.encoding,
          ...metadata,
        },
      }

      // 保存到數據庫
      const videos = await this.getAllVideos()
      videos.push(video)
      await this.saveVideos(videos)

      console.log(`本地視頻添加成功: ${video.title}`)
      return video
    } catch (error) {
      console.error("添加本地視頻失敗:", error)
      throw error
    }
  }

  // 更新視頻
  async updateVideo(id: string, updates: Partial<Video>): Promise<Video | null> {
    try {
      const videos = await this.getAllVideos()
      const videoIndex = videos.findIndex((v) => v.id === id)

      if (videoIndex === -1) {
        return null
      }

      // 不允許更新某些字段
      const { id: _, createdAt, type, ...allowedUpdates } = updates

      videos[videoIndex] = {
        ...videos[videoIndex],
        ...allowedUpdates,
        updatedAt: new Date().toISOString(),
      }

      await this.saveVideos(videos)
      return videos[videoIndex]
    } catch (error) {
      console.error("更新視頻失敗:", error)
      throw error
    }
  }

  // 刪除視頻
  async deleteVideo(id: string): Promise<boolean> {
    try {
      const videos = await this.getAllVideos()
      const videoIndex = videos.findIndex((v) => v.id === id)

      if (videoIndex === -1) {
        return false
      }

      const video = videos[videoIndex]

      // 如果是本地視頻，刪除文件
      if (video.type === "local" && video.filePath) {
        try {
          await fs.unlink(video.filePath)
          console.log(`已刪除視頻文件: ${video.filePath}`)
        } catch (error) {
          console.error("刪除視頻文件失敗:", error)
        }

        // 刪除縮略圖
        if (video.thumbnail && video.thumbnail.startsWith("/uploads/")) {
          try {
            const thumbnailPath = path.join(process.cwd(), video.thumbnail)
            await fs.unlink(thumbnailPath)
          } catch (error) {
            console.error("刪除縮略圖失敗:", error)
          }
        }
      }

      // 從數據庫中移除
      videos.splice(videoIndex, 1)
      await this.saveVideos(videos)

      console.log(`視頻已刪除: ${video.title}`)
      return true
    } catch (error) {
      console.error("刪除視頻失敗:", error)
      throw error
    }
  }

  // 獲取視頻流URL（用於播放）
  async getVideoStreamUrl(id: string, quality?: string): Promise<string | null> {
    try {
      const videos = await this.getAllVideos()
      const video = videos.find((v) => v.id === id)

      if (!video) {
        return null
      }

      if (video.type === "youtube" && video.url) {
        // 獲取YouTube流URL
        const info = await ytdl.getInfo(video.url)
        const format = this.getBestFormat(info.formats, quality)
        return format?.url || null
      } else if (video.type === "local" && video.filePath) {
        // 返回本地文件路徑
        return `/uploads/${path.basename(video.filePath)}`
      }

      return null
    } catch (error) {
      console.error("獲取視頻流URL失敗:", error)
      return null
    }
  }

  // 按類別獲取視頻
  async getVideosByCategory(category: string): Promise<Video[]> {
    const videos = await this.getAllVideos()
    return videos.filter((v) => v.category === category)
  }

  // 搜索視頻
  async searchVideos(query: string): Promise<Video[]> {
    const videos = await this.getAllVideos()
    const lowerQuery = query.toLowerCase()

    return videos.filter(
      (v) =>
        v.title.toLowerCase().includes(lowerQuery) ||
        v.description?.toLowerCase().includes(lowerQuery) ||
        v.category.toLowerCase().includes(lowerQuery),
    )
  }

  // 獲取所有類別
  async getCategories(): Promise<string[]> {
    const videos = await this.getAllVideos()
    const categories = new Set(videos.map((v) => v.category))
    return Array.from(categories).sort()
  }

  // 輔助方法
  private getBestFormat(formats: any[], quality?: string): any {
    // 過濾出視頻格式
    const videoFormats = formats.filter((f) => f.hasVideo && f.hasAudio)

    if (quality) {
      const qualityFormat = videoFormats.find((f) => f.qualityLabel === quality)
      if (qualityFormat) return qualityFormat
    }

    // 返回最高質量格式
    return videoFormats.sort((a, b) => (b.height || 0) - (a.height || 0))[0]
  }

  private async generateThumbnail(videoPath: string): Promise<string | undefined> {
    try {
      // 使用ffmpeg生成縮略圖（需要安裝ffmpeg）
      const { exec } = require("child_process")
      const { promisify } = require("util")
      const execAsync = promisify(exec)

      const thumbnailDir = path.join(process.cwd(), "uploads", "thumbnails")
      await fs.mkdir(thumbnailDir, { recursive: true })

      const thumbnailName = `thumb_${Date.now()}.jpg`
      const thumbnailPath = path.join(thumbnailDir, thumbnailName)

      await execAsync(`ffmpeg -i "${videoPath}" -ss 00:00:01 -vframes 1 -y "${thumbnailPath}"`)

      return `/uploads/thumbnails/${thumbnailName}`
    } catch (error) {
      console.error("生成縮略圖失敗:", error)
      return undefined
    }
  }

  private async getVideoMetadata(videoPath: string): Promise<any> {
    try {
      // 使用ffprobe獲取視頻元數據
      const { exec } = require("child_process")
      const { promisify } = require("util")
      const execAsync = promisify(exec)

      const { stdout } = await execAsync(
        `ffprobe -v quiet -print_format json -show_format -show_streams "${videoPath}"`,
      )
      const metadata = JSON.parse(stdout)

      const videoStream = metadata.streams.find((s: any) => s.codec_type === "video")

      return {
        duration: Number.parseFloat(metadata.format.duration),
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : undefined,
        bitrate: Number.parseInt(metadata.format.bit_rate),
        codec: videoStream?.codec_name,
        fps: videoStream ? eval(videoStream.r_frame_rate) : undefined,
      }
    } catch (error) {
      console.error("獲取視頻元數據失敗:", error)
      return {}
    }
  }
}
