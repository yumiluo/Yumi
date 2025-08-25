@echo off
chcp 65001 >nul
title VR多設備視頻播放系統 - 新手友好版

echo.
echo 🎉 ========================================
echo 🚀 VR多設備視頻播放系統 - 新手友好版
echo 🎯 一鍵啟動，無需複雜配置！
echo ========================================
echo.

REM 檢查Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤: 未找到Node.js
    echo 💡 請先安裝Node.js: https://nodejs.org/
    echo    選擇LTS版本，下載後雙擊安裝即可
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js已安裝: 
node --version

REM 檢查npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤: 未找到npm
    echo 💡 請重新安裝Node.js，npm會自動安裝
    echo.
    pause
    exit /b 1
)

echo ✅ npm已安裝: 
npm --version

echo.
echo 📦 正在安裝系統依賴...
echo ⏳ 這可能需要幾分鐘，請耐心等待...
echo.

npm install

if %errorlevel% neq 0 (
    echo ❌ 依賴安裝失敗，請檢查網絡連接
    echo.
    pause
    exit /b 1
)

echo ✅ 依賴安裝完成！
echo.
echo 🚀 正在啟動VR系統...
echo ⏳ 請等待系統啟動完成...
echo.

REM 使用concurrently同時啟動前後端
npx concurrently --names "前端,後端" --prefix-colors "blue,green" --kill-others "npm run dev" "npm run vr"

echo.
echo 🎉 系統已關閉
echo 💡 如需重新啟動，再次運行此腳本即可
echo.
pause







