import { test } from "node:test";
import assert from "node:assert/strict";
import {
  computeDraftDiff,
  escapeHtml,
  renderBlocks,
  renderBody,
  sanitizeInline,
  sanitizeUrl,
} from "../render-page";
import type { Block } from "../blocks";

test("escapeHtml escapes <, >, &, \", '", () => {
  assert.equal(
    escapeHtml("<script>alert('xss')</script>"),
    "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;",
  );
  assert.equal(escapeHtml("A & B"), "A &amp; B");
});

test("sanitizeInline allows <b><i><em><strong><u> but not <script>", () => {
  const out = sanitizeInline("Hello <b>world</b> <script>alert(1)</script>");
  assert.match(out, /<b>world<\/b>/);
  assert.match(out, /&lt;script&gt;/);
});

test("sanitizeUrl strips javascript: and data: URLs", () => {
  assert.equal(sanitizeUrl("javascript:alert(1)"), "#");
  assert.equal(sanitizeUrl("data:text/html,<script>"), "#");
  assert.equal(sanitizeUrl("https://example.com"), "https://example.com");
  assert.equal(sanitizeUrl("/products/foo"), "/products/foo");
  assert.equal(sanitizeUrl("mailto:hi@example.com"), "mailto:hi@example.com");
});

test("renderBlocks: heading produces correct level tag with escaped text", () => {
  const blocks: Block[] = [
    { id: "1", type: "heading", level: 2, text: "Hello <em>world</em>", align: "center" },
  ];
  const html = renderBlocks(blocks);
  assert.match(html, /<h2 class="pb-heading pb-align-center">Hello <em>world<\/em><\/h2>/);
});

test("renderBlocks: CTA with javascript: URL is neutralised to #", () => {
  const blocks: Block[] = [
    { id: "1", type: "cta", text: "Click", url: "javascript:alert(1)", style: "primary" },
  ];
  const html = renderBlocks(blocks);
  assert.match(html, /href="#"/);
  assert.doesNotMatch(html, /javascript:/);
});

test("renderBody wraps the result in pb-root + inline style block", () => {
  const blocks: Block[] = [
    { id: "1", type: "heading", level: 1, text: "Title" },
  ];
  const body = renderBody(blocks);
  assert.match(body, /<style>/);
  assert.match(body, /<div class="pb-root">/);
});

test("computeDraftDiff: identical published+draft yields hasDraft=false", () => {
  const published = { blocks: [{ id: "1", type: "heading", level: 1, text: "X" } as Block], seo: { a: 1 } };
  const draft = { blocks: published.blocks, seo: published.seo };
  const diff = computeDraftDiff(published, draft);
  assert.equal(diff.hasDraft, false);
  assert.equal(diff.changedFields.length, 0);
});

test("computeDraftDiff: changed seo flags `seo` in changedFields", () => {
  const published = { blocks: [], seo: { title: "Old" } };
  const draft = { blocks: [], seo: { title: "New" } };
  const diff = computeDraftDiff(published, draft);
  assert.equal(diff.hasDraft, true);
  assert.deepEqual(diff.changedFields, ["seo"]);
});
