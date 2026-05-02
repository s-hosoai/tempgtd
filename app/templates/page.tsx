"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import type { Template, TemplateTask } from "@/lib/db/schema"

type TemplateWithTasks = Template & { tasks: TemplateTask[] }

const OFFSET_LABELS: Record<string, string> = {
  none: "即時",
  cron: "cron",
  relative: "相対",
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateWithTasks[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [expandingId, setExpandingId] = useState<number | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const [newTrigger, setNewTrigger] = useState<"manual" | "scheduled">("manual")
  const [newCron, setNewCron] = useState("")
  const [newTargetStatus, setNewTargetStatus] = useState<"inbox" | "next">("inbox")
  const [openTemplateId, setOpenTemplateId] = useState<number | null>(null)
  const [addingTask, setAddingTask] = useState<number | null>(null)
  const [newTaskTitle, setNewTaskTitle] = useState("")
  const [newTaskOffsetType, setNewTaskOffsetType] = useState<"none" | "relative">("none")
  const [newTaskOffsetRelative, setNewTaskOffsetRelative] = useState("")

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates")
      const rows: Template[] = await res.json()
      const withTasks = await Promise.all(
        rows.map(async (t) => {
          const tRes = await fetch(`/api/templates/${t.id}/tasks`)
          const tasks: TemplateTask[] = await tRes.json()
          return { ...t, tasks }
        })
      )
      setTemplates(withTasks)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTemplates() }, [loadTemplates])

  async function handleCreate() {
    if (!newTitle.trim()) return
    await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTitle.trim(),
        trigger: newTrigger,
        cron: newTrigger === "scheduled" && newCron ? newCron : null,
        targetStatus: newTargetStatus,
      }),
    })
    setNewTitle("")
    setNewCron("")
    setNewTrigger("manual")
    setNewTargetStatus("inbox")
    setCreating(false)
    loadTemplates()
  }

  async function handleDelete(id: number) {
    if (!confirm("このテンプレートを削除しますか？")) return
    await fetch(`/api/templates/${id}`, { method: "DELETE" })
    loadTemplates()
  }

  async function handleExpand(id: number) {
    setExpandingId(id)
    await fetch(`/api/templates/${id}/expand`, { method: "POST" })
    setExpandingId(null)
    alert("タスクを展開しました")
  }

  async function handleAddTask(templateId: number) {
    if (!newTaskTitle.trim()) return
    await fetch(`/api/templates/${templateId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: newTaskTitle.trim(),
        offsetType: newTaskOffsetType,
        offsetRelative: newTaskOffsetType === "relative" ? newTaskOffsetRelative : null,
      }),
    })
    setNewTaskTitle("")
    setNewTaskOffsetType("none")
    setNewTaskOffsetRelative("")
    setAddingTask(null)
    loadTemplates()
  }

  async function handleDeleteTask(templateId: number, taskId: number) {
    await fetch(`/api/templates/${templateId}/tasks/${taskId}`, { method: "DELETE" })
    loadTemplates()
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <Button size="sm" onClick={() => setCreating(true)}>+ 新規テンプレート</Button>
      </div>

      {creating && (
        <div className="bg-white border rounded-lg p-4 mb-6 space-y-3">
          <Input
            placeholder="テンプレート名"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <div className="flex gap-3 items-center">
            <label className="text-sm text-gray-600">トリガー:</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={newTrigger}
              onChange={(e) => setNewTrigger(e.target.value as "manual" | "scheduled")}
            >
              <option value="manual">手動</option>
              <option value="scheduled">スケジュール (cron)</option>
            </select>
            {newTrigger === "scheduled" && (
              <Input
                className="w-40"
                placeholder="cron式 (例: 0 9 1 * *)"
                value={newCron}
                onChange={(e) => setNewCron(e.target.value)}
              />
            )}
          </div>
          <div className="flex gap-3 items-center">
            <label className="text-sm text-gray-600">展開先:</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={newTargetStatus}
              onChange={(e) => setNewTargetStatus(e.target.value as "inbox" | "next")}
            >
              <option value="inbox">Inbox</option>
              <option value="next">Next Actions</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}>作成</Button>
            <Button size="sm" variant="outline" onClick={() => setCreating(false)}>キャンセル</Button>
          </div>
        </div>
      )}

      {templates.length === 0 && !creating && (
        <p className="text-gray-400 text-sm">テンプレートがありません</p>
      )}

      <div className="space-y-4">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="bg-white border rounded-lg p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{tmpl.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {tmpl.trigger === "manual" ? "手動" : "cron"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    → {tmpl.targetStatus === "inbox" ? "Inbox" : "Next Actions"}
                  </Badge>
                  {tmpl.cron && (
                    <span className="text-xs text-gray-400 font-mono">{tmpl.cron}</span>
                  )}
                </div>
                {tmpl.lastRunAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    最終展開: {new Date(tmpl.lastRunAt).toLocaleString("ja-JP")}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleExpand(tmpl.id)}
                  disabled={expandingId === tmpl.id}
                >
                  {expandingId === tmpl.id ? "展開中..." : "展開"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenTemplateId(openTemplateId === tmpl.id ? null : tmpl.id)}
                >
                  {openTemplateId === tmpl.id ? "▲ タスク" : "▼ タスク"} ({tmpl.tasks.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(tmpl.id)}
                >
                  削除
                </Button>
              </div>
            </div>

            {openTemplateId === tmpl.id && (
              <div className="mt-4 border-t pt-3">
                <ul className="space-y-2 mb-3">
                  {tmpl.tasks.length === 0 && (
                    <li className="text-sm text-gray-400">タスクなし</li>
                  )}
                  {tmpl.tasks.map((tt) => (
                    <li key={tt.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className={tt.parentId ? "pl-4 text-gray-600" : ""}>
                        {tt.title}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {tt.offsetType !== "none" && (
                          <Badge variant="outline" className="text-xs">
                            {OFFSET_LABELS[tt.offsetType]}
                            {tt.offsetRelative ? ` ${tt.offsetRelative}` : ""}
                          </Badge>
                        )}
                        <button
                          className="text-gray-400 hover:text-red-500 text-xs px-1"
                          onClick={() => handleDeleteTask(tmpl.id, tt.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                {addingTask === tmpl.id ? (
                  <div className="space-y-2">
                    <Input
                      placeholder="タスクタイトル"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && handleAddTask(tmpl.id)}
                    />
                    <div className="flex gap-2 items-center">
                      <select
                        className="border rounded px-2 py-1 text-sm"
                        value={newTaskOffsetType}
                        onChange={(e) => setNewTaskOffsetType(e.target.value as "none" | "relative")}
                      >
                        <option value="none">即時</option>
                        <option value="relative">相対日付</option>
                      </select>
                      {newTaskOffsetType === "relative" && (
                        <Input
                          className="w-32"
                          placeholder="+3d, next_monday..."
                          value={newTaskOffsetRelative}
                          onChange={(e) => setNewTaskOffsetRelative(e.target.value)}
                        />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAddTask(tmpl.id)}>追加</Button>
                      <Button size="sm" variant="outline" onClick={() => setAddingTask(null)}>キャンセル</Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setAddingTask(tmpl.id)}>
                    + タスク追加
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
