"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { NAV_ITEMS } from "@/lib/navItems"

export function MobileHeader() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      {/* 上部固定ヘッダー（スマホのみ表示） */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-white border-b h-14 flex items-center justify-between px-4 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ touchAction: "manipulation" }}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
          aria-label="メニューを開く"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="text-base font-bold text-blue-600">
          TempGTD
        </Link>
      </header>

      {/* オーバーレイ */}
      {open && (
        <>
          {/* 背景暗転 */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-[55]"
            onClick={() => setOpen(false)}
          />

          {/* スライドメニュー */}
          <div className="md:hidden fixed top-0 left-0 bottom-0 w-64 bg-white z-[56] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-4 h-14 border-b shrink-0">
              <span className="text-base font-bold text-blue-600">TempGTD</span>
              <button
                onClick={() => setOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-700"
                aria-label="メニューを閉じる"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="flex flex-col py-2 overflow-y-auto">
              {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/")
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Icon size={20} className="shrink-0" />
                    <span>{label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </>
      )}
    </>
  )
}
