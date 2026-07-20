import type { Task, TaskStatus } from "@/lib/db/schema"

export const ALL_STATUSES: TaskStatus[] = ["inbox", "next", "delegate", "waiting", "scheduled", "someday", "idea", "done", "cancelled"]

const STATUS_ORDER: Record<TaskStatus, number> = Object.fromEntries(
  ALL_STATUSES.map((s, i) => [s, i])
) as Record<TaskStatus, number>

export type SortMode = "category" | "updated" | "created"

export const SORT_LABEL: Record<SortMode, string> = {
  category: "カテゴリ順",
  updated: "更新日時順",
  created: "作成日時順",
}

export const SORT_MODE_KEY = "gtd:tasks:sortMode"

// カテゴリごとの並び順 → カテゴリ内は既存の状態別デフォルト順に合わせる
export function compareTasks(a: Task, b: Task, mode: SortMode): number {
  if (mode === "updated") return b.updatedAt - a.updatedAt
  if (mode === "created") return b.createdAt - a.createdAt

  const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
  if (statusDiff !== 0) return statusDiff

  if (a.status === "next") return (a.nextOrder ?? 0) - (b.nextOrder ?? 0)
  if (a.status === "inbox") return a.createdAt - b.createdAt
  if (a.status === "done") return b.updatedAt - a.updatedAt
  return b.createdAt - a.createdAt
}

export const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "Inbox",
  next: "Next",
  delegate: "Delegate",
  waiting: "Waiting",
  scheduled: "Scheduled",
  someday: "Someday",
  idea: "Idea",
  done: "Done",
  cancelled: "Cancel",
}

export const STATUS_COLOR: Record<TaskStatus, string> = {
  inbox:     "bg-gray-100 text-gray-600",
  next:      "bg-blue-100 text-blue-700",
  delegate:  "bg-purple-100 text-purple-700",
  waiting:   "bg-yellow-100 text-yellow-700",
  scheduled: "bg-cyan-100 text-cyan-700",
  someday:   "bg-gray-100 text-gray-500",
  idea:      "bg-amber-100 text-amber-700",
  done:      "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-400",
}

export const TOGGLE_COLOR: Record<TaskStatus, string> = {
  inbox:     "bg-gray-200 text-gray-700 border-gray-300",
  next:      "bg-blue-500 text-white border-blue-500",
  delegate:  "bg-purple-500 text-white border-purple-500",
  waiting:   "bg-yellow-400 text-white border-yellow-400",
  scheduled: "bg-cyan-500 text-white border-cyan-500",
  someday:   "bg-gray-400 text-white border-gray-400",
  idea:      "bg-amber-400 text-white border-amber-400",
  done:      "bg-green-500 text-white border-green-500",
  cancelled: "bg-red-400 text-white border-red-400",
}

export function formatDate(ms: number | null): string {
  if (!ms) return ""
  return new Date(ms).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
}
