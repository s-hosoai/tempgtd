import { NextRequest, NextResponse } from "next/server"
import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { projects, tasks, templates, templateTasks, type Template } from "@/lib/db/schema"
import { generateId } from "@/lib/id"

/**
 * プロジェクトのタスクツリーをテンプレートとして複製する。
 * POST /api/projects/[id]/to-template
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const projectId = parseInt(id)

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .orderBy(asc(tasks.createdAt))

  const now = Date.now()
  const templateId = generateId()

  const [newTemplate] = await db
    .insert(templates)
    .values({
      id: templateId,
      title: project.title,
      trigger: "manual",
      cron: null,
      targetStatus: "inbox",
      notes: project.outcome ? `outcome: ${project.outcome}` : "",
      createdAt: now,
      updatedAt: now,
    })
    .returning() as Template[]

  // 旧タスクID → 新TemplateTaskID のマップ
  const idMap = new Map<number, number>()

  // 親→子の順序を保つためにソート
  const sorted = sortByParent(projectTasks)

  let order = 0
  for (const task of sorted) {
    const newId = generateId()
    idMap.set(task.id, newId)

    const newParentId = task.parentId != null ? (idMap.get(task.parentId) ?? null) : null

    await db.insert(templateTasks).values({
      id: newId,
      templateId,
      parentId: newParentId,
      title: task.title,
      order: order++,
      context: task.context ?? "",
      tags: task.tags ?? "",
      durationMin: task.durationMin ?? 30,
      energy: task.energy ?? null,
      notes: task.notes ?? "",
      offsetType: "none",
      offsetCron: null,
      offsetRelative: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  return NextResponse.json(newTemplate, { status: 201 })
}

type TaskRow = { id: number; parentId: number | null }

function sortByParent<T extends TaskRow>(tasks: T[]): T[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const result: T[] = []
  const visited = new Set<number>()

  function visit(t: T) {
    if (visited.has(t.id)) return
    if (t.parentId != null) {
      const parent = byId.get(t.parentId)
      if (parent) visit(parent)
    }
    visited.add(t.id)
    result.push(t)
  }

  for (const t of tasks) visit(t)
  return result
}
