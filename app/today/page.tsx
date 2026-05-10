"use client"

import { useState, useEffect, useCallback, Suspense, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GripVertical } from "lucide-react"
import { useCapture } from "@/lib/useCapture"
import type { Task } from "@/lib/db/schema"

// ── カレンダー定数 ──────────────────────────────
const START_HOUR = 7
const END_HOUR = 24
const SLOT_MIN = 30
const SLOTS = ((END_HOUR - START_HOUR) * 60) / SLOT_MIN

function slotToTime(slotIndex: number): string {
  const totalMin = START_HOUR * 60 + slotIndex * SLOT_MIN
  const h = Math.floor(totalMin / 60).toString().padStart(2, "0")
  const m = (totalMin % 60).toString().padStart(2, "0")
  return `${h}:${m}`
}
function msToSlot(ms: number): number {
  const d = new Date(ms)
  return Math.floor(((d.getHours() - START_HOUR) * 60 + d.getMinutes()) / SLOT_MIN)
}
function slotToMs(slotIndex: number): number {
  const today = new Date()
  today.setHours(START_HOUR + Math.floor((slotIndex * SLOT_MIN) / 60), (slotIndex * SLOT_MIN) % 60, 0, 0)
  return today.getTime()
}

const ENERGY_COLOR: Record<string, string> = {
  high: "bg-red-100 border-red-300 text-red-800",
  mid:  "bg-yellow-100 border-yellow-300 text-yellow-800",
  low:  "bg-blue-100 border-blue-300 text-blue-800",
}
const ENERGY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  mid:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:  "bg-blue-100 text-blue-700 border-blue-200",
}

// ── Next Actions タブ ─────────────────────────────
const ENERGY_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "low",  label: "低" },
  { value: "mid",  label: "中" },
  { value: "high", label: "高" },
]

function NextActionsTab() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [energyFilter, setEnergyFilter] = useState("")
  const [contextFilter, setContextFilter] = useState("")
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/tasks?status=next")
    setTasks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])
  useCapture("next", loadTasks)

  async function handleDone(id: number) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    })
    loadTasks()
  }

  async function handleDrop(dropFilteredIndex: number) {
    const from = dragIndex.current
    if (from === null || from === dropFilteredIndex) {
      dragIndex.current = null
      setDragOverIndex(null)
      return
    }
    // filtered → tasks インデックスへ変換してreorder
    const draggedTask = filtered[from]
    const targetTask  = filtered[dropFilteredIndex]
    const newTasks = tasks.filter((t) => t.id !== draggedTask.id)
    const insertAt = newTasks.findIndex((t) => t.id === targetTask.id)
    newTasks.splice(insertAt, 0, draggedTask)
    const updated = newTasks.map((t, i) => ({ ...t, nextOrder: i }))
    setTasks(updated)
    dragIndex.current = null
    setDragOverIndex(null)
    await Promise.all(
      updated.map((t, i) =>
        fetch(`/api/tasks/${t.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nextOrder: i }),
        })
      )
    )
    window.dispatchEvent(new CustomEvent("gtd:captured", { detail: { status: "next" } }))
  }

  const allContexts = Array.from(
    new Set(tasks.flatMap((t) => { try { return JSON.parse(t.context || "[]") as string[] } catch { return [] } }))
  )
  const filtered = tasks.filter((t) => {
    if (energyFilter && t.energy !== energyFilter) return false
    if (contextFilter) {
      try { if (!(JSON.parse(t.context || "[]") as string[]).includes(contextFilter)) return false }
      catch { return false }
    }
    return true
  })

  return (
    <div className="space-y-4">
      {/* フィルタ */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {ENERGY_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setEnergyFilter(value)}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                energyFilter === value
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {allContexts.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setContextFilter("")}
              className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                contextFilter === "" ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              全コンテキスト
            </button>
            {allContexts.map((ctx) => (
              <button
                key={ctx}
                onClick={() => setContextFilter(ctx)}
                className={`px-3 py-1 rounded-full border text-xs transition-colors ${
                  contextFilter === ctx ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {ctx}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">Next Actionがありません</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((task, i) => (
            <li
              key={task.id}
              draggable
              onDragStart={() => { dragIndex.current = i }}
              onDragOver={(e) => { e.preventDefault(); setDragOverIndex(i) }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { dragIndex.current = null; setDragOverIndex(null) }}
              className={`flex items-start gap-3 bg-white rounded-lg border px-4 py-3 transition-colors ${
                dragOverIndex === i ? "border-blue-400 bg-blue-50" : ""
              }`}
            >
              <div
                className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
                title="ドラッグで並び替え"
              >
                <GripVertical size={16} />
              </div>
              <button
                onClick={() => handleDone(task.id)}
                className="w-5 h-5 mt-0.5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0"
                aria-label="完了"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{task.title}</p>
                {task.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</p>}
                <div className="flex gap-1 mt-1 flex-wrap">
                  {task.energy && (
                    <span className={`text-xs px-1.5 py-0.5 rounded border ${ENERGY_BADGE[task.energy]}`}>
                      {task.energy === "high" ? "高" : task.energy === "mid" ? "中" : "低"}エネルギー
                    </span>
                  )}
                  {(() => { try { return (JSON.parse(task.context || "[]") as string[]).map((c) => (
                    <span key={c} className="text-xs px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600">{c}</span>
                  )) } catch { return null } })()}
                </div>
              </div>
              {i === 0 && task.nextOrder === 0 && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs flex-shrink-0">2分</Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Today カレンダータブ ──────────────────────────
function TodayCalendarTab() {
  const [scheduled, setScheduled] = useState<Task[]>([])
  const [nextTasks, setNextTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<Task | null>(null)

  async function load() {
    const [todayRes, nextRes] = await Promise.all([fetch("/api/today"), fetch("/api/tasks?status=next")])
    setScheduled(await todayRes.json())
    setNextTasks(await nextRes.json())
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function assign(task: Task, slotIndex: number) {
    await fetch("/api/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, todayStart: slotToMs(slotIndex), durationMin: task.durationMin }),
    })
    load()
  }
  async function unassign(task: Task) {
    await fetch("/api/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: task.id, todayStart: null }),
    })
    load()
  }
  async function done(task: Task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    })
    load()
  }

  function taskAtSlot(slotIndex: number): Task | undefined {
    return scheduled.find((t) => {
      if (t.todayStart == null) return false
      const tSlot = msToSlot(t.todayStart)
      const slots = Math.max(1, Math.ceil(t.durationMin / SLOT_MIN))
      return slotIndex >= tSlot && slotIndex < tSlot + slots
    })
  }

  if (loading) return <p className="text-gray-400 text-sm">読み込み中...</p>

  return (
    <div className="flex gap-6">
      {/* カレンダー */}
      <div className="flex-1">
        <div className="bg-white border rounded-lg overflow-y-auto max-h-[calc(100vh-180px)]">
          {Array.from({ length: SLOTS }, (_, i) => {
            const task = taskAtSlot(i)
            const isStart = task != null && msToSlot(task.todayStart!) === i
            const isContinue = task != null && !isStart
            return (
              <div
                key={i}
                className={`flex border-b last:border-b-0 min-h-[40px] ${isContinue ? "hidden" : ""}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); if (dragging) assign(dragging, i) }}
              >
                <div className="w-14 px-2 py-2 text-xs text-gray-400 border-r shrink-0 flex items-start">
                  {slotToTime(i)}
                </div>
                {isStart && task ? (
                  <div
                    draggable
                    onDragStart={() => setDragging(task)}
                    onDragEnd={() => setDragging(null)}
                    className={`flex-1 px-2 py-1 m-1 rounded text-xs border cursor-grab active:cursor-grabbing ${ENERGY_COLOR[task.energy ?? "mid"] ?? "bg-gray-100"}`}
                    style={{ minHeight: `${Math.max(1, Math.ceil(task.durationMin / SLOT_MIN)) * 40 - 8}px` }}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-medium line-clamp-2">{task.title}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => done(task)} className="text-green-600 hover:text-green-700 text-xs">✓</button>
                        <button onClick={() => unassign(task)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
                      </div>
                    </div>
                    <span className="text-gray-400">{task.durationMin}分</span>
                  </div>
                ) : !task ? <div className="flex-1" /> : null}
              </div>
            )
          })}
        </div>
      </div>

      {/* Next Actions（未スケジュール） */}
      <div
        className="w-56 flex flex-col max-h-[calc(100vh-180px)]"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); if (dragging) unassign(dragging) }}
      >
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Next Actions</p>
        <p className="text-xs text-gray-400 mb-3">ドラッグして配置・ここに戻して解除</p>
        <ul className="space-y-2 overflow-y-auto flex-1">
          {nextTasks.filter((t) => t.todayStart == null).map((task) => (
            <li
              key={task.id}
              draggable
              onDragStart={() => setDragging(task)}
              onDragEnd={() => setDragging(null)}
              className={`bg-white border rounded px-3 py-2 text-sm cursor-grab active:cursor-grabbing select-none ${ENERGY_COLOR[task.energy ?? ""] ?? "border-gray-200"}`}
            >
              <p className="font-medium text-xs leading-snug">{task.title}</p>
              <p className="text-xs text-gray-400 mt-0.5">{task.durationMin}分</p>
            </li>
          ))}
          {nextTasks.filter((t) => t.todayStart == null).length === 0 && (
            <p className="text-xs text-gray-400">すべて配置済み</p>
          )}
        </ul>
      </div>
    </div>
  )
}

// ── ページ本体 ────────────────────────────────────
type Tab = "today" | "next"

function TodayContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = (searchParams.get("tab") as Tab) ?? "today"

  function setTab(t: Tab) {
    router.replace(`/today?tab=${t}`)
  }

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  })

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-sm text-gray-500">{today}</p>
        </div>
        <div className="flex gap-1">
          {([["today", "カレンダー"], ["next", "Next Actions"]] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-blue-600 text-white"
                  : "bg-white border text-gray-600 hover:bg-gray-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "today" ? <TodayCalendarTab /> : <NextActionsTab />}
    </div>
  )
}

export default function TodayPage() {
  return (
    <Suspense>
      <TodayContent />
    </Suspense>
  )
}
