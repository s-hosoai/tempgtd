"use client"

import { useState, useEffect, useRef } from "react"
import { X } from "lucide-react"
import type { Task, TaskStatus, Project } from "@/lib/db/schema"
import { ALL_STATUSES, STATUS_LABEL } from "@/lib/taskStatus"

export function TaskDetailPanel({
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
  // task切り替え時のみ実行し、フィールドの中身自体は依存に含めない
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
