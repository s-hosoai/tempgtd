import Database from "better-sqlite3"
import path from "path"

const DB_PATH = path.join(process.cwd(), "gtd.db")

export function runMigrations() {
  const sqlite = new Database(DB_PATH)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id          INTEGER PRIMARY KEY,
      title       TEXT NOT NULL,
      outcome     TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'active'
                  CHECK(status IN ('active','someday','done','cancelled')),
      notes       TEXT NOT NULL DEFAULT '',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

    CREATE TABLE IF NOT EXISTS tasks (
      id            INTEGER PRIMARY KEY,
      title         TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'inbox'
                    CHECK(status IN ('inbox','next','delegate','waiting','scheduled','someday','done','cancelled')),
      parent_id     INTEGER REFERENCES tasks(id),
      project_id    INTEGER REFERENCES projects(id),
      next_order    REAL,
      waiting_for   TEXT,
      scheduled_at  INTEGER,
      today_start   INTEGER,
      duration_min  INTEGER NOT NULL DEFAULT 30,
      context       TEXT NOT NULL DEFAULT '',
      tags          TEXT NOT NULL DEFAULT '',
      energy        TEXT CHECK(energy IN ('low','mid','high')),
      notes         TEXT NOT NULL DEFAULT '',
      created_at    INTEGER NOT NULL,
      updated_at    INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_tasks_status      ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_id   ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id  ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_next_order  ON tasks(next_order);
    CREATE INDEX IF NOT EXISTS idx_tasks_scheduled   ON tasks(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_today_start ON tasks(today_start);
  `)

  // 既存DBへのカラム追加（ALTER TABLE）
  const cols = sqlite.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]
  const colNames = new Set(cols.map((c) => c.name))

  const additions: [string, string][] = [
    ["project_id",   "INTEGER REFERENCES projects(id)"],
    ["waiting_for",  "TEXT"],
    ["scheduled_at", "INTEGER"],
    ["today_start",  "INTEGER"],
    ["duration_min", "INTEGER NOT NULL DEFAULT 30"],
    ["context",      "TEXT NOT NULL DEFAULT ''"],
    ["tags",         "TEXT NOT NULL DEFAULT ''"],
    ["energy",       "TEXT CHECK(energy IN ('low','mid','high'))"],
  ]
  for (const [col, def] of additions) {
    if (!colNames.has(col)) {
      sqlite.exec(`ALTER TABLE tasks ADD COLUMN ${col} ${def}`)
    }
  }

  sqlite.close()
}
