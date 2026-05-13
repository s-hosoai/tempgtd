"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { NAV_ITEMS } from "@/lib/navItems"

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <nav
      className={`hidden md:flex shrink-0 bg-white border-r flex-col py-4 sticky top-0 h-screen transition-all duration-200 ${
        collapsed ? "w-14" : "w-48"
      }`}
    >
      {/* ロゴ + 折りたたみボタン */}
      <div className={`flex items-center mb-3 px-3 ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <Link href="/" className="text-base font-bold text-blue-600 hover:text-blue-700 truncate">
            TempGTD
          </Link>
        )}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 shrink-0"
          aria-label={collapsed ? "メニューを開く" : "メニューを閉じる"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ナビリンク */}
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + "/")
        return (
          <Link
            key={href}
            href={href}
            title={collapsed ? label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              active
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
