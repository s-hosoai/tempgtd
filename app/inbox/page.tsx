"use client"

import { useState, useEffect, useCallback } from "react"
import { useCapture } from "@/lib/useCapture"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/db/schema"

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(true)

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/tasks?status=inbox")
    setTasks(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])
  useCapture("inbox", loadTasks)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    })
    setTitle("")
    loadTasks()
  }

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <Link href="/inbox/triage">
          <Button size="sm">Triage →</Button>
        </Link>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="思いついたことを入力..."
          className="flex-1"
          autoFocus
        />
        <Button type="submit">追加</Button>
      </form>

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : tasks.length === 0 ? (
        <p className="text-gray-400 text-sm">Inbox is empty</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-3 bg-white rounded-lg border px-4 py-3">
              <button
                onClick={() => handleDone(task.id)}
                className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 flex-shrink-0"
                aria-label="完了"
              />
              <span className="flex-1 text-sm">{task.title}</span>
              <Badge variant="outline" className="text-xs">inbox</Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
