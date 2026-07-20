"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { TaskDetailPanel } from "@/components/tasks/TaskDetailPanel"
import { api } from "@/lib/api"
import type { Task, TaskStatus, Project } from "@/lib/db/schema"
import {
  ALL_STATUSES,
  STATUS_LABEL,
  STATUS_COLOR,
  TOGGLE_COLOR,
  SORT_LABEL,
  SORT_MODE_KEY,
  compareTasks,
  formatDate,
  type SortMode,
} from "@/lib/taskStatus"

// ── メインページ ─────────────────────────────────
export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatuses, setActiveStatuses] = useState<Set<TaskStatus>>(
    new Set(ALL_STATUSES.filter((s) => s !== "done" && s !== "cancelled"))
  )
  const [projectMap, setProjectMap] = useState<Map<number, string>>(new Map())
  const [projects, setProjects] = useState<Project[]>([])
  const [selected, setSelected] = useState<Task | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>("category")
  const [now, setNow] = useState(() => Date.now())

  // 期限超過表示を定期的に更新する
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // 前回のソート設定を復元
  useEffect(() => {
    const saved = localStorage.getItem(SORT_MODE_KEY)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "category" || saved === "updated" || saved === "created") setSortMode(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem(SORT_MODE_KEY, sortMode)
  }, [sortMode])

  const load = useCallback(async () => {
    const [taskRows, projs] = await Promise.all([
      api.get<Task[]>("/api/tasks"),
      api.get<Project[]>("/api/projects?status=active"),
    ])
    setTasks(taskRows)
    setProjects(projs)
    setProjectMap(new Map(projs.map((p) => [p.id, p.title])))
    setLoading(false)
  }, [])

  // マウント時の初回fetch（loadは再利用される非同期関数のため静的解析の対象外）
  // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    await api.patch(`/api/tasks/${id}`, { status })
    load()
  }

  async function deleteTask(id: number) {
    await api.delete(`/api/tasks/${id}`)
    if (selectedId === id) setSelected(null)
    load()
  }

  async function handleSave(id: number, fields: Record<string, unknown>) {
    await api.patch(`/api/tasks/${id}`, fields)
    await load()
  }

  function handleSelectTask(task: Task) {
    setSelected((prev) => (prev?.id === task.id ? null : task))
  }

  const filtered = tasks
    .filter((t) => activeStatuses.has(t.status))
    .sort((a, b) => compareTasks(a, b, sortMode))

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
        <select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          className="text-xs px-2 py-1 rounded-full border bg-white text-gray-500 ml-auto focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
            <option key={m} value={m}>{SORT_LABEL[m]}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} 件</span>
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
                        <p className={`text-xs mt-0.5 pl-0.5 ${task.scheduledAt <= now ? "text-red-500" : "text-cyan-600"}`}>
                          {task.scheduledAt <= now ? "⚠ 期限超過 " : "🕐 "}{formatDate(task.scheduledAt)}
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
