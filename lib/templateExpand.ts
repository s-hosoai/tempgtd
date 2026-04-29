import { eq, asc } from "drizzle-orm"
import { db } from "@/lib/db"
import { templates, templateTasks, tasks } from "@/lib/db/schema"
import { generateId } from "@/lib/id"
import type { TemplateTask } from "@/lib/db/schema"

/**
 * offset_relative 文字列を解釈して scheduledAt (UnixTime ms) を返す。
 * 解釈できない場合は null を返す（即時タスクとして扱う）。
 *
 * 書式例:
 *   "+0d"         → 今日
 *   "+3d"         → 3日後
 *   "+1w"         → 7日後 (start+1w と同じ)
 *   "next_monday" → 次の月曜日
 *   "next_weekday"→ 次の平日
 *   "start+1w"    → 起点日から1週間後（+7d と同じ）
 */
function resolveOffsetRelative(offset: string, baseMs: number): number | null {
  const base = new Date(baseMs)
  base.setHours(9, 0, 0, 0) // デフォルト展開時刻 09:00

  const stripped = offset.trim().replace(/^start/, "")

  // "+Nd" or "+Nw"
  const relMatch = stripped.match(/^\+(\d+)([dw])$/)
  if (relMatch) {
    const n = parseInt(relMatch[1])
    const days = relMatch[2] === "w" ? n * 7 : n
    base.setDate(base.getDate() + days)
    return base.getTime()
  }

  if (offset === "next_monday") {
    const day = base.getDay()
    const diff = day === 0 ? 1 : 8 - day
    base.setDate(base.getDate() + diff)
    return base.getTime()
  }

  if (offset === "next_weekday") {
    do {
      base.setDate(base.getDate() + 1)
    } while (base.getDay() === 0 || base.getDay() === 6)
    return base.getTime()
  }

  return null
}

/**
 * テンプレートを展開してタスクを生成する。
 * triggerAt: 展開起点時刻(ms)。省略時は現在時刻。
 */
export async function expandTemplate(templateId: number, triggerAt?: number): Promise<void> {
  const now = Date.now()
  const baseMs = triggerAt ?? now

  const [tmpl] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, templateId))

  if (!tmpl) throw new Error(`Template ${templateId} not found`)

  const tmplTasks = await db
    .select()
    .from(templateTasks)
    .where(eq(templateTasks.templateId, templateId))
    .orderBy(asc(templateTasks.order))

  // 旧ID → 新タスクID のマップ（親子関係の解決用）
  const idMap = new Map<number, number>()

  // ルートタスク（parent_id=null）から順に処理するため深さ優先でソート
  const sorted = sortByHierarchy(tmplTasks)

  for (const tt of sorted) {
    const newId = generateId()
    idMap.set(tt.id, newId)

    const newParentId = tt.parentId != null ? (idMap.get(tt.parentId) ?? null) : null

    let scheduledAt: number | null = null
    let status: "inbox" | "next" | "scheduled" = tmpl.targetStatus

    if (tt.offsetType === "relative" && tt.offsetRelative) {
      const resolved = resolveOffsetRelative(tt.offsetRelative, baseMs)
      if (resolved && resolved > now) {
        scheduledAt = resolved
        status = "scheduled"
      }
    }
    // offsetType === "cron" は将来拡張用（現時点では none と同じ扱い）

    db.insert(tasks)
      .values({
        id: newId,
        title: tt.title,
        status,
        parentId: newParentId,
        context: tt.context,
        tags: tt.tags,
        durationMin: tt.durationMin,
        energy: tt.energy ?? undefined,
        notes: tt.notes,
        scheduledAt,
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  // last_run_at を更新
  db.update(templates)
    .set({ lastRunAt: now, updatedAt: now })
    .where(eq(templates.id, templateId))
    .run()
}

/** 親が子より先に来るよう階層順にソート */
function sortByHierarchy(tasks: TemplateTask[]): TemplateTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]))
  const result: TemplateTask[] = []
  const visited = new Set<number>()

  function visit(t: TemplateTask) {
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

/**
 * scheduled トリガーのテンプレートで cron が期限を過ぎているものを展開する。
 * DB 初期化時に1回呼ぶ。
 */
export function promoteScheduledTemplates(): void {
  const now = Date.now()

  const scheduled = db
    .select()
    .from(templates)
    .where(eq(templates.trigger, "scheduled"))
    .all()

  for (const tmpl of scheduled) {
    if (!tmpl.cron) continue
    if (!isCronDue(tmpl.cron, tmpl.lastRunAt, now)) continue

    // 非同期で展開（エラーは握りつぶして他のテンプレートに影響させない）
    expandTemplate(tmpl.id, now).catch((e) =>
      console.error(`Template expand failed (id=${tmpl.id}):`, e)
    )
  }
}

/**
 * cron 式が lastRunAt〜now の間にトリガーされるべきか判定する。
 * 簡易実装: 標準的な 5フィールド cron のみ対応。
 * 外部ライブラリなしで実装するため、最終実行からの経過に基づく判定を行う。
 */
function isCronDue(cron: string, lastRunAt: number | null, now: number): boolean {
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return false

  const [minuteExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts
  const check = new Date(now)

  if (!matchCronField(check.getMinutes(), minuteExpr, 0, 59)) return false
  if (!matchCronField(check.getHours(), hourExpr, 0, 23)) return false
  if (!matchCronField(check.getDate(), domExpr, 1, 31)) return false
  if (!matchCronField(check.getMonth() + 1, monthExpr, 1, 12)) return false
  if (!matchCronField(check.getDay(), dowExpr, 0, 6)) return false

  // 同じ分に既に実行済みなら skip
  if (lastRunAt != null) {
    const lastMin = Math.floor(lastRunAt / 60000)
    const nowMin = Math.floor(now / 60000)
    if (lastMin === nowMin) return false
  }

  return true
}

function matchCronField(value: number, expr: string, min: number, max: number): boolean {
  if (expr === "*") return true
  if (expr.includes(",")) return expr.split(",").some((e) => matchCronField(value, e.trim(), min, max))
  if (expr.includes("/")) {
    const [rangeExpr, stepStr] = expr.split("/")
    const step = parseInt(stepStr)
    const start = rangeExpr === "*" ? min : parseInt(rangeExpr)
    return value >= start && (value - start) % step === 0
  }
  if (expr.includes("-")) {
    const [lo, hi] = expr.split("-").map(Number)
    return value >= lo && value <= hi
  }
  return parseInt(expr) === value
}
