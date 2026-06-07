"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useCapture } from "@/lib/useCapture"
import type { Task } from "@/lib/db/schema"

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [captureTitle, setCaptureTitle] = useState("")
  const [busy, setBusy] = useState(false)
  const captureRef = useRef<HTMLInputElement>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [notesMap, setNotesMap] = useState<Record<number, string>>({})

  const load = useCallback(async () => {
    const res = await fetch("/api/tasks?status=idea")
    const data: Task[] = await res.json()
    setIdeas(data)
    setNotesMap((prev) => {
      const next = { ...prev }
      for (const t of data) {
        if (!(t.id in next)) next[t.id] = t.notes ?? ""
      }
      return next
    })
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useCapture("idea", load)

  async function handleCapture(e: React.FormEvent) {
    e.preventDefault()
    if (!captureTitle.trim() || busy) return
    setBusy(true)
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: captureTitle.trim(), targetStatus: "idea" }),
    })
    setCaptureTitle("")
    setBusy(false)
    load()
  }

  async function saveNotes(id: number) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesMap[id] ?? "" }),
    })
  }

  function toggleExpand(id: number) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {/* キャプチャ入力 */}
      <form onSubmit={handleCapture} className="flex gap-2">
        <input
          ref={captureRef}
          value={captureTitle}
          onChange={(e) => setCaptureTitle(e.target.value)}
          placeholder="Idea を追加..."
          className="flex-1 text-base px-4 py-2.5 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-gray-50 placeholder:text-gray-400"
        />
        <button
          type="submit"
          disabled={busy || !captureTitle.trim()}
          className="px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          追加
        </button>
      </form>

      {/* Ideas リスト */}
      {loading ? (
        <p className="text-gray-400 text-sm">読み込み中...</p>
      ) : ideas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">💡</p>
          <p className="text-sm">思いついたことを記録しましょう</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {ideas.map((idea) => {
            const isOpen = expandedId === idea.id
            return (
              <li key={idea.id} className="bg-white rounded-xl border overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(idea.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-amber-50 transition-colors"
                >
                  <span className="text-amber-400 text-lg leading-none">💡</span>
                  <span className="flex-1 text-sm font-medium text-gray-800">{idea.title}</span>
                  <span className="text-xs text-gray-400 shrink-0">{isOpen ? "▲" : "▼"}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t bg-amber-50/40">
                    <textarea
                      value={notesMap[idea.id] ?? ""}
                      onChange={(e) => setNotesMap((prev) => ({ ...prev, [idea.id]: e.target.value }))}
                      onBlur={() => saveNotes(idea.id)}
                      placeholder="メモ..."
                      rows={4}
                      className="w-full mt-3 text-sm px-3 py-2 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">フォーカスを外すと自動保存</p>
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
