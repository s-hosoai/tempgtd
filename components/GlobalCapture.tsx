"use client"

import { useState, useRef } from "react"
import { usePathname } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import type { TaskStatus } from "@/lib/db/schema"

// パスに対応する「直接追加先」ステータス。null のページはトグル非表示
const PATH_STATUS: Record<string, TaskStatus> = {
  "/inbox":  "inbox",
  "/today":  "next",
}

const STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  inbox:    "Inbox",
  next:     "Next Action",
  delegate: "Delegate",
  waiting:  "Waiting",
  someday:  "Someday",
}

export function GlobalCapture() {
  const pathname = usePathname()
  const pageStatus = PATH_STATUS[pathname] ?? null

  const [direct, setDirect] = useState(false)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const targetStatus: TaskStatus = (direct && pageStatus) ? pageStatus : "inbox"

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || busy) return
    setBusy(true)
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), targetStatus }),
      })
      setTitle("")
      // ページのデータ再取得のためカスタムイベントを発火
      window.dispatchEvent(new CustomEvent("gtd:captured", { detail: { status: targetStatus } }))
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg px-6 py-4 flex items-center gap-4 z-50"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Capture...　　Enter で追加"
        className="flex-1 text-base px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 placeholder:text-gray-400"
        disabled={busy}
      />
      {pageStatus && pageStatus !== "inbox" && (
        <div className="flex items-center gap-2 shrink-0">
          <Switch
            id="direct"
            checked={direct}
            onCheckedChange={setDirect}
          />
          <label htmlFor="direct" className="text-sm text-gray-500 cursor-pointer select-none whitespace-nowrap">
            {direct ? (
              <span className="text-blue-600 font-medium">{STATUS_LABEL[pageStatus]} へ</span>
            ) : (
              "Inbox へ"
            )}
          </label>
        </div>
      )}
      <button
        type="submit"
        disabled={busy || !title.trim()}
        className="shrink-0 px-5 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        追加
      </button>
    </form>
  )
}
