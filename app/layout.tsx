import type React from "react"
import "./globals.css"
import type { Metadata, Viewport } from "next"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "VR視頻管理系統",
  description: "專業的VR視頻管理和播放控制系統",
  generator: 'v0.app'
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  )
}
