"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/db/schema"

export default function NextActionsPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  async function loadTasks() {
    const res = await fetch("/api/tasks?status=next")
    setTasks(await res.json())
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [])

  async function handleDone(id: number) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    })
    loadTasks()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Next Actions</h1>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">Next Actionがありません</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task, i) => (
            <li key={task.id} className="flex items-start gap-3 bg-white rounded-lg border px-4 py-3">
              <button
                onClick={() => handleDone(task.id)}
                className="w-5 h-5 mt-0.5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0"
                aria-label="完了"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm">{task.title}</p>
                {task.notes && (
                  <p className="text-xs text-gray-400 mt-1 truncate">{task.notes}</p>
                )}
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
