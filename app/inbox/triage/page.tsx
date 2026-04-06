"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import type { Task } from "@/lib/db/schema"

export default function TriagePage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [current, setCurrent] = useState<Task | null>(null)
  const [notes, setNotes] = useState("")
  const [waitingFor, setWaitingFor] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  async function loadTasks() {
    const res = await fetch("/api/tasks?status=inbox")
    const data: Task[] = await res.json()
    setTasks(data)
    setCurrent(data[0] ?? null)
    setNotes(data[0]?.notes ?? "")
    setWaitingFor("")
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [])

  async function handleAction(
    status: "next" | "delegate" | "waiting" | "someday" | "done" | "cancelled",
    twoMinute = false
  ) {
    if (!current) return
    await fetch(`/api/tasks/${current.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status,
        notes,
        twoMinute,
        waitingFor: (status === "waiting" || status === "delegate") ? waitingFor || null : null,
      }),
    })
    await loadTasks()
  }

  if (loading) return <p className="text-gray-400 text-sm">読み込み中...</p>

  if (!current) {
    return (
      <div className="space-y-4 text-center py-16">
        <p className="text-2xl">Inbox Zero!</p>
        <p className="text-gray-500 text-sm">処理するアイテムがありません</p>
        <Button variant="outline" onClick={() => router.push("/inbox")}>
          Inboxに戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Triage</h1>
        <span className="text-sm text-gray-500">{tasks.length} 件</span>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <p className="text-lg font-medium">{current.title}</p>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="メモ（任意）"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">振り分け</p>

        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
          onClick={() => handleAction("next", true)}
        >
          2分でできる → 今すぐやる（Next先頭へ）
        </Button>

        <Button className="w-full" onClick={() => handleAction("next", false)}>
          Next Action へ
        </Button>

        <Button variant="outline" className="w-full" onClick={() => handleAction("someday")}>
          Someday/Maybe へ
        </Button>

        <div className="space-y-1">
          <Input
            value={waitingFor}
            onChange={(e) => setWaitingFor(e.target.value)}
            placeholder="誰に委譲 / 何を待つか"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleAction("delegate")}
            >
              Delegate（委譲予定）
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => handleAction("waiting")}
            >
              Waiting For
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => handleAction("done")}
        >
          完了済み / 参照のみ
        </Button>

        <Button
          variant="outline"
          className="w-full text-red-500 hover:text-red-600"
          onClick={() => handleAction("cancelled")}
        >
          不要 / キャンセル
        </Button>
      </div>
    </div>
  )
}
