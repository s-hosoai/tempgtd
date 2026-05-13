import type { Metadata } from "next"
import { Geist } from "next/font/google"
import { Sidebar } from "@/components/Sidebar"
import { MobileHeader } from "@/components/MobileHeader"
import { GlobalCapture } from "@/components/GlobalCapture"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TempGTD",
  description: "Getting Things Done",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-gray-50 text-gray-900 flex min-h-screen flex-col`}>
        {/* スマホ用ヘッダー */}
        <MobileHeader />

        <div className="flex flex-1 overflow-hidden">
          {/* PC用サイドバー */}
          <Sidebar />

          {/* メインコンテンツ
              スマホ: 上部ヘッダー(h-14)分だけ pt をとり、下部 Capture バー分 pb を確保
              PC: サイドバーの横に表示 */}
          <main className="flex-1 px-4 py-4 md:px-8 md:py-8 overflow-y-auto pt-[calc(3.5rem+1rem)] md:pt-8 pb-36 md:pb-28">
            {children}
          </main>
        </div>

        <GlobalCapture />
      </body>
    </html>
  )
}
