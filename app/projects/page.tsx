"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, ChevronRight } from "lucide-react"
import type { Task, Project } from "@/lib/db/schema"

type ProjectWithNext = Project & { hasNextAction: boolean }

const STATUS_LABEL: Record<string, string> = {
  inbox: "Inbox", next: "Next", delegate: "Delegate",
  waiting: "Waiting", scheduled: "Scheduled", someday: "Someday",
  done: "完了", cancelled: "ｷｬﾝｾﾙ",
}
const STATUS_COLOR: Record<string, string> = {
  inbox: "bg-gray-100 text-gray-600",
  next: "bg-blue-100 text-blue-700",
  delegate: "bg-purple-100 text-purple-700",
  waiting: "bg-yellow-100 text-yellow-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  someday: "bg-gray-100 text-gray-500",
  done: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-400 line-through",
}

function TaskTree({ tasks, depth = 0 }: { tasks: Task[]; depth?: number }) {
  const byParent = new Map<number | null, Task[]>()
  for (const t of tasks) {
    const key = t.parentId ?? null
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(t)
  }

  function renderNodes(parentId: number | null): React.ReactNode {
    const children = byParent.get(parentId) ?? []
    if (children.length === 0) return null
    return (
      <ul className={depth === 0 ? "space-y-1" : "mt-1 space-y-1"}>
        {children.map((t) => (
          <li key={t.id}>
            <div
              className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50"
              style={{ paddingLeft: `${(depth + 1) * 16}px` }}
            >
              <span className="flex-1 text-sm text-gray-800">{t.title}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOR[t.status]}`}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
            {renderNodes(t.id)}
          </li>
        ))}
      </ul>
    )
  }

  return <>{renderNodes(null)}</>
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithNext[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [outcome, setOutcome] = useState("")

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [projectTasks, setProjectTasks] = useState<Record<number, Task[]>>({})
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [addingTask, setAddingTask] = useState(false)

  async function load() {
    const res = await fetch("/api/projects?status=active")
    setProjects(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function loadProjectTasks(projectId: number) {
    const res = await fetch(`/api/tasks?projectId=${projectId}`)
    const data: Task[] = await res.json()
    setProjectTasks((prev) => ({ ...prev, [projectId]: data }))
  }

  function handleToggle(projectId: number) {
    if (expandedId === projectId) {
      setExpandedId(null)
      setNewTaskTitle("")
    } else {
      setExpandedId(projectId)
      setNewTaskTitle("")
      loadProjectTasks(projectId)
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), outcome: outcome.trim() }),
    })
    setTitle("")
    setOutcome("")
    setAdding(false)
    load()
  }

  async function handleAddTask(e: React.FormEvent, projectId: number) {
    e.preventDefault()
    if (!newTaskTitle.trim() || addingTask) return
    setAddingTask(true)
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTaskTitle.trim(), projectId, targetStatus: "inbox" }),
    })
    setNewTaskTitle("")
    setAddingTask(false)
    loadProjectTasks(projectId)
  }

  async function handleDone(id: number) {
    await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    })
    load()
  }

  async function handleToTemplate(id: number) {
    const res = await fetch(`/api/projects/${id}/to-template`, { method: "POST" })
    if (res.ok) alert("テンプレートを作成しました")
    else alert("変換に失敗しました")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? "キャンセル" : "+ 追加"}
        </Button>
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="bg-white border rounded-xl p-4 space-y-3">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="プロジェクト名"
            autoFocus
          />
          <Textarea
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
            placeholder="完了したときの状態（望ましい結果）"
            rows={2}
          />
          <Button type="submit" size="sm">作成</Button>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : projects.length === 0 ? (
        <p className="text-gray-400 text-sm">アクティブなプロジェクトがありません</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => {
            const isExpanded = expandedId === p.id
            const tasks = projectTasks[p.id] ?? []
            return (
              <li key={p.id} className="bg-white rounded-lg border overflow-hidden">
                {/* プロジェクトヘッダー */}
                <div
                  className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleToggle(p.id)}
                >
                  {isExpanded ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                  <span className="flex-1 font-medium text-sm">{p.title}</span>
                  {!p.hasNextAction && (
                    <Badge variant="destructive" className="text-xs">Next Actionなし</Badge>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToTemplate(p.id) }}
                    className="text-xs text-gray-400 hover:text-blue-600"
                  >
                    テンプレート化
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDone(p.id) }}
                    className="text-xs text-gray-400 hover:text-green-600"
                  >
                    完了
                  </button>
                </div>

                {p.outcome && !isExpanded && (
                  <p className="text-xs text-gray-500 px-10 pb-2">{p.outcome}</p>
                )}

                {/* 展開エリア */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 px-4 py-3 space-y-2">
                    {p.outcome && (
                      <p className="text-xs text-gray-500 mb-2">{p.outcome}</p>
                    )}

                    {tasks.length === 0 ? (
                      <p className="text-xs text-gray-400 px-2">タスクがありません</p>
                    ) : (
                      <TaskTree tasks={tasks} />
                    )}

                    {/* タスク追加フォーム */}
                    <form
                      onSubmit={(e) => handleAddTask(e, p.id)}
                      className="flex gap-2 pt-2 border-t mt-2"
                    >
                      <input
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="タスクを追加（Inboxへ）"
                        className="flex-1 text-sm px-3 py-1.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                        autoFocus
                      />
                      <Button type="submit" size="sm" disabled={!newTaskTitle.trim() || addingTask}>
                        追加
                      </Button>
                    </form>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
