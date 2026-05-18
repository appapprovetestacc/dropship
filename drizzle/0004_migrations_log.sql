-- Mirror of MIGRATION_0004_MIGRATIONS_LOG in app/lib/db.server.ts.
CREATE TABLE IF NOT EXISTS _migrations_applied (
  idx INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
