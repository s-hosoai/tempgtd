import { NextRequest, NextResponse } from "next/server"
import { eq, asc, desc } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, type Task } from "@/lib/db/schema"
import { generateId } from "@/lib/id"
import { runMigrations } from "@/lib/db/migrate"

let migrated = false
function ensureMigrated() {
  if (!migrated) { runMigrations(); migrated = true }
}

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  parentId: z.number().optional(),
  projectId: z.number().optional(),
})

export async function GET(request: NextRequest) {
  ensureMigrated()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")
  const projectId = searchParams.get("projectId")

  let query = db.select().from(tasks).$dynamic()

  if (status) {
    query = query.where(eq(tasks.status, status as Task["status"]))
  }
  if (projectId) {
    query = query.where(eq(tasks.projectId, parseInt(projectId)))
  }

  const orderBy = status === "next" ? asc(tasks.nextOrder) : desc(tasks.createdAt)
  const rows = await query.orderBy(orderBy)

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  ensureMigrated()
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
      status: "inbox",
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Task[]

  return NextResponse.json(result[0], { status: 201 })
}
