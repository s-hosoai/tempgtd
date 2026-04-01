import { NextRequest, NextResponse } from "next/server"
import { eq, asc, desc } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { tasks, type Task } from "@/lib/db/schema"
import { generateId } from "@/lib/id"
import { runMigrations } from "@/lib/db/migrate"

runMigrations()

const CreateTaskSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  parentId: z.number().optional(),
})

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get("status")

  const rows = status
    ? await db
        .select()
        .from(tasks)
        .where(eq(tasks.status, status as "inbox" | "next" | "done" | "cancelled"))
        .orderBy(
          status === "next"
            ? asc(tasks.nextOrder)
            : desc(tasks.createdAt)
        )
    : await db.select().from(tasks).orderBy(desc(tasks.createdAt))

  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const parsed = CreateTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const now = Date.now()
  const id = generateId()
  const result = await db
    .insert(tasks)
    .values({
      id,
      title: parsed.data.title,
      notes: parsed.data.notes ?? "",
      parentId: parsed.data.parentId ?? null,
      status: "inbox",
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Task[]

  return NextResponse.json(result[0], { status: 201 })
}
