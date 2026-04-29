import Database from "better-sqlite3"
import { drizzle } from "drizzle-orm/better-sqlite3"
import path from "path"
import { runMigrations } from "./migrate"
import * as schema from "./schema"

const DB_PATH = path.join(process.cwd(), "gtd.db")

let _db: ReturnType<typeof drizzle> | null = null

export function getDb() {
  if (_db) return _db

  const sqlite = new Database(DB_PATH)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")

  runMigrations()

  _db = drizzle(sqlite, { schema })

  // scheduled タスク昇格 & scheduled テンプレート展開（初回接続時のみ）
  import("@/lib/scheduler").then(({ promoteScheduledTasks }) => {
    promoteScheduledTasks()
  })
  import("@/lib/templateExpand").then(({ promoteScheduledTemplates }) => {
    promoteScheduledTemplates()
  })

  return _db
}

// 後方互換: 既存コードが `db` をそのまま使えるよう Proxy で遅延初期化
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getDb() as any)[prop]
  },
})
