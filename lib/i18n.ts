export const translations = {
  zh: {
    // Navigation & General
    title: "VR視頻管理系統",
    subtitle: "同步控制多個VR設備播放視頻",
    login: "登入",
    logout: "登出",
    language: "語言",

    // Tabs
    control: "播放控制",
    devices: "設備管理",
    videos: "視頻庫",
    users: "用戶管理",

    // Login
    loginTitle: "系統登入",
    username: "用戶名",
    password: "密碼",
    loginButton: "登入",
    loginError: "用戶名或密碼錯誤",

    // Device Control
    selectDevices: "選擇設備",
    selectDevicesDesc: "選擇要控制的VR設備",
    selectVideo: "選擇視頻",
    selectVideoDesc: "選擇要播放的VR視頻",
    play: "播放",
    pause: "暫停",
    stop: "停止",
    sync: "同步",

    // Device Status
    online: "在線",
    playing: "播放中",
    paused: "暫停",
    offline: "離線",
    synced: "已同步",

    // Video Management
    addYoutubeVideo: "添加YouTube視頻",
    addVideo: "添加視頻",
    deleteVideo: "刪除視頻",
    categoryFilter: "分類篩選",
    all: "全部",

    // Categories
    action: "動作",
    adventure: "冒險",
    education: "教育",
    entertainment: "娛樂",
    documentary: "紀錄片",
    experience: "體驗",
    other: "其他",

    // System Status
    systemStatus: "系統狀態",
    onlineDevices: "在線設備",
    playingDevices: "播放中",
    pausedDevices: "暫停中",
    totalVideos: "視頻總數",

    // Sync Control
    syncControl: "同步控制",
    currentTime: "當前時間",
    syncAllDevices: "同步所有設備",
    syncSuccess: "同步成功",

    // User Management
    userManagement: "用戶管理",
    addUser: "添加用戶",
    editUser: "編輯用戶",
    deleteUser: "刪除用戶",
    role: "角色",
    admin: "管理員",
    operator: "操作員",
    viewer: "觀看者",

    // Messages
    selectDevicesAndVideo: "請選擇設備和視頻",
    selectDevices: "請選擇設備",
    fillAllFields: "請填寫所有必要信息",
    confirmDelete: "確認刪除",

    // Dialog
    cancel: "取消",
    confirm: "確認",
    save: "保存",
    edit: "編輯",
    delete: "刪除",

    // Auth
    register: "註冊",
    email: "郵箱",
    confirmPassword: "確認密碼",
    signInWithGoogle: "使用 Google 登入",
    signUpWithGoogle: "使用 Google 註冊",
    continueAsGuest: "以訪客身分登入",
    guest: "訪客",
    passwordMismatch: "密碼不匹配",
    passwordTooShort: "密碼至少需要6個字符",
    userExists: "用戶名或郵箱已存在",
    registrationFailed: "註冊失敗",
    googleLoginFailed: "Google登入失敗",
    guestLoginFailed: "訪客登入失敗",
  },
  en: {
    // Navigation & General
    title: "VR Video Management System",
    subtitle: "Synchronously control multiple VR devices for video playback",
    login: "Login",
    logout: "Logout",
    language: "Language",

    // Tabs
    control: "Playback Control",
    devices: "Device Management",
    videos: "Video Library",
    users: "User Management",

    // Login
    loginTitle: "System Login",
    username: "Username",
    password: "Password",
    loginButton: "Login",
    loginError: "Invalid username or password",

    // Device Control
    selectDevices: "Select Devices",
    selectDevicesDesc: "Select VR devices to control",
    selectVideo: "Select Video",
    selectVideoDesc: "Select VR video to play",
    play: "Play",
    pause: "Pause",
    stop: "Stop",
    sync: "Sync",

    // Device Status
    online: "Online",
    playing: "Playing",
    paused: "Paused",
    offline: "Offline",
    synced: "Synced",

    // Video Management
    addYoutubeVideo: "Add YouTube Video",
    addVideo: "Add Video",
    deleteVideo: "Delete Video",
    categoryFilter: "Category Filter",
    all: "All",

    // Categories
    action: "Action",
    adventure: "Adventure",
    education: "Education",
    entertainment: "Entertainment",
    documentary: "Documentary",
    experience: "Experience",
    other: "Other",

    // System Status
    systemStatus: "System Status",
    onlineDevices: "Online Devices",
    playingDevices: "Playing",
    pausedDevices: "Paused",
    totalVideos: "Total Videos",

    // Sync Control
    syncControl: "Sync Control",
    currentTime: "Current Time",
    syncAllDevices: "Sync All Devices",
    syncSuccess: "Sync Successful",

    // User Management
    userManagement: "User Management",
    addUser: "Add User",
    editUser: "Edit User",
    deleteUser: "Delete User",
    role: "Role",
    admin: "Admin",
    operator: "Operator",
    viewer: "Viewer",

    // Messages
    selectDevicesAndVideo: "Please select devices and video",
    selectDevices: "Please select devices",
    fillAllFields: "Please fill in all required fields",
    confirmDelete: "Confirm Delete",

    // Dialog
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    edit: "Edit",
    delete: "Delete",

    // Auth
    register: "Register",
    email: "Email",
    confirmPassword: "Confirm Password",
    signInWithGoogle: "Sign in with Google",
    signUpWithGoogle: "Sign up with Google",
    continueAsGuest: "Continue as Guest",
    guest: "Guest",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 6 characters",
    userExists: "Username or email already exists",
    registrationFailed: "Registration failed",
    googleLoginFailed: "Google login failed",
    guestLoginFailed: "Guest login failed",
  },
}

export type Language = keyof typeof translations
export type TranslationKey = keyof typeof translations.zh
