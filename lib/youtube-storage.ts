// YouTube影片LocalStorage管理工具

export interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  duration: string
  country: string
  category: string // 新增：地理分類
  tags: string[]
  embedUrl: string
  publishedAt: string
  channelTitle: string
  addedAt: string
  viewCount: number
}

// 地理分類映射系統
export const GEOGRAPHIC_CATEGORIES = {
  '亞洲': ['日本', '中國', '韓國', '泰國', '越南', '新加坡', '馬來西亞', '印尼', '菲律賓', '印度', '台灣', '香港', '澳門', '蒙古', '北韓', '南韓', '柬埔寨', '寮國', '緬甸', '文萊', '東帝汶', '斯里蘭卡', '孟加拉', '尼泊爾', '不丹', '馬爾地夫', '巴基斯坦', '阿富汗', '伊朗', '伊拉克', '科威特', '沙烏地阿拉伯', '阿曼', '葉門', '阿聯酋', '卡達', '巴林', '約旦', '黎巴嫩', '敘利亞', '以色列', '巴勒斯坦', '塞浦路斯', '土耳其', '喬治亞', '亞美尼亞', '亞塞拜然', '哈薩克', '烏茲別克', '土庫曼', '吉爾吉斯', '塔吉克'],
  '歐洲': ['法國', '德國', '英國', '義大利', '西班牙', '荷蘭', '比利時', '瑞士', '奧地利', '希臘', '葡萄牙', '愛爾蘭', '丹麥', '芬蘭', '瑞典', '挪威', '冰島', '波蘭', '捷克', '斯洛伐克', '匈牙利', '羅馬尼亞', '保加利亞', '克羅埃西亞', '斯洛維尼亞', '波士尼亞', '塞爾維亞', '蒙特內哥羅', '北馬其頓', '阿爾巴尼亞', '愛沙尼亞', '拉脫維亞', '立陶宛', '白俄羅斯', '烏克蘭', '摩爾多瓦', '俄羅斯', '盧森堡', '列支敦斯登', '摩納哥', '安道爾', '聖馬利諾', '梵蒂岡', '馬爾他'],
  '中東': ['沙烏地阿拉伯', '伊朗', '伊拉克', '科威特', '阿曼', '葉門', '阿聯酋', '卡達', '巴林', '約旦', '黎巴嫩', '敘利亞', '以色列', '巴勒斯坦', '塞浦路斯', '土耳其', '埃及'],
  '非洲': ['埃及', '摩洛哥', '南非', '肯亞', '坦尚尼亞', '奈及利亞', '迦納', '阿爾及利亞', '突尼西亞', '利比亞', '蘇丹', '南蘇丹', '衣索比亞', '索馬利亞', '吉布地', '厄利垂亞', '烏干達', '盧安達', '蒲隆地', '中非共和國', '查德', '喀麥隆', '加彭', '剛果共和國', '剛果民主共和國', '安哥拉', '尚比亞', '辛巴威', '波札那', '納米比亞', '馬達加斯加', '模里西斯', '塞席爾', '葛摩', '馬利', '布吉納法索', '尼日', '查德', '馬利', '茅利塔尼亞', '塞內加爾', '甘比亞', '幾內亞比索', '幾內亞', '獅子山', '賴比瑞亞', '象牙海岸', '多哥', '貝南', '尼日', '喀麥隆', '赤道幾內亞', '聖多美和普林西比', '加彭', '剛果共和國', '剛果民主共和國', '中非共和國', '查德', '喀麥隆', '奈及利亞', '尼日', '查德', '蘇丹', '南蘇丹', '衣索比亞', '厄利垂亞', '吉布地', '索馬利亞', '肯亞', '烏干達', '盧安達', '蒲隆地', '坦尚尼亞', '馬達加斯加', '模里西斯', '塞席爾', '葛摩', '馬約特', '留尼旺', '聖赫勒拿', '阿森松', '特里斯坦-達庫尼亞'],
  '北美洲': ['美國', '加拿大', '墨西哥', '格陵蘭', '百慕達', '聖皮埃與密克隆群島'],
  '南美洲': ['巴西', '阿根廷', '智利', '秘魯', '哥倫比亞', '委內瑞拉', '厄瓜多', '玻利維亞', '巴拉圭', '烏拉圭', '蓋亞那', '蘇利南', '法屬蓋亞那', '福克蘭群島', '南喬治亞和南桑威奇群島'],
  '大洋洲': ['澳洲', '紐西蘭', '斐濟', '巴布亞紐幾內亞', '所羅門群島', '萬那杜', '新喀里多尼亞', '諾福克島', '聖誕島', '科科斯群島', '諾魯', '密克羅尼西亞', '馬紹爾群島', '帛琉', '關島', '北馬里亞納群島', '美屬薩摩亞', '東加', '薩摩亞', '庫克群島', '紐埃', '托克勞', '瓦利斯和富圖納', '皮特凱恩群島', '法屬波利尼西亞'],
  '北極': ['格陵蘭', '冰島', '挪威', '瑞典', '芬蘭', '俄羅斯', '加拿大', '美國'],
  '南極': ['南極洲']
}

// 自動分類函數
export function autoCategorizeVideo(country: string): string {
  const lowerCountry = country.toLowerCase()
  
  for (const [category, countries] of Object.entries(GEOGRAPHIC_CATEGORIES)) {
    if (countries.some(c => c.toLowerCase() === lowerCountry)) {
      return category
    }
  }
  
  // 如果沒有找到匹配，嘗試模糊匹配
  for (const [category, countries] of Object.entries(GEOGRAPHIC_CATEGORIES)) {
    if (countries.some(c => lowerCountry.includes(c.toLowerCase()) || c.toLowerCase().includes(lowerCountry))) {
      return category
    }
  }
  
  // 默認分類
  return '亞洲'
}

const STORAGE_KEY = 'vr-travel-videos'
const MAX_STORAGE_SIZE = 50 // 最大存儲影片數量

export class YouTubeStorage {
  /**
   * 獲取所有存儲的YouTube影片
   */
  static getAllVideos(): YouTubeVideo[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const videos = JSON.parse(stored) as YouTubeVideo[]
      return Array.isArray(videos) ? videos : []
    } catch (error) {
      console.error('讀取LocalStorage失敗:', error)
      return []
    }
  }

  /**
   * 添加新的YouTube影片（自動分類）
   */
  static addVideo(video: Omit<YouTubeVideo, 'addedAt' | 'viewCount' | 'category'>): boolean {
    try {
      const videos = this.getAllVideos()
      
      // 檢查是否已存在
      if (videos.some(v => v.id === video.id)) {
        console.log('影片已存在:', video.title)
        return false
      }
      
      // 檢查存儲限制
      if (videos.length >= MAX_STORAGE_SIZE) {
        console.warn('LocalStorage已滿，無法添加更多影片')
        return false
      }
      
      // 自動分類
      const category = autoCategorizeVideo(video.country)
      
      const newVideo: YouTubeVideo = {
        ...video,
        category, // 自動添加分類
        addedAt: new Date().toISOString(),
        viewCount: 0
      }
      
      videos.unshift(newVideo) // 新影片放在最前面
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
      
      console.log(`影片已添加到LocalStorage: ${newVideo.title} (分類: ${category})`)
      return true
    } catch (error) {
      console.error('添加影片到LocalStorage失敗:', error)
      return false
    }
  }

  /**
   * 根據分類獲取影片
   */
  static getVideosByCategory(category: string): YouTubeVideo[] {
    const videos = this.getAllVideos()
    return videos.filter(v => v.category === category)
  }

  /**
   * 獲取所有分類
   */
  static getAllCategories(): string[] {
    return Object.keys(GEOGRAPHIC_CATEGORIES)
  }

  /**
   * 獲取分類統計
   */
  static getCategoryStats() {
    const videos = this.getAllVideos()
    const stats: Record<string, number> = {}
    
    Object.keys(GEOGRAPHIC_CATEGORIES).forEach(category => {
      stats[category] = videos.filter(v => v.category === category).length
    })
    
    return stats
  }

  /**
   * 更新影片信息
   */
  static updateVideo(videoId: string, updates: Partial<YouTubeVideo>): boolean {
    try {
      const videos = this.getAllVideos()
      const index = videos.findIndex(v => v.id === videoId)
      
      if (index === -1) return false
      
      // 如果更新了國家，重新分類
      if (updates.country && updates.country !== videos[index].country) {
        updates.category = autoCategorizeVideo(updates.country)
      }
      
      videos[index] = { ...videos[index], ...updates }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videos))
      
      console.log('影片已更新:', videos[index].title)
      return true
    } catch (error) {
      console.error('更新影片失敗:', error)
      return false
    }
  }

  /**
   * 刪除影片
   */
  static removeVideo(videoId: string): boolean {
    try {
      const videos = this.getAllVideos()
      const filteredVideos = videos.filter(v => v.id !== videoId)
      
      if (filteredVideos.length === videos.length) return false
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredVideos))
      
      console.log('影片已從LocalStorage移除:', videoId)
      return true
    } catch (error) {
      console.error('移除影片失敗:', error)
      return false
    }
  }

  /**
   * 根據ID獲取影片
   */
  static getVideoById(videoId: string): YouTubeVideo | null {
    const videos = this.getAllVideos()
    return videos.find(v => v.id === videoId) || null
  }

  /**
   * 根據國家過濾影片
   */
  static getVideosByCountry(country: string): YouTubeVideo[] {
    const videos = this.getAllVideos()
    return videos.filter(v => v.country === country)
  }

  /**
   * 根據標籤過濾影片
   */
  static getVideosByTag(tag: string): YouTubeVideo[] {
    const videos = this.getAllVideos()
    return videos.filter(v => v.tags.some(t => t.toLowerCase().includes(tag.toLowerCase())))
  }

  /**
   * 搜索影片
   */
  static searchVideos(query: string): YouTubeVideo[] {
    const videos = this.getAllVideos()
    const lowerQuery = query.toLowerCase()
    
    return videos.filter(v => 
      v.title.toLowerCase().includes(lowerQuery) ||
      v.description.toLowerCase().includes(lowerQuery) ||
      v.country.toLowerCase().includes(lowerQuery) ||
      v.category.toLowerCase().includes(lowerQuery) ||
      v.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  /**
   * 增加觀看次數
   */
  static incrementViewCount(videoId: string): boolean {
    return this.updateVideo(videoId, {
      viewCount: (this.getVideoById(videoId)?.viewCount || 0) + 1
    })
  }

  /**
   * 獲取最受歡迎的影片
   */
  static getPopularVideos(limit: number = 10): YouTubeVideo[] {
    const videos = this.getAllVideos()
    return videos
      .sort((a, b) => b.viewCount - a.viewCount)
      .slice(0, limit)
  }

  /**
   * 獲取最近添加的影片
   */
  static getRecentVideos(limit: number = 10): YouTubeVideo[] {
    const videos = this.getAllVideos()
    return videos
      .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
      .slice(0, limit)
  }

  /**
   * 清空所有影片
   */
  static clearAllVideos(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY)
      console.log('所有影片已從LocalStorage清除')
      return true
    } catch (error) {
      console.error('清除影片失敗:', error)
      return false
    }
  }

  /**
   * 獲取存儲統計信息
   */
  static getStorageStats() {
    const videos = this.getAllVideos()
    const countries = [...new Set(videos.map(v => v.country))]
    const categories = [...new Set(videos.map(v => v.category))]
    const totalTags = videos.reduce((acc, v) => acc + v.tags.length, 0)
    const totalViews = videos.reduce((acc, v) => acc + v.viewCount, 0)
    
    return {
      totalVideos: videos.length,
      totalCountries: countries.length,
      totalCategories: categories.length,
      totalTags,
      totalViews,
      averageViews: videos.length > 0 ? Math.round(totalViews / videos.length) : 0,
      storageUsage: `${videos.length}/${MAX_STORAGE_SIZE}`,
      countries,
      categories,
      categoryStats: this.getCategoryStats()
    }
  }

  /**
   * 檢查存儲空間
   */
  static hasStorageSpace(): boolean {
    const videos = this.getAllVideos()
    return videos.length < MAX_STORAGE_SIZE
  }

  /**
   * 導出影片數據
   */
  static exportVideos(): string {
    try {
      const videos = this.getAllVideos()
      return JSON.stringify(videos, null, 2)
    } catch (error) {
      console.error('導出影片失敗:', error)
      return '[]'
    }
  }

  /**
   * 導入影片數據
   */
  static importVideos(jsonData: string): boolean {
    try {
      const videos = JSON.parse(jsonData) as YouTubeVideo[]
      
      if (!Array.isArray(videos)) {
        throw new Error('無效的數據格式')
      }
      
      // 驗證數據結構
      const isValidVideo = (video: any): video is YouTubeVideo => {
        return video && 
               typeof video.id === 'string' && 
               typeof video.title === 'string' &&
               typeof video.embedUrl === 'string'
      }
      
      const validVideos = videos.filter(isValidVideo)
      
      if (validVideos.length === 0) {
        throw new Error('沒有有效的影片數據')
      }
      
      // 檢查存儲空間
      if (validVideos.length > MAX_STORAGE_SIZE) {
        throw new Error(`影片數量超過限制 (${MAX_STORAGE_SIZE})`)
      }
      
      // 添加時間戳和自動分類
      const videosWithMetadata = validVideos.map(video => ({
        ...video,
        category: video.category || autoCategorizeVideo(video.country || '未知'),
        addedAt: video.addedAt || new Date().toISOString(),
        viewCount: video.viewCount || 0
      }))
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(videosWithMetadata))
      
      console.log(`成功導入 ${videosWithMetadata.length} 個影片`)
      return true
    } catch (error) {
      console.error('導入影片失敗:', error)
      return false
    }
  }
}

