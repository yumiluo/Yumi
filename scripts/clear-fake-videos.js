// 清理LocalStorage中的假影片數據腳本
// 在瀏覽器控制台中運行此腳本

function clearFakeVideos() {
  try {
    console.log('🧹 開始清理假影片數據...')
    
    // 檢查LocalStorage中的影片數據
    const storedVideos = localStorage.getItem('vr-travel-videos')
    
    if (!storedVideos) {
      console.log('✅ 沒有找到影片數據，無需清理')
      return
    }
    
    const videos = JSON.parse(storedVideos)
    console.log(`📊 找到 ${videos.length} 個影片`)
    
    // 過濾掉假影片，只保留真實的YouTube影片
    const realVideos = videos.filter(video => {
      // 檢查是否有必要的YouTube字段
      const hasValidYouTubeFields = video.embedUrl && 
                                   video.embedUrl.includes('youtube.com/embed') &&
                                   video.id &&
                                   video.title &&
                                   video.country
      
      if (!hasValidYouTubeFields) {
        console.log(`❌ 發現假影片: ${video.title || '無標題'}`)
        return false
      }
      
      return true
    })
    
    console.log(`✅ 保留 ${realVideos.length} 個真實YouTube影片`)
    console.log(`🗑️ 清除 ${videos.length - realVideos.length} 個假影片`)
    
    // 更新LocalStorage
    if (realVideos.length > 0) {
      localStorage.setItem('vr-travel-videos', JSON.stringify(realVideos))
      console.log('💾 已更新LocalStorage，清除假影片數據')
    } else {
      localStorage.removeItem('vr-travel-videos')
      console.log('🗑️ 已清除所有影片數據（沒有真實影片）')
    }
    
    // 顯示清理結果
    if (realVideos.length > 0) {
      console.log('📋 保留的真實影片:')
      realVideos.forEach((video, index) => {
        console.log(`${index + 1}. ${video.title} (${video.country})`)
      })
    }
    
    console.log('🎉 假影片清理完成！')
    
  } catch (error) {
    console.error('❌ 清理假影片時發生錯誤:', error)
  }
}

// 執行清理
clearFakeVideos()

// 導出函數供其他地方使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clearFakeVideos }
}

