import { NextRequest, NextResponse } from "next/server"
import { eq, max } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, type Task } from "@/lib/db/schema"

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(["inbox", "next", "done", "cancelled"]).optional(),
  notes: z.string().optional(),
  twoMinute: z.boolean().optional(), // trueなら next_order=0（先頭）
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

  const updates: Partial<typeof tasks.$inferInsert> = {
    ...parsed.data,
    updatedAt: Date.now(),
  }
  delete (updates as { twoMinute?: boolean }).twoMinute

  // nextへ移動する場合のnext_order計算
  if (parsed.data.status === "next") {
    if (parsed.data.twoMinute) {
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

  await db.update(tasks).set({ status: "cancelled", updatedAt: Date.now() }).where(eq(tasks.id, taskId))

  return new NextResponse(null, { status: 204 })
}
