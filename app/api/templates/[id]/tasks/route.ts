import { NextRequest, NextResponse } from "next/server"
import { eq, asc } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { templateTasks, type TemplateTask } from "@/lib/db/schema"
import { generateId } from "@/lib/id"

const CreateTemplateTaskSchema = z.object({
  parentId: z.number().nullable().optional(),
  title: z.string().min(1),
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const rows = await db
    .select()
    .from(templateTasks)
    .where(eq(templateTasks.templateId, parseInt(id)))
    .orderBy(asc(templateTasks.order))

  return NextResponse.json(rows)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const templateId = parseInt(id)

  const body = await request.json()
  const parsed = CreateTemplateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const now = Date.now()
  const result = await db
    .insert(templateTasks)
    .values({
      id: generateId(),
      templateId,
      parentId: parsed.data.parentId ?? null,
      title: parsed.data.title,
      order: parsed.data.order ?? 0,
      context: parsed.data.context ?? "",
      tags: parsed.data.tags ?? "",
      durationMin: parsed.data.durationMin ?? 30,
      energy: parsed.data.energy ?? null,
      notes: parsed.data.notes ?? "",
      offsetType: parsed.data.offsetType ?? "none",
      offsetCron: parsed.data.offsetCron ?? null,
      offsetRelative: parsed.data.offsetRelative ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .returning() as TemplateTask[]

  return NextResponse.json(result[0], { status: 201 })
}
