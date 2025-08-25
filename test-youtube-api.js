// 測試YouTube API的簡單腳本
const API_KEY = 'AIzaSyDOo1gTzt44lV1bZR5K5l-OThTm8XmBsmQ';

async function testYouTubeAPI() {
  try {
    console.log('🧪 測試YouTube API...');
    
    // 測試搜索API
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=360+VR+travel+Japan&type=video&videoDefinition=high&maxResults=5&key=${API_KEY}`;
    
    console.log('🔍 搜索URL:', searchUrl);
    
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`HTTP錯誤: ${response.status}`);
    }
    
    const data = await response.json();
    
    console.log('✅ API調用成功!');
    console.log('📊 找到影片數量:', data.items?.length || 0);
    
    if (data.items && data.items.length > 0) {
      console.log('🎬 第一個影片:');
      console.log('  標題:', data.items[0].snippet.title);
      console.log('  頻道:', data.items[0].snippet.channelTitle);
      console.log('  發布時間:', data.items[0].snippet.publishedAt);
    }
    
    return true;
  } catch (error) {
    console.error('❌ API測試失敗:', error.message);
    return false;
  }
}

// 在瀏覽器控制台中運行
if (typeof window !== 'undefined') {
  console.log('🌐 在瀏覽器中運行YouTube API測試...');
  testYouTubeAPI().then(success => {
    if (success) {
      console.log('🎉 YouTube API測試完成！');
    } else {
      console.log('💥 YouTube API測試失敗！');
    }
  });
} else {
  console.log('📱 在Node.js環境中運行...');
  testYouTubeAPI();
}

