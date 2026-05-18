import type { Env } from "../../load-context";
import type { Block } from "./blocks";
import type { SeoMeta } from "./seo";
import { ensureMigrations, getDb, type PageRow, type ShopSettingsRow } from "./db.server";

// CRUD for pages, draft state, revisions, and per-shop settings. Pure
// D1 — no Shopify Admin calls (those happen in publish.server.ts).

export interface Page {
  id: number;
  shopDomain: string;
  slug: string;
  title: string;
  templateId: string;
  blocks: Block[];
  seo: SeoMeta;
  draftBlocks: Block[] | null;
  draftSeo: SeoMeta | null;
  publishedAt: number | null;
  shopifyPageId: string | null;
  createdAt: number;
  updatedAt: number;
}

function rowToPage(row: PageRow): Page {
  return {
    id: row.id,
    shopDomain: row.shop_domain,
    slug: row.slug,
    title: row.title,
    templateId: row.template_id,
    blocks: parseJson<Block[]>(row.blocks, []),
    seo: parseJson<SeoMeta>(row.seo, { title: "", description: "", ogImage: "", canonical: "" }),
    draftBlocks: row.draft_blocks ? parseJson<Block[]>(row.draft_blocks, []) : null,
    draftSeo: row.draft_seo ? parseJson<SeoMeta>(row.draft_seo, { title: "", description: "", ogImage: "", canonical: "" }) : null,
    publishedAt: row.published_at,
    shopifyPageId: row.shopify_page_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function db(env: Env): Promise<D1Database> {
  const d = getDb(env);
  if (!d) throw new Error("D1 binding not configured. Add [[d1_databases]] binding = \"D1\" to wrangler.toml.");
  await ensureMigrations(d);
  return d;
}

export async function listPages(env: Env, shopDomain: string): Promise<Page[]> {
  const d = await db(env);
  const res = await d
    .prepare(
      `SELECT * FROM pages WHERE shop_domain = ?1 ORDER BY updated_at DESC LIMIT 200`,
    )
    .bind(shopDomain)
    .all<PageRow>();
  return (res.results ?? []).map(rowToPage);
}

export async function listSlugs(env: Env, shopDomain: string): Promise<string[]> {
  const d = await db(env);
  const res = await d
    .prepare(`SELECT slug FROM pages WHERE shop_domain = ?1`)
    .bind(shopDomain)
    .all<{ slug: string }>();
  return (res.results ?? []).map((r) => r.slug);
}

export async function getPage(env: Env, shopDomain: string, id: number): Promise<Page | null> {
  const d = await db(env);
  const row = await d
    .prepare(`SELECT * FROM pages WHERE shop_domain = ?1 AND id = ?2`)
    .bind(shopDomain, id)
    .first<PageRow>();
  return row ? rowToPage(row) : null;
}

export interface CreatePageInput {
  shopDomain: string;
  slug: string;
  title: string;
  templateId: string;
  blocks: Block[];
  seo: SeoMeta;
}

export async function createPage(env: Env, input: CreatePageInput): Promise<Page> {
  const d = await db(env);
  const now = Math.floor(Date.now() / 1000);
  const res = await d
    .prepare(
      `INSERT INTO pages (shop_domain, slug, title, template_id, blocks, seo, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)
       RETURNING *`,
    )
    .bind(
      input.shopDomain,
      input.slug,
      input.title,
      input.templateId,
      JSON.stringify(input.blocks),
      JSON.stringify(input.seo),
      now,
    )
    .first<PageRow>();
  if (!res) throw new Error("Failed to insert page.");
  return rowToPage(res);
}

export interface UpdateDraftInput {
  blocks?: Block[];
  seo?: SeoMeta;
  title?: string;
}

export async function updateDraft(
  env: Env,
  shopDomain: string,
  id: number,
  input: UpdateDraftInput,
): Promise<Page> {
  const d = await db(env);
  const now = Math.floor(Date.now() / 1000);
  const sets: string[] = [];
  const binds: unknown[] = [shopDomain, id, now];
  let i = 4;
  if (input.title !== undefined) {
    sets.push(`title = ?${i++}`);
    binds.push(input.title);
  }
  if (input.blocks !== undefined) {
    sets.push(`draft_blocks = ?${i++}`);
    binds.push(JSON.stringify(input.blocks));
  }
  if (input.seo !== undefined) {
    sets.push(`draft_seo = ?${i++}`);
    binds.push(JSON.stringify(input.seo));
  }
  if (sets.length === 0) {
    const existing = await getPage(env, shopDomain, id);
    if (!existing) throw new Error("Page not found.");
    return existing;
  }
  sets.push(`updated_at = ?3`);
  const sql = `UPDATE pages SET ${sets.join(", ")} WHERE shop_domain = ?1 AND id = ?2 RETURNING *`;
  const row = await d
    .prepare(sql)
    .bind(...binds)
    .first<PageRow>();
  if (!row) throw new Error("Page not found.");
  return rowToPage(row);
}

export async function deletePage(env: Env, shopDomain: string, id: number): Promise<void> {
  const d = await db(env);
  await d
    .prepare(`DELETE FROM pages WHERE shop_domain = ?1 AND id = ?2`)
    .bind(shopDomain, id)
    .run();
}

export interface PublishInput {
  blocks: Block[];
  seo: SeoMeta;
  title: string;
  shopifyPageId: string;
}

export async function markPublished(
  env: Env,
  shopDomain: string,
  id: number,
  input: PublishInput,
): Promise<Page> {
  const d = await db(env);
  const now = Math.floor(Date.now() / 1000);
  const row = await d
    .prepare(
      `UPDATE pages SET blocks = ?3, seo = ?4, title = ?5, shopify_page_id = ?6,
              draft_blocks = NULL, draft_seo = NULL, published_at = ?7, updated_at = ?7
       WHERE shop_domain = ?1 AND id = ?2 RETURNING *`,
    )
    .bind(
      shopDomain,
      id,
      JSON.stringify(input.blocks),
      JSON.stringify(input.seo),
      input.title,
      input.shopifyPageId,
      now,
    )
    .first<PageRow>();
  if (!row) throw new Error("Page not found.");
  return rowToPage(row);
}

// Append a revision and trim to the last 10. Used both on publish and
// on explicit "Save snapshot" actions in the editor.
export async function appendRevision(env: Env, pageId: number, snapshot: unknown): Promise<void> {
  const d = await db(env);
  await d
    .prepare(`INSERT INTO page_revisions (page_id, snapshot) VALUES (?1, ?2)`)
    .bind(pageId, JSON.stringify(snapshot))
    .run();
  // Keep last 10. Subquery picks the IDs to delete in a single round-trip.
  await d
    .prepare(
      `DELETE FROM page_revisions
       WHERE page_id = ?1
         AND id NOT IN (
           SELECT id FROM page_revisions
            WHERE page_id = ?1
            ORDER BY created_at DESC
            LIMIT 10
         )`,
    )
    .bind(pageId)
    .run();
}

export interface Revision {
  id: number;
  pageId: number;
  snapshot: unknown;
  createdAt: number;
}

export async function listRevisions(env: Env, pageId: number): Promise<Revision[]> {
  const d = await db(env);
  const res = await d
    .prepare(
      `SELECT id, page_id, snapshot, created_at FROM page_revisions
        WHERE page_id = ?1 ORDER BY created_at DESC LIMIT 10`,
    )
    .bind(pageId)
    .all<{ id: number; page_id: number; snapshot: string; created_at: number }>();
  return (res.results ?? []).map((r) => ({
    id: r.id,
    pageId: r.page_id,
    snapshot: parseJson(r.snapshot, null),
    createdAt: r.created_at,
  }));
}

export interface ShopSettings {
  shopDomain: string;
  defaultTemplate: string | null;
  defaultMetaImage: string | null;
  autosaveInterval: number;
  updatedAt: number;
}

function rowToSettings(row: ShopSettingsRow): ShopSettings {
  return {
    shopDomain: row.shop_domain,
    defaultTemplate: row.default_template,
    defaultMetaImage: row.default_meta_image,
    autosaveInterval: row.autosave_interval,
    updatedAt: row.updated_at,
  };
}

export async function getShopSettings(env: Env, shopDomain: string): Promise<ShopSettings> {
  const d = await db(env);
  const row = await d
    .prepare(`SELECT * FROM shop_settings WHERE shop_domain = ?1`)
    .bind(shopDomain)
    .first<ShopSettingsRow>();
  if (row) return rowToSettings(row);
  return { shopDomain, defaultTemplate: null, defaultMetaImage: null, autosaveInterval: 15, updatedAt: 0 };
}

export async function saveShopSettings(
  env: Env,
  shopDomain: string,
  input: Partial<Omit<ShopSettings, "shopDomain" | "updatedAt">>,
): Promise<ShopSettings> {
  const d = await db(env);
  const current = await getShopSettings(env, shopDomain);
  const next: ShopSettings = {
    ...current,
    defaultTemplate: input.defaultTemplate ?? current.defaultTemplate,
    defaultMetaImage: input.defaultMetaImage ?? current.defaultMetaImage,
    autosaveInterval: input.autosaveInterval ?? current.autosaveInterval,
    updatedAt: Math.floor(Date.now() / 1000),
  };
  await d
    .prepare(
      `INSERT INTO shop_settings (shop_domain, default_template, default_meta_image, autosave_interval, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5)
       ON CONFLICT (shop_domain) DO UPDATE SET
         default_template = excluded.default_template,
         default_meta_image = excluded.default_meta_image,
         autosave_interval = excluded.autosave_interval,
         updated_at = excluded.updated_at`,
    )
    .bind(shopDomain, next.defaultTemplate, next.defaultMetaImage, next.autosaveInterval, next.updatedAt)
    .run();
  return next;
}

export interface PageMetrics {
  total: number;
  published: number;
  drafts: number;
}

export async function getPageMetrics(env: Env, shopDomain: string): Promise<PageMetrics> {
  const d = await db(env);
  const row = await d
    .prepare(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(CASE WHEN published_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS published,
         COALESCE(SUM(CASE WHEN published_at IS NULL OR draft_blocks IS NOT NULL THEN 1 ELSE 0 END), 0) AS drafts
       FROM pages WHERE shop_domain = ?1`,
    )
    .bind(shopDomain)
    .first<{ total: number; published: number; drafts: number }>();
  return {
    total: row?.total ?? 0,
    published: row?.published ?? 0,
    drafts: row?.drafts ?? 0,
  };
}
