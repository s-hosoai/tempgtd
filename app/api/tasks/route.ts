import { NextRequest, NextResponse } from "next/server"
import { and, eq, asc, desc, isNull, lte, or } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, type Task } from "@/lib/db/schema"
import { generateId } from "@/lib/id"
const CreateTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  parentId: z.number().optional(),
  projectId: z.number().optional(),
  targetStatus: z.enum(["inbox", "next", "delegate", "waiting", "someday"]).optional(),
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

  const now = Date.now()
  const result = await db
    .insert(tasks)
    .values({
      id: generateId(),
      title: parsed.data.title,
      notes: parsed.data.notes ?? "",
      parentId: parsed.data.parentId ?? null,
      projectId: parsed.data.projectId ?? null,
      status: parsed.data.targetStatus ?? "inbox",
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Task[]

  return NextResponse.json(result[0], { status: 201 })
}
