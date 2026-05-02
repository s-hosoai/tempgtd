"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useCapture } from "@/lib/useCapture"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Task, Project } from "@/lib/db/schema"

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState<Task | null>(null)
  const [notes, setNotes] = useState("")
  const [waitingFor, setWaitingFor] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [captureTitle, setCaptureTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const captureRef = useRef<HTMLInputElement>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/tasks?status=inbox")
    const data: Task[] = await res.json()
    setTasks(data)
    setSelected((prev) => {
      const still = data.find((t) => t.id === prev?.id)
      const next = still ?? data[0] ?? null
      if (next?.id !== prev?.id) {
        setNotes(next?.notes ?? "")
        setWaitingFor("")
        setScheduledDate("")
        setSelectedProjectId(next?.projectId ?? null)
      }
      return next
    })
    setLoading(false)
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])
  useCapture("inbox", loadTasks)

  useEffect(() => {
    fetch("/api/projects?status=active")
      .then((r) => r.json())
      .then(setProjects)
  }, [])

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!captureTitle.trim() || busy) return
    setBusy(true)
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: captureTitle.trim() }),
    })
    setCaptureTitle("")
    setBusy(false)
    captureRef.current?.focus()
    loadTasks()
  }

  function selectTask(task: Task) {
    setSelected(task)
    setNotes(task.notes ?? "")
    setWaitingFor("")
    setScheduledDate("")
    setSelectedProjectId(task.projectId ?? null)
  }

  async function handleAction(
    status: "next" | "delegate" | "waiting" | "scheduled" | "someday" | "done" | "cancelled",
    twoMinute = false
  ) {
    if (!selected) return
    const body: Record<string, unknown> = { status, notes, twoMinute, projectId: selectedProjectId }
    if (status === "waiting" || status === "delegate") body.waitingFor = waitingFor || null
    if (status === "scheduled" && scheduledDate) body.scheduledAt = new Date(scheduledDate).getTime()
    await fetch(`/api/tasks/${selected.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    await loadTasks()
  }

  return (
    <div className="flex flex-col gap-4 h-full max-w-5xl">
      {/* ── 上部: キャプチャ入力 + 対象タスク ── */}
      <div className="flex gap-4 items-start">
        {/* キャプチャ入力 */}
        <form onSubmit={handleCapture} className="flex gap-2 flex-1">
          <input
            ref={captureRef}
            value={captureTitle}
            onChange={(e) => setCaptureTitle(e.target.value)}
            placeholder="Inbox へ追加..."
            disabled={busy}
            className="flex-1 text-base px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-gray-50 placeholder:text-gray-400"
          />
          <button
            type="submit"
            disabled={busy || !captureTitle.trim()}
            className="px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            追加
          </button>
        </form>

        {/* 対象タスク表示 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400">Triage対象:</span>
          {selected ? (
            <span className="text-sm font-semibold text-gray-800 max-w-xs truncate">{selected.title}</span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
          <Badge variant="outline" className="text-xs">{tasks.length} 件</Badge>
        </div>
      </div>

      {/* ── 下段: Triage (左大) + Inboxリスト (右) ── */}
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : (
        <div className="flex gap-6 flex-1 min-h-0">

          {/* 左: トリアージパネル */}
          <div className="flex-[3] min-w-0 flex flex-col gap-4">
            {!selected ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm border-2 border-dashed rounded-xl">
                {tasks.length === 0 ? "Inbox Zero! 処理するアイテムがありません" : "右のリストからアイテムを選択してください"}
              </div>
            ) : (
              <>
                {/* 現在のタスク + メモ */}
                <div className="bg-white rounded-xl border p-5">
                  <p className="text-xl font-bold text-gray-900 mb-3">{selected.title}</p>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="メモ（任意）"
                    rows={3}
                  />
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">プロジェクト</label>
                    <select
                      value={selectedProjectId ?? ""}
                      onChange={(e) => setSelectedProjectId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">所属なし</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 振り分けボタン群 */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">振り分け</p>

                  <Button
                    size="lg"
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-base"
                    onClick={() => handleAction("next", true)}
                  >
                    2分でできる → 今すぐやる（Next 先頭へ）
                  </Button>

                  <Button size="lg" className="w-full text-base" onClick={() => handleAction("next", false)}>
                    Next Action へ
                  </Button>

                  <div className="flex gap-2">
                    <Input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      size="lg"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => handleAction("scheduled")}
                      disabled={!scheduledDate}
                    >
                      Scheduled へ
                    </Button>
                  </div>

                  <Button size="lg" variant="outline" className="w-full text-base" onClick={() => handleAction("someday")}>
                    Someday / Maybe へ
                  </Button>

                  <div className="flex gap-2">
                    <Input
                      value={waitingFor}
                      onChange={(e) => setWaitingFor(e.target.value)}
                      placeholder="誰に委譲 / 何を待つか"
                      className="flex-1"
                    />
                    <Button size="lg" variant="outline" className="shrink-0" onClick={() => handleAction("delegate")}>
                      Delegate
                    </Button>
                    <Button size="lg" variant="outline" className="shrink-0" onClick={() => handleAction("waiting")}>
                      Waiting
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button size="lg" variant="outline" className="flex-1 text-base" onClick={() => handleAction("done")}>
                      完了済み / 参照のみ
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 text-base text-red-500 hover:text-red-600"
                      onClick={() => handleAction("cancelled")}
                    >
                      不要 / キャンセル
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 右: Inbox リスト */}
          <div className="flex-[2] min-w-0 flex flex-col gap-2 overflow-y-auto">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide shrink-0">Inbox</p>
            {tasks.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-2xl mb-1">Inbox Zero!</p>
                <p className="text-gray-400 text-sm">処理するアイテムがありません</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    onClick={() => selectTask(task)}
                    className={`px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                      selected?.id === task.id
                        ? "bg-blue-50 border-blue-300 text-blue-900 font-medium"
                        : "bg-white border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    {task.title}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
