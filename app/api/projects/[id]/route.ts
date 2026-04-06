import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { projects, type Project } from "@/lib/db/schema"

const UpdateProjectSchema = z.object({
  title: z.string().min(1).optional(),
  outcome: z.string().optional(),
  status: z.enum(["active", "someday", "done", "cancelled"]).optional(),
  notes: z.string().optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, parseInt(id)))

  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await request.json()
  const parsed = UpdateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const result = await db
    .update(projects)
    .set({ ...parsed.data, updatedAt: Date.now() })
    .where(eq(projects.id, parseInt(id)))
    .returning() as Project[]

  if (!result[0]) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(result[0])
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db
    .update(projects)
    .set({ status: "cancelled", updatedAt: Date.now() })
    .where(eq(projects.id, parseInt(id)))

  return new NextResponse(null, { status: 204 })
}
