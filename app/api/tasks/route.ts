import { NextRequest, NextResponse } from "next/server"
import { and, eq, asc, desc, isNull, lte, or, max } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, projects, type Task, type Project } from "@/lib/db/schema"
import { generateId } from "@/lib/id"
const CreateTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  parentId: z.number().optional(),
  projectId: z.number().optional(),
  projectName: z.string().optional(),
  targetStatus: z.enum(["inbox", "next", "delegate", "waiting", "someday", "scheduled", "idea"]).optional(),
  twoMinute: z.boolean().optional(),
  scheduledAt: z.number().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const projectId = searchParams.get("projectId")

  let query = db.select().from(tasks).$dynamic()

  const conditions = []
  if (status) conditions.push(eq(tasks.status, status as Task["status"]))
  if (projectId) conditions.push(eq(tasks.projectId, parseInt(projectId)))
  // inbox では先送り中（deferred_until > now）のタスクを除外
  if (status === "inbox") {
    const now = Date.now()
    conditions.push(or(isNull(tasks.deferredUntil), lte(tasks.deferredUntil, now))!)
  }
  if (conditions.length > 0) query = query.where(and(...conditions))

  const orderBy =
    status === "next"    ? asc(tasks.nextOrder) :
    status === "inbox"   ? asc(tasks.createdAt) :  // 古い順（トリアージ用）
    status === "done"    ? desc(tasks.updatedAt) :  // 完了日時の新しい順
                           desc(tasks.createdAt)
  const rows = await query.orderBy(orderBy)

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { title, notes, parentId, projectId, projectName, targetStatus, twoMinute, scheduledAt } = parsed.data

  // プロジェクト名からIDを解決（存在しなければ新規作成）
  let resolvedProjectId = projectId ?? null
  if (projectName && !resolvedProjectId) {
    const allProjects = await db.select({ id: projects.id, title: projects.title }).from(projects).where(eq(projects.status, "active"))
    const lower = projectName.toLowerCase()
    const found = allProjects.find((p) => p.title.toLowerCase() === lower)
    if (found) {
      resolvedProjectId = found.id
    } else {
      const pNow = Date.now()
      const [created] = await db.insert(projects).values({
        id: generateId(),
        title: projectName,
        outcome: "",
        notes: "",
        createdAt: pNow,
        updatedAt: pNow,
      }).returning() as Project[]
      resolvedProjectId = created.id
    }
  }

  const status = targetStatus ?? "inbox"

  // next ステータス時の nextOrder 計算
  let nextOrder: number | null = null
  if (status === "next") {
    if (twoMinute) {
      nextOrder = 0
    } else {
      const [row] = await db.select({ maxOrder: max(tasks.nextOrder) }).from(tasks).where(eq(tasks.status, "next"))
      nextOrder = (row?.maxOrder ?? 0) + 1
    }
  }

  const now = Date.now()
  const result = await db
    .insert(tasks)
    .values({
      id: generateId(),
      title,
      notes: notes ?? "",
      parentId: parentId ?? null,
      projectId: resolvedProjectId,
      status,
      nextOrder,
      scheduledAt: scheduledAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Task[]

  return NextResponse.json(result[0], { status: 201 })
}
