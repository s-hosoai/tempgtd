"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { TaskList } from "@/components/TaskList"
import type { Task } from "@/lib/db/schema"

type FilterStatus = "delegate" | "waiting" | "someday" | "scheduled" | "done"

const FILTERS: { status: FilterStatus; label: string; desc: string }[] = [
  { status: "delegate",  label: "Delegate",  desc: "これから誰かに委譲するタスク。依頼したら Waiting へ。" },
  { status: "waiting",   label: "Waiting",   desc: "委任済み・誰かを待っているタスク。" },
  { status: "someday",   label: "Someday",   desc: "いつかやる・たぶんやるタスク。Next へ昇格できます。" },
  { status: "scheduled", label: "Scheduled", desc: "指定日時に自動で Next Actions へ昇格するタスク。" },
  { status: "done",      label: "Done",      desc: "完了済みのタスク。" },
]

function formatScheduledAt(ms: number | null): string {
  if (!ms) return "—"
  return new Date(ms).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
}

function ScheduledList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch("/api/tasks?status=scheduled")
    setTasks((await res.json()).slice().sort((a: Task, b: Task) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handlePromoteNow(id: number) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "next" }),
    })
    load()
  }

  async function handleCancel(id: number) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" })
    load()
  }

  if (loading) return <p className="text-gray-400 text-sm">読み込み中...</p>
  if (tasks.length === 0) return <p className="text-gray-400 text-sm">スケジュール済みのタスクがありません</p>

  return (
    <ul className="space-y-2">
      {tasks.map((task) => {
        const isPast = task.scheduledAt != null && task.scheduledAt <= Date.now()
        return (
          <li key={task.id} className="bg-white border rounded-lg px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{task.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={`text-xs ${isPast ? "border-red-300 text-red-600" : "text-gray-500"}`}>
                  {isPast ? "期限超過 " : ""}{formatScheduledAt(task.scheduledAt ?? null)}
                </Badge>
                {task.energy && <Badge variant="outline" className="text-xs text-gray-500">{task.energy}</Badge>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => handlePromoteNow(task.id)}>今すぐ Next へ</Button>
              <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => handleCancel(task.id)}>取消</Button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function DoneList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/tasks?status=done")
      .then((r) => r.json())
      .then((data) => { setTasks(data); setLoading(false) })
  }, [])

  if (loading) return <p className="text-gray-400 text-sm">読み込み中...</p>
  if (tasks.length === 0) return <p className="text-gray-400 text-sm">完了済みのタスクがありません</p>

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-start gap-3 bg-white rounded-lg border px-4 py-3 opacity-70">
          <span className="w-5 h-5 mt-0.5 flex items-center justify-center text-green-500 flex-shrink-0">✓</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm line-through text-gray-500">{task.title}</p>
            {task.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function TasksContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const current = (searchParams.get("status") as FilterStatus) ?? "delegate"
  const filter = FILTERS.find((f) => f.status === current) ?? FILTERS[0]

  function setFilter(status: FilterStatus) {
    router.replace(`/tasks?status=${status}`)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Tasks</h1>

      {/* フィルタータブ */}
      <div className="flex gap-1 mb-1 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.status}
            onClick={() => setFilter(f.status)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              current === f.status
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-4">{filter.desc}</p>

      {current === "scheduled" && <ScheduledList />}
      {current === "done"      && <DoneList />}
      {current !== "scheduled" && current !== "done" && (
        <TaskList
          status={current}
          emptyText={`${filter.label} のタスクがありません`}
        />
      )}
    </div>
  )
}

export default function TasksPage() {
  return (
    <Suspense>
      <TasksContent />
    </Suspense>
  )
}
