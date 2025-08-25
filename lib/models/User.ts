import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

// 用戶接口
export interface IUser extends Document {
  email: string;
  password: string;
  role: 'controller' | 'user';
  createdAt: Date;
  lastLogin?: Date;
  
  // 實例方法
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 用戶Schema
const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, '電子郵件是必需的'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      '請輸入有效的電子郵件地址'
    ]
  },
  password: {
    type: String,
    required: [true, '密碼是必需的'],
    minlength: [6, '密碼至少需要6個字符']
  },
  role: {
    type: String,
    enum: ['controller', 'user'],
    default: 'user'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password; // 不返回密碼
      return ret;
    }
  }
});

// 保存前加密密碼
userSchema.pre('save', async function(next) {
  // 只有當密碼被修改時才重新加密
  if (!this.isModified('password')) return next();
  
  try {
    // 生成鹽值並加密密碼
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 比較密碼方法
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('密碼比較失敗');
  }
};

// 靜態方法：根據郵箱查找用戶
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

// 靜態方法：創建用戶
userSchema.statics.createUser = async function(userData: { email: string; password: string; role?: 'controller' | 'user' }) {
  try {
    const user = new this(userData);
    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
};

// 導出模型
export const User = mongoose.model<IUser>('User', userSchema);

export default User;



