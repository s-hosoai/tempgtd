"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/db/schema"

export default function DonePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/tasks?status=done")
      .then((r) => r.json())
      .then((data) => { setTasks(data); setLoading(false) })
  }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Done</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">完了済みのタスクがありません</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start gap-3 bg-white rounded-lg border px-4 py-3 opacity-70">
              <span className="w-5 h-5 mt-0.5 flex items-center justify-center text-green-500 flex-shrink-0">✓</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm line-through text-gray-500">{task.title}</p>
                {task.notes && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{task.notes}</p>
                )}
              </div>
              <Badge variant="outline" className="text-xs flex-shrink-0 text-green-600 border-green-200">
                完了
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
