"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, Play, Plus, Loader2, AlertCircle, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { YouTubePlayer } from "./youtube-player"
import { YouTubeStorage, autoCategorizeVideo } from "@/lib/youtube-storage"

// YouTube API配置 - 用戶需要替換為真實的API Key
const YOUTUBE_API_KEY = 'AIzaSyDOo1gTzt44lV1bZR5K5l-OThTm8XmBsmQ' // 請替換為真實的Google API Key

interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  duration: string
  country: string
  category: string
  tags: string[]
  embedUrl: string
  publishedAt: string
  channelTitle: string
  addedAt: string
  viewCount: number
  embeddable?: boolean
}

interface YouTubeSearchProps {
  onVideoSelected: (video: YouTubeVideo) => void
  onClose: () => void
}

export function YouTubeSearch({ onVideoSelected, onClose }: YouTubeSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<YouTubeVideo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideo | null>(null)
  const [isVideoLoading, setIsVideoLoading] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    // 從LocalStorage載入最近的搜索記錄
    const saved = localStorage.getItem('youtube-recent-searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (error) {
        console.error('載入搜索記錄失敗:', error)
      }
    }
  }, [])

  const saveRecentSearch = (query: string) => {
    const updated = [query, ...recentSearches.filter(q => q !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('youtube-recent-searches', JSON.stringify(updated))
  }

  const searchYouTubeVideos = async (query: string) => {
    if (!query.trim()) return

    // 檢查API Key是否有效
    if (!YOUTUBE_API_KEY) {
      setError('請先設定YouTube API Key')
      toast({
        title: "配置錯誤",
        description: "請在組件中設定真實的YouTube API Key",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    setError(null)
    setSearchResults([])

    try {
      // 搜索YouTube影片
      const searchResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' 360 VR travel')}&type=video&videoDefinition=high&maxResults=20&key=${YOUTUBE_API_KEY}`
      )

      if (!searchResponse.ok) {
        throw new Error(`YouTube API錯誤: ${searchResponse.status}`)
      }

      const searchData = await searchResponse.json()

      if (!searchData.items || searchData.items.length === 0) {
        setError('沒有找到相關的360度旅遊影片')
        return
      }

      // 獲取影片詳細信息（包括時長）
      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',')
      const videosResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status&id=${videoIds}&key=${YOUTUBE_API_KEY}`
      )

      if (!videosResponse.ok) {
        throw new Error(`獲取影片詳情失敗: ${videosResponse.status}`)
      }

      const videosData = await videosResponse.json()

      // 處理搜索結果，過濾360度影片
      const processedVideos: YouTubeVideo[] = videosData.items
        .filter((item: any) => {
          const title = item.snippet.title.toLowerCase()
          const description = item.snippet.description.toLowerCase()
          const tags = item.snippet.tags || []
          
          // 檢查是否包含360度相關關鍵詞
          const has360Keywords = title.includes('360') || 
                                title.includes('vr') || 
                                description.includes('360') || 
                                description.includes('vr') ||
                                tags.some((tag: string) => 
                                  tag.toLowerCase().includes('360') || 
                                  tag.toLowerCase().includes('vr')
                                )
          
          return has360Keywords
        })
        .map((item: any) => {
          // 解析國家信息
          const country = extractCountryFromTitle(item.snippet.title, item.snippet.description)
          
          // 格式化時長
          const duration = formatDuration(item.contentDetails.duration)
          
          // 生成嵌入URL
          const embedUrl = `https://www.youtube.com/embed/${item.id}?rel=0&enablejsapi=1&playsinline=1&vr=1`
          
          return {
            id: item.id,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url,
            duration,
            country,
            category: autoCategorizeVideo(country),
            tags: item.snippet.tags || [],
            embedUrl,
            publishedAt: item.snippet.publishedAt,
            channelTitle: item.snippet.channelTitle,
            addedAt: new Date().toISOString(),
            viewCount: 0,
            embeddable: item.status?.embeddable === true
          }
        })

      if (processedVideos.length === 0) {
        setError('沒有找到符合條件的360度旅遊影片')
        return
      }

      setSearchResults(processedVideos)
      saveRecentSearch(query)
      
      toast({
        title: "搜索完成",
        description: `找到 ${processedVideos.length} 個360度旅遊影片`,
      })

    } catch (error) {
      console.error('YouTube搜索失敗:', error)
      setError(`搜索失敗: ${error instanceof Error ? error.message : '未知錯誤'}`)
      
      toast({
        title: "搜索失敗",
        description: error instanceof Error ? error.message : '未知錯誤',
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const extractCountryFromTitle = (title: string, description: string): string => {
    const countries = [
      '日本', '中國', '韓國', '泰國', '越南', '新加坡', '馬來西亞', '印尼', '菲律賓', '印度',
      '法國', '德國', '英國', '義大利', '西班牙', '荷蘭', '比利時', '瑞士', '奧地利', '希臘',
      '埃及', '摩洛哥', '南非', '肯亞', '坦尚尼亞', '奈及利亞', '迦納',
      '美國', '加拿大', '墨西哥', '巴西', '阿根廷', '智利', '秘魯', '哥倫比亞',
      '澳洲', '紐西蘭', '斐濟', '巴布亞紐幾內亞'
    ]

    const text = (title + ' ' + description).toLowerCase()
    
    for (const country of countries) {
      if (text.includes(country.toLowerCase())) {
        return country
      }
    }

    // 如果沒有找到具體國家，嘗試從標題推斷
    if (text.includes('tokyo') || text.includes('東京')) return '日本'
    if (text.includes('paris') || text.includes('巴黎')) return '法國'
    if (text.includes('london') || text.includes('倫敦')) return '英國'
    if (text.includes('new york') || text.includes('紐約')) return '美國'
    if (text.includes('sydney') || text.includes('雪梨')) return '澳洲'

    return '未知地區'
  }

  const formatDuration = (duration: string): string => {
    // 將ISO 8601格式轉換為可讀格式
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
    if (!match) return '未知'

    const hours = match[1] ? parseInt(match[1].replace('H', '')) : 0
    const minutes = match[2] ? parseInt(match[2].replace('M', '')) : 0
    const seconds = match[3] ? parseInt(match[3].replace('S', '')) : 0

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`
    }
  }

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchYouTubeVideos(searchQuery.trim())
    }
  }

  const handleVideoSelect = (video: YouTubeVideo) => {
    console.log('選擇視頻:', video) // 調試信息
    
    setSelectedVideo(video)
    setIsVideoLoading(true)
    setIsPlaying(false)
    
    // 自動存儲到localStorage
    try {
      const success = YouTubeStorage.addVideo(video)
      if (success) {
        toast({
          title: "視頻已添加",
          description: `${video.title} 已自動分類到 ${video.category} 並存儲到本地`,
        })
      } else {
        toast({
          title: "視頻已存在",
          description: "此視頻已在您的收藏中",
          variant: "default",
        })
      }
    } catch (error) {
      console.error('存儲視頻失敗:', error)
      toast({
        title: "存儲失敗",
        description: "無法將視頻存儲到本地",
        variant: "destructive",
      })
    }
    
    // 通知父組件視頻已選擇（用於更新播放列表）
    onVideoSelected(video)
    
    // 延遲一下再設置loading為false，給播放器一些時間初始化
    setTimeout(() => {
      setIsVideoLoading(false)
    }, 2000)
  }

  const handleVideoPlay = () => {
    setIsPlaying(true)
    setIsVideoLoading(false)
  }

  const handleVideoPause = () => {
    setIsPlaying(false)
  }

  const handleVideoStop = () => {
    setIsPlaying(false)
    setIsVideoLoading(false)
  }

  const handleVideoReady = () => {
    setIsVideoLoading(false)
  }

  const handleQuickSearch = (query: string) => {
    setSearchQuery(query)
    searchYouTubeVideos(query)
  }

  const handleBackToSearch = () => {
    setSelectedVideo(null)
    setIsVideoLoading(false)
    setIsPlaying(false)
  }

  // 如果已選擇視頻，顯示播放器
  if (selectedVideo) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-bold">播放360度旅遊影片</h2>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleBackToSearch}>
                返回搜索
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-6">
            {/* 視頻信息 */}
            <div className="mb-4 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-lg mb-2">{selectedVideo.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span>地區: {selectedVideo.country}</span>
                <span>時長: {selectedVideo.duration}</span>
                <span>頻道: {selectedVideo.channelTitle}</span>
              </div>
            </div>

            {/* 視頻播放器 */}
            <div className="relative">
              {isVideoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10 rounded-lg">
                  <div className="text-center text-white">
                    <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4" />
                    <p className="text-lg">正在載入視頻...</p>
                    <p className="text-sm opacity-75">請稍候，這可能需要幾秒鐘</p>
                  </div>
                </div>
              )}
              
              {/* 調試信息 */}
              <div className="mb-2 p-2 bg-yellow-50 border border-yellow-50 rounded text-xs text-yellow-800">
                <strong>調試信息:</strong> Video ID: {selectedVideo.id} | 標題: {selectedVideo.title}
              </div>
              
              {/* 簡單的iframe播放器作為備用 */}
              <div className="mb-4">
                <iframe
                  width="100%"
                  height="400"
                  src={`https://www.youtube.com/embed/${selectedVideo.id}?rel=0&enablejsapi=1&playsinline=1&vr=1`}
                  title={selectedVideo.title}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              
              {/* 高級YouTube播放器 */}
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">高級播放器（實驗性）:</h4>
                <YouTubePlayer
                  videoId={selectedVideo.id}
                  title={selectedVideo.title}
                  onPlay={handleVideoPlay}
                  onPause={handleVideoPause}
                  onStop={handleVideoStop}
                  onReady={handleVideoReady}
                  isPlaying={isPlaying}
                />
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="mt-6 flex justify-center gap-4">
              <Button
                onClick={() => onVideoSelected(selectedVideo)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                添加到播放列表
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(`https://www.youtube.com/watch?v=${selectedVideo.id}`, '_blank')}
              >
                <Play className="mr-2 h-4 w-4" />
                在YouTube中觀看
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">從YouTube搜索VR/360度旅遊影片</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="p-6">
          {/* 搜索輸入 */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="輸入搜索關鍵詞，如：360 VR travel Japan"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
              {isSearching ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              搜索
            </Button>
          </div>

          {/* 快速搜索建議 */}
          {recentSearches.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">最近搜索:</h3>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((query, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSearch(query)}
                    className="text-xs"
                  >
                    {query}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* 錯誤提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            </div>
          )}

          {/* 搜索結果 */}
          {searchResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">搜索結果 ({searchResults.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {searchResults.map((video) => (
                  <Card key={video.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="p-4">
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-full h-32 object-cover rounded"
                      />
                    </CardHeader>
                    <CardContent className="p-4">
                      <CardTitle className="text-sm font-semibold mb-2 line-clamp-2">
                        {video.title}
                      </CardTitle>
                      <div className="space-y-2 text-xs text-gray-600">
                        <p>地區: {video.country}</p>
                        <p>時長: {video.duration}</p>
                        <p>頻道: {video.channelTitle}</p>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleVideoSelect(video)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                        >
                          <Play className="mr-1 h-3 w-3" />
                          播放影片
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank')}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          預覽
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* 搜索中狀態 */}
          {isSearching && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-gray-600">正在搜索YouTube VR/360度旅遊影片...</p>
            </div>
          )}

          {/* 初始狀態 */}
          {!isSearching && searchResults.length === 0 && !error && (
            <div className="text-center py-8 text-gray-500">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>輸入關鍵詞開始搜索360度旅遊影片</p>
              <p className="text-sm mt-2">建議搜索：360 VR travel Japan, 360 VR travel France 等</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
