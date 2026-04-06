import { NextRequest, NextResponse } from "next/server"
import { and, eq, gte, lt, isNotNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, type Task } from "@/lib/db/schema"

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.getTime(), end: end.getTime() }
}

export async function GET() {
  const { start, end } = todayRange()
  const rows = await db
    .select()
    .from(tasks)
    .where(and(isNotNull(tasks.todayStart), gte(tasks.todayStart, start), lt(tasks.todayStart, end)))
  rows.sort((a, b) => (a.todayStart ?? 0) - (b.todayStart ?? 0))
  return NextResponse.json(rows)
}

const AssignSchema = z.object({
  taskId: z.number(),
  todayStart: z.number().nullable(),
  durationMin: z.number().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = AssignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updates: Partial<typeof tasks.$inferInsert> = {
    todayStart: parsed.data.todayStart,
    updatedAt: Date.now(),
  }
  if (parsed.data.durationMin != null) updates.durationMin = parsed.data.durationMin

  const result = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, parsed.data.taskId))
    .returning() as Task[]

  return NextResponse.json(result[0])
}
