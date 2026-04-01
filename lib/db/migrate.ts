import Database from "better-sqlite3"
import path from "path"

const DB_PATH = path.join(process.cwd(), "gtd.db")

export function runMigrations() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id          INTEGER PRIMARY KEY,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'inbox'
                  CHECK(status IN ('inbox','next','done','cancelled')),
      parent_id   INTEGER REFERENCES tasks(id),
      next_order  REAL,
      notes       TEXT NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_next_order ON tasks(next_order);
  `)

  sqlite.close()
}
