-- Mirror of MIGRATION_0000_PAGES in app/lib/db.server.ts. Authoritative
-- copy is the TS const string — this file is kept for journal parity
-- (CLAUDE.md: drizzle/meta/_journal.json must list every file). The
-- Worker runtime applies migrations via app/lib/db.server.ts, not via
-- drizzle-kit (drizzle-kit needs the .sql/.text loader, which the
-- Workers bundler does not configure).
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_domain TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  template_id TEXT NOT NULL,
  blocks TEXT NOT NULL DEFAULT '[]',
  seo TEXT NOT NULL DEFAULT '{}',
  draft_blocks TEXT,
  draft_seo TEXT,
  published_at INTEGER,
  shopify_page_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  UNIQUE (shop_domain, slug)
);
CREATE INDEX IF NOT EXISTS idx_pages_shop ON pages (shop_domain);
CREATE INDEX IF NOT EXISTS idx_pages_published ON pages (shop_domain, published_at);
