import type { Metadata } from "next"
import { Geist } from "next/font/google"
import Link from "next/link"
import { GlobalCapture } from "@/components/GlobalCapture"
import "./globals.css"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "GTD",
  description: "Getting Things Done",
}

const NAV_ITEMS = [
  { href: "/inbox",        label: "Inbox" },
  { href: "/inbox/triage", label: "Triage" },
  { href: "/next-actions", label: "Next Actions" },
  { href: "/today",        label: "Today" },
  { href: "/projects",     label: "Projects" },
  { href: "/delegate",     label: "Delegate" },
  { href: "/waiting",      label: "Waiting" },
  { href: "/someday",      label: "Someday" },
  { href: "/done",         label: "Done" },
  { href: "/review",       label: "Review" },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={`${geist.className} bg-gray-50 text-gray-900 flex min-h-screen flex-col`}>
        <div className="flex flex-1 overflow-hidden">
          <nav className="w-48 shrink-0 bg-white border-r flex flex-col py-4 sticky top-0 h-screen">
            <Link href="/" className="px-4 py-2 text-base font-bold text-blue-600 hover:text-blue-700 mb-2">
              GTD
            </Link>
            {NAV_ITEMS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              >
                {label}
              </Link>
            ))}
          </nav>
          <main className="flex-1 px-8 py-8 max-w-2xl overflow-y-auto pb-20">{children}</main>
        </div>
        <GlobalCapture />
      </body>
    </html>
  )
}
