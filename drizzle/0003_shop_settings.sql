-- Mirror of MIGRATION_0003_SETTINGS in app/lib/db.server.ts.
CREATE TABLE IF NOT EXISTS shop_settings (
  shop_domain TEXT PRIMARY KEY,
  default_template TEXT,
  default_meta_image TEXT,
  autosave_interval INTEGER NOT NULL DEFAULT 15,
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
