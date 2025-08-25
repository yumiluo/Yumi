"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Video, CheckCircle } from "lucide-react"
import { SessionController } from "@/components/session-controller"

export default function VRMultiDevicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 頂部導航 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Video className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-semibold text-gray-900">VR多設備視頻播放系統</h1>
              <Badge variant="secondary" className="hidden md:inline-flex items-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                控制器模式
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => (window.location.href = "/")}>返回首頁</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>控制器儀表板</CardTitle>
            <CardDescription>創建會話並控制所有連接設備的視頻播放</CardDescription>
          </CardHeader>
          <CardContent>
            <SessionController />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
