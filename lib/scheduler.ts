import { and, eq, lte, lt, max, isNotNull, notInArray } from "drizzle-orm"
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

/**
 * 前日以前のカレンダー配置（todayStart < 今日0時）で未完了のタスクを差し戻す。
 * todayStart を null にして Next Actions に戻す。
 */
export function resetStaleCalendarAssignments() {
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const cutoff = todayMidnight.getTime()

  const stale = db
    .select({ id: tasks.id })
    .from(tasks)
    .where(
      and(
        isNotNull(tasks.todayStart),
        lt(tasks.todayStart, cutoff),
        notInArray(tasks.status, ["done", "cancelled"])
      )
    )
    .all()

  if (stale.length === 0) return

  const now = Date.now()
  for (const { id } of stale) {
    db.update(tasks)
      .set({ todayStart: null, updatedAt: now })
      .where(eq(tasks.id, id))
      .run()
  }
}
