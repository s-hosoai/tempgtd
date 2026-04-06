import { and, eq, lte, max, isNotNull } from "drizzle-orm"
import { db } from "@/lib/db"
import { tasks } from "@/lib/db/schema"

/**
 * scheduled_at が現在時刻以前の scheduled タスクを next に昇格する。
 * lib/db/index.ts から起動時に1回呼ばれる。
 */
export function promoteScheduledTasks() {
  const now = Date.now()

  const due = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "scheduled"),
        isNotNull(tasks.scheduledAt),
        lte(tasks.scheduledAt, now)
      )
    )
    .all()

  if (due.length === 0) return

  const [maxOrder] = db
    .select({ val: max(tasks.nextOrder) })
    .from(tasks)
    .where(eq(tasks.status, "next"))
    .all()

  const baseOrder = maxOrder?.val ?? 0

  for (let i = 0; i < due.length; i++) {
    db.update(tasks)
      .set({ status: "next", nextOrder: baseOrder + i + 1, updatedAt: now })
      .where(eq(tasks.id, due[i].id))
      .run()
  }
}
