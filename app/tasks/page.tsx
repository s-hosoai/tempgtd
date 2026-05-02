"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import type { Task, TaskStatus, Project } from "@/lib/db/schema"

const ALL_STATUSES: TaskStatus[] = ["inbox", "next", "delegate", "waiting", "scheduled", "someday", "done", "cancelled"]

const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "Inbox",
  next: "Next",
  delegate: "Delegate",
  waiting: "Waiting",
  scheduled: "Scheduled",
  someday: "Someday",
  done: "Done",
  cancelled: "Cancel",
}

const STATUS_COLOR: Record<TaskStatus, string> = {
  inbox:     "bg-gray-100 text-gray-600",
  next:      "bg-blue-100 text-blue-700",
  delegate:  "bg-purple-100 text-purple-700",
  waiting:   "bg-yellow-100 text-yellow-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  someday:   "bg-gray-100 text-gray-500",
  done:      "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-400",
}

const TOGGLE_COLOR: Record<TaskStatus, string> = {
  inbox:     "bg-gray-200 text-gray-700 border-gray-300",
  next:      "bg-blue-500 text-white border-blue-500",
  delegate:  "bg-purple-500 text-white border-purple-500",
  waiting:   "bg-yellow-400 text-white border-yellow-400",
  scheduled: "bg-cyan-500 text-white border-cyan-500",
  someday:   "bg-gray-400 text-white border-gray-400",
  done:      "bg-green-500 text-white border-green-500",
  cancelled: "bg-red-400 text-white border-red-400",
}

function formatDate(ms: number | null): string {
  if (!ms) return ""
  return new Date(ms).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatuses, setActiveStatuses] = useState<Set<TaskStatus>>(new Set(ALL_STATUSES))
  const [projectMap, setProjectMap] = useState<Map<number, string>>(new Map())

  const load = useCallback(async () => {
    const [taskRes, projRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/projects?status=active"),
    ])
    setTasks(await taskRes.json())
    const projs: Project[] = await projRes.json()
    setProjectMap(new Map(projs.map((p) => [p.id, p.title])))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener("gtd:captured", load)
    return () => window.removeEventListener("gtd:captured", load)
  }, [load])

  function toggleStatus(s: TaskStatus) {
    setActiveStatuses((prev) => {
      const next = new Set(prev)
      if (next.has(s)) next.delete(s)
      else next.add(s)
      return next
    })
  }

  function selectAll() { setActiveStatuses(new Set(ALL_STATUSES)) }
  function clearAll() { setActiveStatuses(new Set()) }

  async function moveTo(id: number, status: TaskStatus) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    load()
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    load()
  }

  const filtered = tasks.filter((t) => activeStatuses.has(t.status))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Tasks</h1>

      {/* ステータストグル */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {ALL_STATUSES.map((s) => {
          const active = activeStatuses.has(s)
          return (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                active ? TOGGLE_COLOR[s] : "bg-white text-gray-400 border-gray-200"
              }`}
            >
              {STATUS_LABEL[s]}
            </button>
          )
        })}
        <span className="w-px h-4 bg-gray-200 mx-1" />
        <button onClick={selectAll} className="text-xs text-blue-500 hover:underline">すべて</button>
        <button onClick={clearAll} className="text-xs text-gray-400 hover:underline">クリア</button>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} 件</span>
      </div>

      {/* タスクリスト */}
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-400 text-sm">該当するタスクがありません</p>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((task) => (
            <li key={task.id} className="bg-white rounded-lg border px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_COLOR[task.status]}`}>
                      {STATUS_LABEL[task.status]}
                    </span>
                    {task.projectId && projectMap.has(task.projectId) && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded font-medium shrink-0 bg-indigo-100 text-indigo-700"
                        title={projectMap.get(task.projectId)}
                      >
                        {projectMap.get(task.projectId)!.slice(0, 5)}
                      </span>
                    )}
                    <span className={`text-sm ${task.status === "done" || task.status === "cancelled" ? "line-through text-gray-400" : "text-gray-800"}`}>
                      {task.title}
                    </span>
                  </div>
                  {task.waitingFor && (
                    <p className="text-xs text-gray-400 mt-0.5 pl-0.5">→ {task.waitingFor}</p>
                  )}
                  {task.status === "scheduled" && task.scheduledAt && (
                    <p className={`text-xs mt-0.5 pl-0.5 ${task.scheduledAt <= Date.now() ? "text-red-500" : "text-cyan-600"}`}>
                      {task.scheduledAt <= Date.now() ? "⚠ 期限超過 " : "🕐 "}{formatDate(task.scheduledAt)}
                    </p>
                  )}
                  {task.notes && (
                    <p className="text-xs text-gray-400 mt-0.5 pl-0.5 truncate">{task.notes}</p>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex gap-1.5 shrink-0">
                  {task.status === "delegate" && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => moveTo(task.id, "waiting")}>
                      依頼済み→Waiting
                    </Button>
                  )}
                  {task.status === "someday" && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => moveTo(task.id, "next")}>
                      昇格→Next
                    </Button>
                  )}
                  {task.status === "scheduled" && (
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => moveTo(task.id, "next")}>
                      今すぐNext
                    </Button>
                  )}
                  {(task.status !== "done" && task.status !== "cancelled") && (
                    <button
                      onClick={() => moveTo(task.id, "done")}
                      className="w-6 h-6 mt-0.5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center text-xs text-transparent hover:text-green-500 transition-colors"
                      aria-label="Done"
                    >
                      ✓
                    </button>
                  )}
                  {(task.status === "done" || task.status === "cancelled") && (
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="w-6 h-6 mt-0.5 rounded border border-gray-200 hover:border-red-400 hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-500 text-xs transition-colors"
                      aria-label="削除"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
