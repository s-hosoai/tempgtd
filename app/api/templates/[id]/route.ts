import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { templates, type Template } from "@/lib/db/schema"

const UpdateTemplateSchema = z.object({
  title: z.string().min(1).optional(),
  trigger: z.enum(["manual", "scheduled"]).optional(),
  cron: z.string().nullable().optional(),
  targetStatus: z.enum(["inbox", "next"]).optional(),
  notes: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [row] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, parseInt(id)))

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(row)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = UpdateTemplateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const result = await db
    .update(templates)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(templates.id, parseInt(id)))
    .returning() as Template[]

  if (!result[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(result[0])
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.delete(templates).where(eq(templates.id, parseInt(id)))
  return new NextResponse(null, { status: 204 })
}
