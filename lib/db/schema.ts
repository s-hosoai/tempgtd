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
    enum: ["inbox", "next", "delegate", "waiting", "someday", "done", "cancelled"],
  })
    .notNull()
    .default("inbox"),
  parentId: integer("parent_id").references((): AnySQLiteColumn => tasks.id),
  projectId: integer("project_id").references((): AnySQLiteColumn => projects.id),
  nextOrder: real("next_order"), // status=next のときのソート順
  waitingFor: text("waiting_for"), // 誰/何を待っているか（waiting/delegate時）
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
})

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskStatus = Task["status"]

export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type ProjectStatus = Project["status"]
