"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/db/schema"

// 表示する時間帯: 7:00 〜 22:00、30分刻み
const START_HOUR = 7
const END_HOUR = 22
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
  const minFromStart = (d.getHours() - START_HOUR) * 60 + d.getMinutes()
  return Math.floor(minFromStart / SLOT_MIN)
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

export default function TodayPage() {
  const [scheduled, setScheduled] = useState<Task[]>([])
  const [nextTasks, setNextTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [dragging, setDragging] = useState<Task | null>(null)

  async function load() {
    const [todayRes, nextRes] = await Promise.all([
      fetch("/api/today"),
      fetch("/api/tasks?status=next"),
    ])
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

  // スロットに配置されているタスクを取得
  function taskAtSlot(slotIndex: number): Task | undefined {
    return scheduled.find((t) => {
      if (t.todayStart == null) return false
      const tSlot = msToSlot(t.todayStart)
      const slots = Math.max(1, Math.ceil(t.durationMin / SLOT_MIN))
      return slotIndex >= tSlot && slotIndex < tSlot + slots
    })
  }

  if (loading) return <p className="text-gray-400 text-sm">読み込み中...</p>

  const today = new Date().toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-sm text-gray-500">{today}</p>
      </div>

      <div className="flex gap-6">
        {/* カレンダー */}
        <div className="flex-1">
          <div className="bg-white border rounded-lg overflow-hidden">
            {Array.from({ length: SLOTS }, (_, i) => {
              const task = taskAtSlot(i)
              const isStart = task != null && msToSlot(task.todayStart!) === i
              const isContinue = task != null && !isStart

              return (
                <div
                  key={i}
                  className={`flex border-b last:border-b-0 min-h-[40px] ${
                    isContinue ? "hidden" : ""
                  }`}
                  onDragOver={(e) => { e.preventDefault() }}
                  onDrop={(e) => {
                    e.preventDefault()
                    if (dragging) assign(dragging, i)
                  }}
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
                  ) : !task ? (
                    <div className="flex-1" />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        {/* Next Actions（未スケジュール） */}
        <div
          className="w-56"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); if (dragging) unassign(dragging) }}
        >
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Next Actions</p>
          <p className="text-xs text-gray-400 mb-3">ドラッグして配置・ここに戻して解除</p>
          <ul className="space-y-2">
            {nextTasks
              .filter((t) => t.todayStart == null)
              .map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={() => setDragging(task)}
                  onDragEnd={() => setDragging(null)}
                  className={`bg-white border rounded px-3 py-2 text-sm cursor-grab active:cursor-grabbing select-none ${
                    ENERGY_COLOR[task.energy ?? ""] ?? "border-gray-200"
                  }`}
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
    </div>
  )
}
