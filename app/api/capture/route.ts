/**
 * POST /api/capture
 *
 * テキストを GTD キャプチャルールで解釈してタスクを作成する。
 * AI エージェント・チャットツールからの利用を想定。
 *
 * 入力規則（text フィールド）:
 *   [J] タスク        → Next Action 先頭（2分ルール）
 *   [N] タスク        → Next Action
 *   [S] タスク        → Someday
 *   [D] タスク        → Delegate
 *   [W] タスク        → Waiting
 *   [I] タスク        → Idea
 *   6/2 10:00 タスク  → Scheduled（日時指定）
 *   6/2 タスク        → Scheduled（9:00 デフォルト）
 *   プロジェクト名:タスク → プロジェクトに追加（未存在時は自動作成）
 *   プレフィックスなし → Inbox
 */
import { NextRequest, NextResponse } from "next/server"
import { eq, max } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, projects, type Task, type Project } from "@/lib/db/schema"
import { generateId } from "@/lib/id"
import { parseCapture } from "@/lib/captureParser"

const CaptureSchema = z.object({
  text: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = CaptureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "text フィールドが必要です" }, { status: 400 })
  }

  const p = parseCapture(parsed.data.text)
  if (!p.title) {
    return NextResponse.json({ error: "タイトルが空です" }, { status: 400 })
  }

  // プロジェクト名からIDを解決（未存在時は自動作成）
  let resolvedProjectId: number | null = null
  if (p.projectName) {
    const allProjects = await db
      .select({ id: projects.id, title: projects.title })
      .from(projects)
      .where(eq(projects.status, "active"))
    const lower = p.projectName.toLowerCase()
    const found = allProjects.find((proj) => proj.title.toLowerCase() === lower)
    if (found) {
      resolvedProjectId = found.id
    } else {
      const pNow = Date.now()
      const [created] = await db
        .insert(projects)
        .values({ id: generateId(), title: p.projectName, outcome: "", notes: "", createdAt: pNow, updatedAt: pNow })
        .returning() as Project[]
      resolvedProjectId = created.id
    }
  }

  const status = p.status ?? "inbox"

  let nextOrder: number | null = null
  if (status === "next") {
    if (p.twoMinute) {
      nextOrder = 0
    } else {
      const [row] = await db.select({ maxOrder: max(tasks.nextOrder) }).from(tasks).where(eq(tasks.status, "next"))
      nextOrder = (row?.maxOrder ?? 0) + 1
    }
  }

  const now = Date.now()
  const [task] = await db
    .insert(tasks)
    .values({
      id: generateId(),
      title: p.title,
      notes: "",
      status,
      projectId: resolvedProjectId,
      nextOrder,
      scheduledAt: p.scheduledAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Task[]

  return NextResponse.json({
    task,
    parsed: {
      title: p.title,
      status,
      twoMinute: p.twoMinute ?? false,
      projectName: p.projectName ?? null,
      scheduledAt: p.scheduledAt ? new Date(p.scheduledAt).toISOString() : null,
    },
  }, { status: 201 })
}
