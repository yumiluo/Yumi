import mongoose from 'mongoose';

// MongoDB Atlas連接URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://your-username:your-password@cluster0.mongodb.net/vr-travel?retryWrites=true&w=majority';

// 數據庫連接選項
const connectOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0,
};

// 數據庫連接函數
export async function connectDatabase() {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✅ MongoDB已連接');
      return;
    }

    await mongoose.connect(MONGODB_URI, connectOptions);
    console.log('✅ MongoDB Atlas連接成功');
    
    // 監聽連接事件
    mongoose.connection.on('connected', () => {
      console.log('🔌 MongoDB連接已建立');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB連接錯誤:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB連接已斷開');
    });

    // 優雅關閉
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('✅ MongoDB連接已關閉');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ MongoDB連接失敗:', error);
    throw error;
  }
}

// 斷開數據庫連接
export async function disconnectDatabase() {
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB連接已關閉');
  } catch (error) {
    console.error('❌ 關閉MongoDB連接失敗:', error);
  }
}

// 檢查數據庫連接狀態
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

export default mongoose;
