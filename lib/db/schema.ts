import { sqliteTable, integer, text, real, AnySQLiteColumn } from "drizzle-orm/sqlite-core"

export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey(), // UnixTime(ms)
  title: text("title").notNull(),
  outcome: text("outcome").notNull().default(""),
  status: text("status", {
    enum: ["active", "someday", "done", "cancelled"],
  })
    .notNull()
    .default("active"),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey(), // UnixTime(ms)
  title: text("title").notNull(),
  status: text("status", {
    enum: ["inbox", "next", "delegate", "waiting", "scheduled", "someday", "done", "cancelled"],
  })
    .notNull()
    .default("inbox"),
  parentId: integer("parent_id").references((): AnySQLiteColumn => tasks.id),
  projectId: integer("project_id").references((): AnySQLiteColumn => projects.id),
  nextOrder: real("next_order"),       // status=next のときのソート順
  waitingFor: text("waiting_for"),     // 誰/何を待っているか
  scheduledAt: integer("scheduled_at"), // status=scheduled: この時刻にnextへ昇格(UnixTime ms)
  deferredUntil: integer("deferred_until"), // この時刻までinboxに表示しない(UnixTime ms)
  todayStart: integer("today_start"),  // 今日のスケジュール開始時刻(UnixTime ms)
  durationMin: integer("duration_min").notNull().default(30), // 見積もり時間（30分単位）
  context: text("context").notNull().default(""),  // JSON配列文字列 例: '["@pc","@home"]'
  tags: text("tags").notNull().default(""),        // JSON配列文字列 例: '["重要","仕事"]'
  energy: text("energy", {
    enum: ["low", "mid", "high"],
  }),
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskStatus = Task["status"]
export type TaskEnergy = NonNullable<Task["energy"]>

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectStatus = Project["status"]

export const templates = sqliteTable("templates", {
  id: integer("id").primaryKey(), // UnixTime(ms)
  title: text("title").notNull(),
  trigger: text("trigger", { enum: ["manual", "scheduled"] }).notNull().default("manual"),
  cron: text("cron"),                   // scheduled 時の cron 式
  targetStatus: text("target_status", { enum: ["inbox", "next"] }).notNull().default("inbox"),
  lastRunAt: integer("last_run_at"),    // 最後に展開した時刻(UnixTime ms)
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export const templateTasks = sqliteTable("template_tasks", {
  id: integer("id").primaryKey(), // UnixTime(ms)
  templateId: integer("template_id").notNull().references(() => templates.id),
  parentId: integer("parent_id").references((): AnySQLiteColumn => templateTasks.id),
  title: text("title").notNull(),
  order: integer("order").notNull().default(0),   // 兄弟間の順序
  context: text("context").notNull().default(""), // JSON配列文字列
  tags: text("tags").notNull().default(""),       // JSON配列文字列
  durationMin: integer("duration_min").notNull().default(30),
  energy: text("energy", { enum: ["low", "mid", "high"] }),
  notes: text("notes").notNull().default(""),
  offsetType: text("offset_type", { enum: ["none", "cron", "relative"] }).notNull().default("none"),
  offsetCron: text("offset_cron"),
  offsetRelative: text("offset_relative"), // e.g. "+0d", "+3d", "next_monday", "start+1w"
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert
export type TemplateTask = typeof templateTasks.$inferSelect
export type NewTemplateTask = typeof templateTasks.$inferInsert
