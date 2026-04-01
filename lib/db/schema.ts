import { sqliteTable, integer, text, real, AnySQLiteColumn } from "drizzle-orm/sqlite-core"

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey(), // UnixTime(ms)
  title: text("title").notNull(),
  status: text("status", {
    enum: ["inbox", "next", "done", "cancelled"],
  })
    .notNull()
    .default("inbox"),
  parentId: integer("parent_id").references((): AnySQLiteColumn => tasks.id),
  nextOrder: real("next_order"), // status=next のときのソート順
  notes: text("notes").notNull().default(""),
  createdAt: integer("created_at").notNull(), // UnixTime(ms)
  updatedAt: integer("updated_at").notNull(), // UnixTime(ms)
})

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskStatus = Task["status"]
