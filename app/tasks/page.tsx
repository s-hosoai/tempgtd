"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { X } from "lucide-react"
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

// ── タスク詳細パネル ──────────────────────────────
function TaskDetailPanel({
  task,
  projects,
  onClose,
  onSave,
}: {
  task: Task
  projects: Project[]
  onClose: () => void
  onSave: (id: number, fields: Record<string, unknown>) => Promise<void>
}) {
  const [title, setTitle] = useState(task.title)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [notes, setNotes] = useState(task.notes ?? "")
  const [projectId, setProjectId] = useState<number | null>(task.projectId ?? null)
  const [waitingFor, setWaitingFor] = useState(task.waitingFor ?? "")
  const [durationMin, setDurationMin] = useState(task.durationMin)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle")
  const skipSaveRef = useRef(true)

  // タスク切り替え時にフィールドをリセット（次の変更検知をスキップ）
  useEffect(() => {
    skipSaveRef.current = true
    setTitle(task.title)
    setStatus(task.status)
    setNotes(task.notes ?? "")
    setProjectId(task.projectId ?? null)
    setWaitingFor(task.waitingFor ?? "")
    setDurationMin(task.durationMin)
  }, [task.id])

  // フィールド変更を検知して600msデバウンス後に自動保存
  useEffect(() => {
    if (skipSaveRef.current) {
      skipSaveRef.current = false
      return
    }
    setSaveState("saving")
    const timer = setTimeout(async () => {
      await onSave(task.id, {
        title,
        status,
        notes,
        projectId,
        waitingFor: waitingFor || null,
        durationMin,
      })
      setSaveState("saved")
      setTimeout(() => setSaveState("idle"), 1500)
    }, 600)
    return () => clearTimeout(timer)
  // task.id は skipSaveRef のリセット側で管理するため依存から除外
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, status, notes, projectId, waitingFor, durationMin])

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <span className="text-sm font-semibold text-gray-700">タスク詳細</span>
        <div className="flex items-center gap-3 shrink-0">
          {saveState === "saving" && <span className="text-xs text-gray-400">保存中...</span>}
          {saveState === "saved"  && <span className="text-xs text-green-500">✓ 保存済み</span>}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
            aria-label="閉じる"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* スクロール可能なコンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-36 md:pb-6">
        {/* タイトル */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">タイトル</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* ステータス */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">ステータス</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
        </div>

        {/* メモ */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">メモ</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="メモを入力..."
            className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        {/* プロジェクト */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">プロジェクト</label>
          <select
            value={projectId ?? ""}
            onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
            className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">所属なし</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {/* 待ち相手（waiting / delegate のみ） */}
        {(status === "waiting" || status === "delegate") && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">誰を待っているか</label>
            <input
              value={waitingFor}
              onChange={(e) => setWaitingFor(e.target.value)}
              placeholder="名前・件名..."
              className="w-full text-sm px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        )}

        {/* 見積もり時間 */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">見積もり時間</label>
          <select
            value={durationMin}
            onChange={(e) => setDurationMin(Number(e.target.value))}
            className="w-full text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {[30, 60, 90, 120, 180, 240].map((m) => (
              <option key={m} value={m}>{m}分</option>
            ))}
          </select>
        </div>

        {/* タイムスタンプ */}
        <div className="text-xs text-gray-400 space-y-0.5 pt-2 border-t">
          <p>作成: {new Date(task.createdAt).toLocaleString("ja-JP")}</p>
          <p>更新: {new Date(task.updatedAt).toLocaleString("ja-JP")}</p>
        </div>
      </div>
    </>
  )
}

// ── メインページ ─────────────────────────────────
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatuses, setActiveStatuses] = useState<Set<TaskStatus>>(new Set(ALL_STATUSES))
  const [projectMap, setProjectMap] = useState<Map<number, string>>(new Map())
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Task | null>(null)

  const load = useCallback(async () => {
    const [taskRes, projRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/projects?status=active"),
    ])
    setTasks(await taskRes.json())
    const projs: Project[] = await projRes.json()
    setProjects(projs)
    setProjectMap(new Map(projs.map((p) => [p.id, p.title])))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    window.addEventListener("gtd:captured", load)
    return () => window.removeEventListener("gtd:captured", load)
  }, [load])

  // 保存後にリストが更新されたら選択中タスクも同期する
  const selectedId = selected?.id
  useEffect(() => {
    if (!selectedId) return
    const updated = tasks.find((t) => t.id === selectedId)
    if (updated) setSelected(updated)
  }, [tasks, selectedId])

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
    if (selectedId === id) setSelected(null)
    load()
  }

  async function handleSave(id: number, fields: Record<string, unknown>) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    })
    await load()
  }

  function handleSelectTask(task: Task) {
    setSelected((prev) => (prev?.id === task.id ? null : task))
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

      {/* メインレイアウト: PC=横並び / モバイル=縦 */}
      <div className="md:flex md:gap-4 md:items-start">

        {/* タスクリスト */}
        <div className={`flex-1 min-w-0 ${selected ? "pb-96 md:pb-0" : ""}`}>
          {loading ? (
            <p className="text-gray-400 text-sm">読み込み中...</p>
          ) : filtered.length === 0 ? (
            <p className="text-gray-400 text-sm">該当するタスクがありません</p>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((task) => (
                <li
                  key={task.id}
                  onClick={() => handleSelectTask(task)}
                  className={`bg-white rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                    selected?.id === task.id
                      ? "border-blue-400 ring-1 ring-blue-400 bg-blue-50/30"
                      : "hover:border-gray-300"
                  }`}
                >
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

                    {/* アクションボタン（クリックがリスト選択に伝播しないよう止める） */}
                    <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
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

        {/* PC: 右サイドパネル */}
        {selected && (
          <div
            className="hidden md:flex flex-col w-96 shrink-0 sticky top-4 bg-white border rounded-xl shadow-sm overflow-hidden"
            style={{ maxHeight: "calc(100vh - 6rem)" }}
          >
            <TaskDetailPanel
              task={selected}
              projects={projects}
              onClose={() => setSelected(null)}
              onSave={handleSave}
            />
          </div>
        )}
      </div>

      {/* モバイル: バックドロップ + ボトムシート */}
      {selected && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/20 z-[39]"
            onClick={() => setSelected(null)}
          />
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t shadow-2xl flex flex-col max-h-[70vh]">
            <TaskDetailPanel
              task={selected}
              projects={projects}
              onClose={() => setSelected(null)}
              onSave={handleSave}
            />
          </div>
        </>
      )}
    </div>
  )
}
