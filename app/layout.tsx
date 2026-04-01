import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Link from "next/link"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GTD",
  description: "Getting Things Done",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-gray-50 text-gray-900`}>
        <header className="border-b bg-white px-6 py-3 flex gap-6 text-sm font-medium">
          <Link href="/" className="text-blue-600 hover:underline">GTD</Link>
          <Link href="/inbox" className="hover:underline">Inbox</Link>
          <Link href="/next-actions" className="hover:underline">Next Actions</Link>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  )
}
