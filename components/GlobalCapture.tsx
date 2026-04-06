"use client"

import { useState, useRef } from "react"
import { usePathname } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import type { TaskStatus } from "@/lib/db/schema"

// パスに対応する「直接追加先」ステータス。null のページはトグル非表示
const PATH_STATUS: Record<string, TaskStatus> = {
  "/inbox":         "inbox",
  "/inbox/triage":  "inbox",
  "/next-actions":  "next",
  "/delegate":      "delegate",
  "/waiting":       "waiting",
  "/someday":       "someday",
  "/today":         "next",
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
      className="mt-auto border-t px-3 py-3 space-y-2 bg-white"
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Capture..."
        className="w-full text-sm px-2 py-1.5 border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        disabled={busy}
      />
      {pageStatus && pageStatus !== "inbox" && (
        <div className="flex items-center gap-2">
          <Switch
            id="direct"
            checked={direct}
            onCheckedChange={setDirect}
            className="scale-75 origin-left"
          />
          <label htmlFor="direct" className="text-xs text-gray-500 cursor-pointer select-none">
            {direct ? (
              <span className="text-blue-600 font-medium">{STATUS_LABEL[pageStatus]} へ</span>
            ) : (
              "Inbox へ"
            )}
          </label>
        </div>
      )}
    </form>
  )
}
