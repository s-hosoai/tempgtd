import { NextRequest, NextResponse } from "next/server"
import { desc } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { templates, type Template } from "@/lib/db/schema"
import { generateId } from "@/lib/id"

const CreateTemplateSchema = z.object({
  title: z.string().min(1),
  trigger: z.enum(["manual", "scheduled"]).optional(),
  cron: z.string().nullable().optional(),
  targetStatus: z.enum(["inbox", "next"]).optional(),
  notes: z.string().optional(),
})

export async function GET() {
  const rows = await db
    .select()
    .from(templates)
    .orderBy(desc(templates.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const now = Date.now()
  const result = await db
    .insert(templates)
    .values({
      id: generateId(),
      title: parsed.data.title,
      trigger: parsed.data.trigger ?? "manual",
      cron: parsed.data.cron ?? null,
      targetStatus: parsed.data.targetStatus ?? "inbox",
      notes: parsed.data.notes ?? "",
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Template[]

  return NextResponse.json(result[0], { status: 201 })
}
