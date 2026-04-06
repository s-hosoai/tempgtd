import { NextRequest, NextResponse } from "next/server"
import { eq, desc } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { projects, tasks, type Project } from "@/lib/db/schema"
import { generateId } from "@/lib/id"
import { runMigrations } from "@/lib/db/migrate"

let migrated = false
function ensureMigrated() {
  if (!migrated) { runMigrations(); migrated = true }
}

const CreateProjectSchema = z.object({
  title: z.string().min(1),
  outcome: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  ensureMigrated()
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status") ?? "active"

  const rows = await db
    .select()
    .from(projects)
    .where(eq(projects.status, status as Project["status"]))
    .orderBy(desc(projects.createdAt))

  // Next Action のないプロジェクトを検出
  const projectIds = rows.map((p) => p.id)
  const nextTasks = projectIds.length
    ? await db
        .select({ projectId: tasks.projectId })
        .from(tasks)
        .where(eq(tasks.status, "next"))
    : []

  const hasNextSet = new Set(nextTasks.map((t) => t.projectId))

  const result = rows.map((p) => ({
    ...p,
    hasNextAction: hasNextSet.has(p.id),
  }))

  return NextResponse.json(result)
}

export async function POST(request: NextRequest) {
  ensureMigrated()
  const body = await request.json()
  const parsed = CreateProjectSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const now = Date.now()
  const result = await db
    .insert(projects)
    .values({
      id: generateId(),
      title: parsed.data.title,
      outcome: parsed.data.outcome ?? "",
      notes: parsed.data.notes ?? "",
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Project[]

  return NextResponse.json(result[0], { status: 201 })
}
