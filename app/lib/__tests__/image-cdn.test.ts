import { test } from "node:test";
import assert from "node:assert/strict";
import { buildResizedSet, buildSrcset, resizedImageUrl } from "../image-cdn";

test("resizedImageUrl: Shopify CDN gets _Nx. suffix before extension", () => {
  const url = "https://cdn.shopify.com/s/files/1/0001/foo/abc.jpg";
  assert.equal(
    resizedImageUrl(url, 320),
    "https://cdn.shopify.com/s/files/1/0001/foo/abc_320x.jpg",
  );
  assert.equal(
    resizedImageUrl(url, 640),
    "https://cdn.shopify.com/s/files/1/0001/foo/abc_640x.jpg",
  );
  assert.equal(
    resizedImageUrl(url, 1280),
    "https://cdn.shopify.com/s/files/1/0001/foo/abc_1280x.jpg",
  );
});

test("resizedImageUrl: existing width suffix is stripped before re-applying", () => {
  // Avoids "foo_640x_320x.jpg" double-suffix when re-resizing.
  const url = "https://cdn.shopify.com/s/files/1/0001/foo/abc_640x.jpg";
  assert.equal(
    resizedImageUrl(url, 320),
    "https://cdn.shopify.com/s/files/1/0001/foo/abc_320x.jpg",
  );
});

test("resizedImageUrl: non-Shopify URL routes through /cdn-cgi/image/", () => {
  const url = "https://example.com/images/hero.png";
  assert.equal(
    resizedImageUrl(url, 1280),
    "/cdn-cgi/image/width=1280,quality=85,format=auto/https://example.com/images/hero.png",
  );
});

test("buildResizedSet returns all three widths plus the original", () => {
  const set = buildResizedSet("https://cdn.shopify.com/s/files/1/0001/foo/abc.jpg");
  assert.ok(set.w320.endsWith("abc_320x.jpg"));
  assert.ok(set.w640.endsWith("abc_640x.jpg"));
  assert.ok(set.w1280.endsWith("abc_1280x.jpg"));
  assert.equal(set.original, "https://cdn.shopify.com/s/files/1/0001/foo/abc.jpg");
});

test("buildSrcset emits all three widths comma-separated", () => {
  const s = buildSrcset("https://cdn.shopify.com/s/files/1/0001/foo/abc.jpg");
  assert.ok(s.includes("320w"));
  assert.ok(s.includes("640w"));
  assert.ok(s.includes("1280w"));
});
