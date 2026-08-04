"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useCapture } from "@/lib/useCapture"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import type { Task, Project } from "@/lib/db/schema"
import { parseCapture, parsedCaptureHint } from "@/lib/captureParser"
import { api } from "@/lib/api"
import { STATUS_LABEL, STATUS_COLOR, collectDescendantIds } from "@/lib/taskStatus"

export default function InboxPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [selected, setSelected] = useState<Task | null>(null)
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [waitingFor, setWaitingFor] = useState("")
  const [scheduledDate, setScheduledDate] = useState("")
  const [loading, setLoading] = useState(true)
  const [captureTitle, setCaptureTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const captureRef = useRef<HTMLInputElement>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const captureHint = useMemo(() => parsedCaptureHint(parseCapture(captureTitle)), [captureTitle])
  const [lastCapture, setLastCapture] = useState<string | null>(null)
  const [allTasks, setAllTasks] = useState<Task[]>([])
  const [parentTaskId, setParentTaskId] = useState<number | null>(null)
  const parentCandidates = allTasks.filter((t) => t.status !== "done" && t.status !== "cancelled")
  const [triageParentId, setTriageParentId] = useState<number | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")
  const triageDescendantIds = useMemo(
    () => (selected ? collectDescendantIds(selected.id, allTasks) : new Set<number>()),
    [selected, allTasks]
  )
  const triageChildren = useMemo(
    () => (selected ? allTasks.filter((t) => t.parentId === selected.id) : []),
    [selected, allTasks]
  )

  const loadTasks = useCallback(async () => {
    const data = await api.get<Task[]>("/api/tasks?status=inbox")
    setTasks(data)
    setSelected((prev) => {
      const still = data.find((t) => t.id === prev?.id)
      const next = still ?? data[0] ?? null
      if (next?.id !== prev?.id) {
        setTitle(next?.title ?? "")
        setNotes(next?.notes ?? "")
        setWaitingFor("")
        setScheduledDate("")
        setSelectedProjectId(next?.projectId ?? null)
        setTriageParentId(next?.parentId ?? null)
      }
      return next
    })
    setLoading(false)
  }, [setTriageParentId])

  // マウント時の初回fetch（loadTasksは再利用される非同期関数のため静的解析の対象外）
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadTasks() }, [loadTasks])
  useCapture("inbox", loadTasks)

  useEffect(() => {
    api.get<Project[]>("/api/projects?status=active").then(setProjects)
  }, [])

  const loadAllTasks = useCallback(async () => {
    setAllTasks(await api.get<Task[]>("/api/tasks"))
  }, [])
  // マウント時の初回fetch（loadAllTasksは再利用される非同期関数のため静的解析の対象外）
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadAllTasks() }, [loadAllTasks])
  useEffect(() => {
    window.addEventListener("gtd:captured", loadAllTasks)
    return () => window.removeEventListener("gtd:captured", loadAllTasks)
  }, [loadAllTasks])

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    const p = parseCapture(captureTitle)
    if (!p.title || busy) return
    setBusy(true)
    await api.post("/api/tasks", {
      title: p.title,
      targetStatus: p.status,
      twoMinute: p.twoMinute,
      scheduledAt: p.scheduledAt,
      projectName: p.projectName,
      parentId: parentTaskId ?? undefined,
    })
    setCaptureTitle("")
    setBusy(false)
    captureRef.current?.focus()
    const capturedStatus = p.status ?? "inbox"
    window.dispatchEvent(new CustomEvent("gtd:captured", { detail: { status: capturedStatus } }))
    if (capturedStatus === "inbox") {
      loadTasks()
    } else {
      setLastCapture(captureHint)
      setTimeout(() => setLastCapture(null), 3000)
    }
  }

  function selectTask(task: Task) {
    setSelected(task)
    setTitle(task.title)
    setNotes(task.notes ?? "")
    setWaitingFor("")
    setScheduledDate("")
    setSelectedProjectId(task.projectId ?? null)
    setTriageParentId(task.parentId ?? null)
  }

  async function handleAction(
    status: "next" | "delegate" | "waiting" | "scheduled" | "someday" | "idea" | "done" | "cancelled",
    twoMinute = false
  ) {
    if (!selected) return
    const trimmedTitle = title.trim()
    const body: Record<string, unknown> = {
      status,
      title: trimmedTitle || selected.title,
      notes,
      twoMinute,
      projectId: selectedProjectId,
      parentId: triageParentId,
    }
    if (status === "waiting" || status === "delegate") body.waitingFor = waitingFor || null
    if (status === "scheduled" && scheduledDate) body.scheduledAt = new Date(scheduledDate).getTime()
    await api.patch(`/api/tasks/${selected.id}`, body)
    await loadTasks()
  }

  async function handleSkip(days: number) {
    if (!selected) return
    const trimmedTitle = title.trim()
    const target = new Date()
    target.setDate(target.getDate() + days)
    target.setHours(0, 0, 0, 0)
    await api.patch(`/api/tasks/${selected.id}`, {
      title: trimmedTitle || selected.title,
      notes,
      parentId: triageParentId,
      deferredUntil: target.getTime(),
    })
    await loadTasks()
  }

  async function handleAddSubtask(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    const t = newSubtaskTitle.trim()
    if (!t) return
    setNewSubtaskTitle("")
    await api.post("/api/tasks", { title: t, parentId: selected.id })
    await Promise.all([loadTasks(), loadAllTasks()])
  }

  return (
    <div className="flex flex-col gap-4 max-w-5xl">
      {/* ── 上部: キャプチャ入力 + 対象タスク ── */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-start">
        {/* キャプチャ入力 */}
        <div className="flex flex-col gap-1 flex-1">
          <form onSubmit={handleCapture} className="flex gap-2">
            <input
              ref={captureRef}
              value={captureTitle}
              onChange={(e) => setCaptureTitle(e.target.value)}
              placeholder="Inbox へ追加..."
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
          <div className="flex items-center gap-1.5 px-1">
            <label htmlFor="parentTask" className="text-xs text-gray-400 shrink-0">親タスク（任意）:</label>
            <select
              id="parentTask"
              value={parentTaskId ?? ""}
              onChange={(e) => setParentTaskId(e.target.value ? Number(e.target.value) : null)}
              className="text-xs px-2 py-1 border rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 max-w-[220px]"
            >
              <option value="">なし</option>
              {parentCandidates.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </div>
          {captureHint && (
            <p className="px-1 text-xs text-blue-600 font-medium">→ {captureHint}</p>
          )}
          {lastCapture && (
            <p className="px-1 text-xs text-green-600 font-medium animate-pulse">✓ {lastCapture} に追加しました</p>
          )}
        </div>

        {/* 対象タスク表示 */}
        <div className="flex items-center gap-2 md:shrink-0">
          <span className="text-xs text-gray-400">Triage対象:</span>
          {selected ? (
            <span className="text-sm font-semibold text-gray-800 truncate">{selected.title}</span>
          ) : (
            <span className="text-sm text-gray-400">—</span>
          )}
          <Badge variant="outline" className="text-xs">{tasks.length} 件</Badge>
        </div>
      </div>

      {/* ── 下段: Triage + Inboxリスト ── */}
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : (
        <div className="flex flex-col md:flex-row md:gap-6 gap-6 md:flex-1 md:min-h-0">

          {/* トリアージパネル */}
          <div className="md:flex-[3] min-w-0 flex flex-col gap-4">
            {!selected ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm border-2 border-dashed rounded-xl">
                {tasks.length === 0 ? "Inbox Zero! 処理するアイテムがありません" : "右のリストからアイテムを選択してください"}
              </div>
            ) : (
              <>
                {/* 現在のタスク + メモ */}
                <div className="bg-white rounded-xl border p-5">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-xl font-bold text-gray-900 mb-3 h-auto px-2 py-1.5"
                  />
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

                  {/* 親タスク */}
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">親タスク</label>
                    <select
                      value={triageParentId ?? ""}
                      onChange={(e) => setTriageParentId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">なし</option>
                      {allTasks
                        .filter((t) => t.id !== selected.id && !triageDescendantIds.has(t.id))
                        .map((t) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>
                  </div>

                  {/* 子タスク（分割） */}
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">
                      子タスク（{triageChildren.length}）
                    </label>
                    {triageChildren.length > 0 && (
                      <ul className="space-y-1 mb-2">
                        {triageChildren.map((c) => (
                          <li
                            key={c.id}
                            className="flex items-center gap-2 text-sm px-2 py-1.5 border rounded-lg"
                          >
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${STATUS_COLOR[c.status]}`}>
                              {STATUS_LABEL[c.status]}
                            </span>
                            <span className={`flex-1 min-w-0 truncate ${c.status === "done" || c.status === "cancelled" ? "line-through text-gray-400" : ""}`}>
                              {c.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <form onSubmit={handleAddSubtask} className="flex gap-2">
                      <input
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="子タスクを追加..."
                        className="flex-1 min-w-0 text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="submit"
                        disabled={!newSubtaskTitle.trim()}
                        className="shrink-0 px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        追加
                      </button>
                    </form>
                  </div>
                </div>

                {/* 振り分けボタン群 */}
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">振り分け</p>

                  <Button
                    size="lg"
                    className="w-full text-base bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 shadow-none"
                    onClick={() => handleAction("next", true)}
                  >
                    ⚡ 2分でできる → 今すぐやる（Next 先頭へ）
                  </Button>

                  <Button
                    size="lg"
                    className="w-full text-base bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-300 shadow-none"
                    onClick={() => handleAction("next", false)}
                  >
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
                      className="shrink-0 bg-violet-100 hover:bg-violet-200 text-violet-800 border border-violet-300 shadow-none disabled:opacity-40"
                      onClick={() => handleAction("scheduled")}
                      disabled={!scheduledDate}
                    >
                      Scheduled へ
                    </Button>
                  </div>

                  <Button
                    size="lg"
                    className="w-full text-base bg-teal-100 hover:bg-teal-200 text-teal-800 border border-teal-300 shadow-none"
                    onClick={() => handleAction("someday")}
                  >
                    Someday / Maybe へ
                  </Button>

                  <Button
                    size="lg"
                    className="w-full text-base bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 shadow-none"
                    onClick={() => handleAction("idea")}
                  >
                    💡 Idea へ（後で見直す）
                  </Button>

                  <div className="flex gap-2">
                    <Input
                      value={waitingFor}
                      onChange={(e) => setWaitingFor(e.target.value)}
                      placeholder="誰に委譲 / 何を待つか"
                      className="flex-1"
                    />
                    <Button
                      size="lg"
                      className="shrink-0 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300 shadow-none"
                      onClick={() => handleAction("delegate")}
                    >
                      Delegate
                    </Button>
                    <Button
                      size="lg"
                      className="shrink-0 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 border border-indigo-300 shadow-none"
                      onClick={() => handleAction("waiting")}
                    >
                      Waiting
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="lg"
                      className="flex-1 text-base bg-green-100 hover:bg-green-200 text-green-800 border border-green-300 shadow-none"
                      onClick={() => handleAction("done")}
                    >
                      完了済み / 参照のみ
                    </Button>
                    <Button
                      size="lg"
                      className="flex-1 text-base bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 shadow-none"
                      onClick={() => handleAction("cancelled")}
                    >
                      不要 / キャンセル
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 text-base text-gray-400 hover:text-gray-600 border-dashed"
                      onClick={() => handleSkip(1)}
                    >
                      翌日へ先送り（Skip）
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="flex-1 text-base text-gray-400 hover:text-gray-600 border-dashed"
                      onClick={() => handleSkip(7)}
                    >
                      来週へ先送り（Skip）
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Inbox リスト */}
          <div className="md:flex-[2] min-w-0 flex flex-col gap-2 md:overflow-y-auto">
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
