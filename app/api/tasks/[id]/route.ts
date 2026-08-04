import { NextRequest, NextResponse } from "next/server"
import { eq, max, inArray } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, type Task } from "@/lib/db/schema"

// 親タスク完了時、まだ終了していない子孫タスク（ネスト無制限）をすべて完了にする
async function cascadeCompleteDescendants(rootId: number, now: number) {
  const all = await db.select({ id: tasks.id, parentId: tasks.parentId, status: tasks.status }).from(tasks)
  const childrenOf = new Map<number, typeof all>()
  for (const t of all) {
    if (t.parentId == null) continue
    if (!childrenOf.has(t.parentId)) childrenOf.set(t.parentId, [])
    childrenOf.get(t.parentId)!.push(t)
  }

  const toComplete: number[] = []
  const stack = [rootId]
  while (stack.length > 0) {
    const id = stack.pop()!
    for (const child of childrenOf.get(id) ?? []) {
      stack.push(child.id)
      if (child.status !== "done" && child.status !== "cancelled") {
        toComplete.push(child.id)
      }
    }
  }

  if (toComplete.length > 0) {
    await db.update(tasks).set({ status: "done", updatedAt: now }).where(inArray(tasks.id, toComplete))
  }
}

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["inbox", "next", "delegate", "waiting", "scheduled", "someday", "idea", "done", "cancelled"]).optional(),
  notes: z.string().optional(),
  parentId: z.number().nullable().optional(),
  projectId: z.number().nullable().optional(),
  waitingFor: z.string().nullable().optional(),
  scheduledAt: z.number().nullable().optional(),
  deferredUntil: z.number().nullable().optional(),
  todayStart: z.number().nullable().optional(),
  durationMin: z.number().optional(),
  context: z.string().optional(),  // JSON配列文字列
  tags: z.string().optional(),     // JSON配列文字列
  energy: z.enum(["low", "mid", "high"]).nullable().optional(),
  twoMinute: z.boolean().optional(),
  nextOrder: z.number().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  const body = await request.json()
  const parsed = UpdateTaskSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.parentId === taskId) {
    return NextResponse.json({ error: "parentId cannot equal the task's own id" }, { status: 400 })
  }

  const { twoMinute, ...fields } = parsed.data
  const updates: Partial<typeof tasks.$inferInsert> = {
    ...fields,
    updatedAt: Date.now(),
  }

  if (parsed.data.status === "next" && parsed.data.nextOrder === undefined) {
    if (twoMinute) {
      updates.nextOrder = 0
    } else {
      const [result] = await db
        .select({ maxOrder: max(tasks.nextOrder) })
        .from(tasks)
        .where(eq(tasks.status, "next"))
      updates.nextOrder = (result?.maxOrder ?? 0) + 1
    }
  }

  const result = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, taskId))
    .returning() as Task[]

  if (!result[0]) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  if (parsed.data.status === "done") {
    await cascadeCompleteDescendants(taskId, updates.updatedAt as number)
  }

  return NextResponse.json(result[0])
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const taskId = parseInt(id)
  await db.delete(tasks).where(eq(tasks.id, taskId))

  return new NextResponse(null, { status: 204 })
}
