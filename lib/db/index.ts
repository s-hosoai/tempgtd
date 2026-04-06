import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import path from "path"
import { runMigrations } from "./migrate"
import * as schema from "./schema"

const DB_PATH = path.join(process.cwd(), "gtd.db")

const sqlite = new Database(DB_PATH)
sqlite.pragma("journal_mode = WAL")
sqlite.pragma("foreign_keys = ON")

runMigrations()

export const db = drizzle(sqlite, { schema })

// アプリ起動時に scheduled タスクを昇格（循環参照を避けるため遅延 import）
import("@/lib/scheduler").then(({ promoteScheduledTasks }) => {
  promoteScheduledTasks()
})
