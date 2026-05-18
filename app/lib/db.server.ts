import type { Env } from "../../load-context";

// Inline SQL migrations as TS const strings (CLAUDE.md: never `?raw` imports
// — the Workers bundler has no .sql loader). Each entry MUST appear in
// MIGRATIONS in order; the runner applies them once per shop-db on first call.

export const MIGRATION_0000_PAGES = `
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
`;

export const MIGRATION_0001_PAGE_ASSETS = `
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
`;

export const MIGRATION_0002_PAGE_REVISIONS = `
CREATE TABLE IF NOT EXISTS page_revisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  page_id INTEGER NOT NULL,
  snapshot TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
  FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_page_revisions_page ON page_revisions (page_id, created_at);
`;

export const MIGRATION_0003_SETTINGS = `
CREATE TABLE IF NOT EXISTS shop_settings (
  shop_domain TEXT PRIMARY KEY,
  default_template TEXT,
  default_meta_image TEXT,
  autosave_interval INTEGER NOT NULL DEFAULT 15,
  updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
`;

export const MIGRATION_0004_MIGRATIONS_LOG = `
CREATE TABLE IF NOT EXISTS _migrations_applied (
  idx INTEGER PRIMARY KEY,
  applied_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
);
`;

interface Migration {
  idx: number;
  name: string;
  sql: string;
}

const MIGRATIONS: Migration[] = [
  { idx: 0, name: "pages", sql: MIGRATION_0000_PAGES },
  { idx: 1, name: "page_assets", sql: MIGRATION_0001_PAGE_ASSETS },
  { idx: 2, name: "page_revisions", sql: MIGRATION_0002_PAGE_REVISIONS },
  { idx: 3, name: "shop_settings", sql: MIGRATION_0003_SETTINGS },
  { idx: 4, name: "migrations_log", sql: MIGRATION_0004_MIGRATIONS_LOG },
];

let migrationsPromise: Promise<void> | null = null;

export async function ensureMigrations(db: D1Database): Promise<void> {
  if (migrationsPromise) return migrationsPromise;
  migrationsPromise = (async () => {
    // Bootstrap log table first so we can record what we've applied.
    await db.exec(squashSql(MIGRATION_0004_MIGRATIONS_LOG));
    const existing = await db
      .prepare("SELECT idx FROM _migrations_applied")
      .all<{ idx: number }>();
    const applied = new Set((existing.results ?? []).map((r) => r.idx));
    for (const m of MIGRATIONS) {
      if (applied.has(m.idx)) continue;
      await db.exec(squashSql(m.sql));
      await db
        .prepare("INSERT OR IGNORE INTO _migrations_applied (idx) VALUES (?1)")
        .bind(m.idx)
        .run();
    }
  })();
  try {
    await migrationsPromise;
  } catch (err) {
    migrationsPromise = null;
    throw err;
  }
}

// D1's `exec` rejects multi-statement strings that contain newlines between
// statements — collapse to single-line + `;` separators.
function squashSql(sql: string): string {
  return sql
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ");
}

export function getDb(env: Env): D1Database | null {
  return env.D1 ?? null;
}

export interface PageRow {
  id: number;
  shop_domain: string;
  slug: string;
  title: string;
  template_id: string;
  blocks: string;
  seo: string;
  draft_blocks: string | null;
  draft_seo: string | null;
  published_at: number | null;
  shopify_page_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface ShopSettingsRow {
  shop_domain: string;
  default_template: string | null;
  default_meta_image: string | null;
  autosave_interval: number;
  updated_at: number;
}
