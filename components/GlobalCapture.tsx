"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Switch } from "@/components/ui/switch"
import type { Task, TaskStatus } from "@/lib/db/schema"

const PATH_STATUS: Record<string, TaskStatus> = {
  "/inbox": "inbox",
  "/today": "next",
}

const STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  inbox:     "Inbox",
  next:      "Next Action",
  delegate:  "Delegate",
  waiting:   "Waiting",
  scheduled: "Scheduled",
  someday:   "Someday",
  done:      "Done",
  cancelled: "Cancel",
}

const CHANGE_STATUSES: TaskStatus[] = ["done", "next", "delegate", "waiting", "scheduled", "someday", "cancelled"]

export function GlobalCapture() {
  const pathname = usePathname()
  const pageStatus = PATH_STATUS[pathname] ?? null

  const [direct, setDirect] = useState(false)
  const [title, setTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const [currentTask, setCurrentTask] = useState<Task | null>(null)
  const [changeStatus, setChangeStatus] = useState<TaskStatus>("done")
  const [changing, setChanging] = useState(false)

  const targetStatus: TaskStatus = (direct && pageStatus) ? pageStatus : "inbox"

  const loadCurrentTask = useCallback(async () => {
    const res = await fetch("/api/tasks?status=next")
    const tasks: Task[] = await res.json()
    setCurrentTask(tasks[0] ?? null)
  }, [])

  useEffect(() => { loadCurrentTask() }, [loadCurrentTask])

  useEffect(() => {
    const handler = () => loadCurrentTask()
    window.addEventListener("gtd:captured", handler)
    return () => window.removeEventListener("gtd:captured", handler)
  }, [loadCurrentTask])

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
      window.dispatchEvent(new CustomEvent("gtd:captured", { detail: { status: targetStatus } }))
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  async function applyStatus(status: TaskStatus) {
    if (!currentTask || changing) return
    setChanging(true)
    try {
      await fetch(`/api/tasks/${currentTask.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      window.dispatchEvent(new CustomEvent("gtd:captured", { detail: { status } }))
      await loadCurrentTask()
    } finally {
      setChanging(false)
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-lg z-50">
      {/* Current タスク行 */}
      <div className="px-3 md:px-6 pt-2.5 pb-2 flex items-center gap-2 md:gap-3 border-b border-gray-100 min-w-0">
        <span className="hidden md:block text-xs font-medium text-gray-400 shrink-0">Current</span>
        {currentTask ? (
          <>
            <button
              type="button"
              onClick={() => applyStatus("done")}
              disabled={changing}
              className="w-5 h-5 rounded border-2 border-gray-400 hover:border-green-500 hover:bg-green-50 shrink-0 flex items-center justify-center text-transparent hover:text-green-500 text-xs transition-colors"
              aria-label="Done"
            >✓</button>
            <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate" title={currentTask.title}>
              {currentTask.title}
            </span>
            <select
              value={changeStatus}
              onChange={(e) => setChangeStatus(e.target.value as TaskStatus)}
              className="text-xs px-1 md:px-2 py-1 border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 shrink-0 max-w-[90px] md:max-w-none"
            >
              {CHANGE_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => applyStatus(changeStatus)}
              disabled={changing}
              className="shrink-0 px-2 md:px-3 py-1 bg-gray-700 text-white text-xs font-medium rounded-lg hover:bg-gray-900 disabled:opacity-40 transition-colors"
            >
              変更
            </button>
          </>
        ) : (
          <span className="text-xs text-gray-400">Next Action がありません</span>
        )}
      </div>

      {/* Capture 入力行 */}
      <form onSubmit={handleSubmit} className="px-3 md:px-6 py-2.5 flex items-center gap-2 md:gap-4">
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Capture... (Enter で追加)"
          className="flex-1 min-w-0 text-base px-3 md:px-4 py-2 md:py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 placeholder:text-gray-400"
          disabled={busy}
        />
        {pageStatus && pageStatus !== "inbox" && (
          <div className="flex items-center gap-1.5 shrink-0">
            <Switch id="direct" checked={direct} onCheckedChange={setDirect} />
            <label htmlFor="direct" className="hidden md:block text-sm text-gray-500 cursor-pointer select-none whitespace-nowrap">
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
          className="shrink-0 px-3 md:px-5 py-2 md:py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          追加
        </button>
      </form>
    </div>
  )
}
