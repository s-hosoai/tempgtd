"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

type ProjectWithNext = {
  id: number
  title: string
  outcome: string
  status: string
  notes: string
  createdAt: number
  updatedAt: number
  hasNextAction: boolean
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectWithNext[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState("")
  const [outcome, setOutcome] = useState("")

  async function load() {
    const res = await fetch("/api/projects?status=active")
    setProjects(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
          {projects.map((p) => (
            <li key={p.id} className="bg-white rounded-lg border px-4 py-3 space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex-1 font-medium text-sm">{p.title}</span>
                {!p.hasNextAction && (
                  <Badge variant="destructive" className="text-xs">Next Actionなし</Badge>
                )}
                <button
                  onClick={() => handleToTemplate(p.id)}
                  className="text-xs text-gray-400 hover:text-blue-600"
                >
                  テンプレート化
                </button>
                <button
                  onClick={() => handleDone(p.id)}
                  className="text-xs text-gray-400 hover:text-green-600"
                >
                  完了
                </button>
              </div>
              {p.outcome && (
                <p className="text-xs text-gray-500">{p.outcome}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
