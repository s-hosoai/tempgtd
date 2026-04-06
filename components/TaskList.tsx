"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Task, TaskStatus } from "@/lib/db/schema"

type Props = {
  status: TaskStatus
  emptyText?: string
  /** 完了ボタン押下時の遷移先ステータス */
  doneStatus?: TaskStatus
}

const STATUS_LABEL: Partial<Record<TaskStatus, string>> = {
  delegate: "委譲予定",
  waiting: "待ち",
  someday: "いつか",
}

export function TaskList({ status, emptyText, doneStatus = "done" }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks?status=${status}`)
    setTasks(await res.json())
    setLoading(false)
  }, [status])

  useEffect(() => { load() }, [load])

  async function moveTo(id: number, nextStatus: TaskStatus) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    })
    load()
  }

  if (loading) return <p className="text-gray-400 text-sm">読み込み中...</p>
  if (tasks.length === 0) return <p className="text-gray-400 text-sm">{emptyText ?? "アイテムがありません"}</p>

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li key={task.id} className="bg-white rounded-lg border px-4 py-3 space-y-1">
          <div className="flex items-start gap-3">
            <button
              onClick={() => moveTo(task.id, doneStatus)}
              className="w-5 h-5 mt-0.5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0"
              aria-label="完了"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm">{task.title}</p>
              {task.waitingFor && (
                <p className="text-xs text-gray-400 mt-0.5">→ {task.waitingFor}</p>
              )}
              {task.notes && (
                <p className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</p>
              )}
            </div>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {STATUS_LABEL[status] ?? status}
            </Badge>
          </div>
          {status === "delegate" && (
            <div className="flex gap-2 pl-8">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => moveTo(task.id, "waiting")}
              >
                依頼済み → Waiting
              </Button>
            </div>
          )}
          {status === "someday" && (
            <div className="flex gap-2 pl-8">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-6"
                onClick={() => moveTo(task.id, "next")}
              >
                昇格 → Next
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
