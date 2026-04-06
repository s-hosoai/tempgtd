"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type ReviewType = "daily" | "weekly" | "monthly"

type Stats = {
  inbox: number
  next: number
  delegate: number
  waiting: number
  someday: number
  stalledProjects: number
}

const DAILY_STEPS = [
  { label: "Inboxを確認・簡易Triage", href: "/inbox/triage", check: (s: Stats) => s.inbox === 0 },
  { label: "今日のスケジュールを組む", href: "/today", check: () => false },
  { label: "Delegateを確認（依頼漏れ）", href: "/delegate", check: (s: Stats) => s.delegate === 0 },
  { label: "Waiting Forを確認", href: "/waiting", check: (s: Stats) => s.waiting === 0 },
]

const WEEKLY_STEPS = [
  { label: "Inbox処理（Inbox Zero）", href: "/inbox/triage", check: (s: Stats) => s.inbox === 0 },
  { label: "Next Actions見直し", href: "/next-actions", check: () => false },
  { label: "プロジェクト確認（Next Actionなしを特定）", href: "/projects", check: (s: Stats) => s.stalledProjects === 0 },
  { label: "Delegate / Waiting For確認", href: "/delegate", check: (s: Stats) => s.delegate === 0 && s.waiting === 0 },
  { label: "Someday/Maybe確認（昇格させるものがないか）", href: "/someday", check: (s: Stats) => s.someday === 0 },
]

const MONTHLY_STEPS = [
  ...WEEKLY_STEPS,
  { label: "完了プロジェクトの振り返り", href: "/projects", check: () => false },
  { label: "Someday全件見直し", href: "/someday", check: () => false },
]

const STEPS: Record<ReviewType, typeof DAILY_STEPS> = {
  daily: DAILY_STEPS,
  weekly: WEEKLY_STEPS,
  monthly: MONTHLY_STEPS,
}

export default function ReviewPage() {
  const [type, setType] = useState<ReviewType>("daily")
  const [stats, setStats] = useState<Stats | null>(null)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  useEffect(() => {
    async function load() {
      const [inbox, next, delegate, waiting, someday, projects] = await Promise.all([
        fetch("/api/tasks?status=inbox").then((r) => r.json()),
        fetch("/api/tasks?status=next").then((r) => r.json()),
        fetch("/api/tasks?status=delegate").then((r) => r.json()),
        fetch("/api/tasks?status=waiting").then((r) => r.json()),
        fetch("/api/tasks?status=someday").then((r) => r.json()),
        fetch("/api/projects?status=active").then((r) => r.json()),
      ])
      setStats({
        inbox: inbox.length,
        next: next.length,
        delegate: delegate.length,
        waiting: waiting.length,
        someday: someday.length,
        stalledProjects: projects.filter((p: { hasNextAction: boolean }) => !p.hasNextAction).length,
      })
    }
    load()
  }, [])

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  const steps = STEPS[type]
  const progress = checked.size
  const total = steps.length

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Review</h1>

      {/* タイプ切り替え */}
      <div className="flex gap-2">
        {(["daily", "weekly", "monthly"] as ReviewType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setChecked(new Set()) }}
            className={`px-4 py-1.5 rounded-full border text-sm transition-colors ${
              type === t ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {t === "daily" ? "日次" : t === "weekly" ? "週次" : "月次"}
          </button>
        ))}
      </div>

      {/* 統計 */}
      {stats && (
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">Inbox: {stats.inbox}</Badge>
          <Badge variant="outline">Next: {stats.next}</Badge>
          <Badge variant="outline">Delegate: {stats.delegate}</Badge>
          <Badge variant="outline">Waiting: {stats.waiting}</Badge>
          <Badge variant="outline">Someday: {stats.someday}</Badge>
          {stats.stalledProjects > 0 && (
            <Badge variant="destructive">停滞プロジェクト: {stats.stalledProjects}</Badge>
          )}
        </div>
      )}

      {/* 進捗バー */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{progress} / {total} 完了</span>
          {progress === total && <span className="text-green-600 font-medium">Review 完了！</span>}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* チェックリスト */}
      <ul className="space-y-2">
        {steps.map((step, i) => {
          const autoChecked = stats ? step.check(stats) : false
          const isChecked = checked.has(i) || autoChecked
          return (
            <li
              key={i}
              className={`flex items-center gap-3 bg-white rounded-lg border px-4 py-3 ${isChecked ? "opacity-60" : ""}`}
            >
              <button
                onClick={() => toggle(i)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                  isChecked ? "bg-green-500 border-green-500 text-white" : "border-gray-300 hover:border-green-400"
                }`}
              >
                {isChecked && <span className="text-xs">✓</span>}
              </button>
              <span className={`flex-1 text-sm ${isChecked ? "line-through text-gray-400" : ""}`}>
                {step.label}
              </span>
              <Link href={step.href}>
                <Button variant="outline" size="sm" className="text-xs h-7">開く</Button>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
