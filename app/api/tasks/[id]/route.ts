import { NextRequest, NextResponse } from "next/server"
import { eq, max } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, type Task } from "@/lib/db/schema"

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["inbox", "next", "delegate", "waiting", "scheduled", "someday", "done", "cancelled"]).optional(),
  notes: z.string().optional(),
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

  const { twoMinute, ...fields } = parsed.data
  const updates: Partial<typeof tasks.$inferInsert> = {
    ...fields,
    updatedAt: Date.now(),
  }

  if (parsed.data.status === "next") {
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
