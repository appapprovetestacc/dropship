-- Mirror of MIGRATION_0001_PAGE_ASSETS in app/lib/db.server.ts.
CREATE TABLE IF NOT EXISTS page_assets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  image_id TEXT,
  original_url TEXT NOT NULL,
  resized_320 TEXT,
  resized_640 TEXT,
  resized_1280 TEXT,
  alt_text TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_page_assets_page ON page_assets (page_id);
