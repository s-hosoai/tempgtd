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
  `)

  // tasks テーブル: Phase 1から既存の場合はカラム追加
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id           INTEGER PRIMARY KEY,
      title        TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'inbox'
                   CHECK(status IN ('inbox','next','delegate','waiting','someday','done','cancelled')),
      parent_id    INTEGER REFERENCES tasks(id),
      project_id   INTEGER REFERENCES projects(id),
      next_order   REAL,
      waiting_for  TEXT,
      notes        TEXT NOT NULL DEFAULT '',
      created_at   INTEGER NOT NULL,
      updated_at   INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_parent_id  ON tasks(parent_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_next_order ON tasks(next_order);
  `)

  // Phase 1 DBからの移行: カラムが不足している場合は追加
  const cols = sqlite.prepare("PRAGMA table_info(tasks)").all() as { name: string }[]
  const colNames = cols.map((c) => c.name)

  if (!colNames.includes("project_id")) {
    sqlite.exec("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)")
    sqlite.exec("CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id)")
  }
  if (!colNames.includes("waiting_for")) {
    sqlite.exec("ALTER TABLE tasks ADD COLUMN waiting_for TEXT")
  }
  // status の CHECK 制約は SQLite では ALTER で変更不可のため、
  // 既存レコードの新ステータス値は INSERT/UPDATE 側で制御する

  sqlite.close()
}
