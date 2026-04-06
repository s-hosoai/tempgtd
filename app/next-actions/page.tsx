"use client"

import { useState, useEffect, useCallback } from "react"
import { useCapture } from "@/lib/useCapture"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/db/schema"

const ENERGY_OPTIONS = [
  { value: "", label: "すべて" },
  { value: "low",  label: "低" },
  { value: "mid",  label: "中" },
  { value: "high", label: "高" },
]

const ENERGY_BADGE: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  mid:  "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:  "bg-blue-100 text-blue-700 border-blue-200",
}

export default function NextActionsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [energyFilter, setEnergyFilter] = useState("")
  const [contextFilter, setContextFilter] = useState("")

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

  // コンテキスト一覧を全タスクから収集
  const allContexts = Array.from(
    new Set(
      tasks.flatMap((t) => {
        try { return JSON.parse(t.context || "[]") as string[] }
        catch { return [] }
      })
    )
  )

  const filtered = tasks.filter((t) => {
    if (energyFilter && t.energy !== energyFilter) return false
    if (contextFilter) {
      try {
        const ctxs: string[] = JSON.parse(t.context || "[]")
        if (!ctxs.includes(contextFilter)) return false
      } catch { return false }
    }
    return true
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Next Actions</h1>

      {/* フィルタ */}
      <div className="flex flex-wrap gap-2 text-sm">
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
            <li key={task.id} className="flex items-start gap-3 bg-white rounded-lg border px-4 py-3">
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
                  {(() => {
                    try { return (JSON.parse(task.context || "[]") as string[]).map((c) => (
                      <span key={c} className="text-xs px-1.5 py-0.5 rounded border bg-gray-50 text-gray-600">{c}</span>
                    )) } catch { return null }
                  })()}
                </div>
              </div>
              {i === 0 && task.nextOrder === 0 && (
                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs flex-shrink-0">
                  2分
                </Badge>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
