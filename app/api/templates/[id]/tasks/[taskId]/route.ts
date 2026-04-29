import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { templateTasks, type TemplateTask } from "@/lib/db/schema"

const UpdateTemplateTaskSchema = z.object({
  parentId: z.number().nullable().optional(),
  title: z.string().min(1).optional(),
  order: z.number().optional(),
  context: z.string().optional(),
  tags: z.string().optional(),
  durationMin: z.number().optional(),
  energy: z.enum(["low", "mid", "high"]).nullable().optional(),
  notes: z.string().optional(),
  offsetType: z.enum(["none", "cron", "relative"]).optional(),
  offsetCron: z.string().nullable().optional(),
  offsetRelative: z.string().nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params
  const body = await request.json()
  const parsed = UpdateTemplateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const result = await db
    .update(templateTasks)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(templateTasks.id, parseInt(taskId)))
    .returning() as TemplateTask[]

  if (!result[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(result[0])
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { taskId } = await params
  await db.delete(templateTasks).where(eq(templateTasks.id, parseInt(taskId)))
  return new NextResponse(null, { status: 204 })
}
