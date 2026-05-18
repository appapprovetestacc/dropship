import { test } from "node:test";
import assert from "node:assert/strict";
import { TEMPLATE_LIST, TEMPLATES, cloneTemplateBlocks, getTemplate } from "~/templates";
import { renderBody } from "../render-page";
import { reorderBlocks } from "../blocks";

test("all 6 templates are registered with unique ids and non-empty blocks", () => {
  assert.equal(TEMPLATE_LIST.length, 6, "expected exactly 6 starter templates");
  const ids = new Set(TEMPLATE_LIST.map((t) => t.id));
  assert.equal(ids.size, 6, "template ids must be unique");
  for (const t of TEMPLATE_LIST) {
    assert.ok(t.blocks.length > 0, `template ${t.id} should have starter blocks`);
    assert.equal(TEMPLATES[t.id]?.id, t.id, `TEMPLATES map should include ${t.id}`);
  }
});

test("getTemplate returns null for unknown id", () => {
  assert.equal(getTemplate("does-not-exist"), null);
});

test("cloneTemplateBlocks produces fresh block ids", () => {
  const tpl = getTemplate("landing");
  assert.ok(tpl);
  const a = cloneTemplateBlocks(tpl!);
  const b = cloneTemplateBlocks(tpl!);
  const idsA = new Set(a.map((b) => b.id));
  const idsB = new Set(b.map((b) => b.id));
  // No id should appear in both clones — fresh on every call.
  for (const id of idsA) assert.ok(!idsB.has(id), `block id ${id} leaked across clones`);
});

test("every template serializes to a non-empty body via renderBody", () => {
  for (const t of TEMPLATE_LIST) {
    const html = renderBody(t.blocks);
    assert.ok(html.length > 100, `rendered HTML for ${t.id} is too short`);
    assert.match(html, /<div class="pb-root">/);
  }
});

test("reorderBlocks moves an item without losing or duplicating any", () => {
  const tpl = getTemplate("landing")!;
  const blocks = cloneTemplateBlocks(tpl);
  const before = blocks.map((b) => b.id);
  const reordered = reorderBlocks(blocks, 0, blocks.length - 1);
  const after = reordered.map((b) => b.id);
  assert.equal(after.length, before.length);
  assert.equal(new Set(after).size, before.length, "no duplicates after reorder");
  assert.notEqual(after[0], before[0], "first item should have moved");
});
