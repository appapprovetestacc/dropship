import { test } from "node:test";
import assert from "node:assert/strict";
import { nextAvailableSlug, slugify } from "../slug";

test("slugify: lowercases + replaces non-alphanumerics with hyphens", () => {
  assert.equal(slugify("Hello World!"), "hello-world");
  assert.equal(slugify("  My  Page  "), "my-page");
});

test("slugify: returns 'page' when input has no alphanumerics", () => {
  assert.equal(slugify("!!!"), "page");
  assert.equal(slugify(""), "page");
});

test("nextAvailableSlug returns the base when free", () => {
  assert.equal(nextAvailableSlug("about", ["contact", "faq"]), "about");
});

test("nextAvailableSlug suffixes -2, -3, ... when base is taken", () => {
  assert.equal(nextAvailableSlug("about", ["about"]), "about-2");
  assert.equal(nextAvailableSlug("about", ["about", "about-2"]), "about-3");
  assert.equal(nextAvailableSlug("about", ["about", "about-2", "about-3"]), "about-4");
});

test("nextAvailableSlug handles non-contiguous taken slugs", () => {
  // "about-2" is taken but "about" is free — should still return base.
  assert.equal(nextAvailableSlug("about", ["about-2"]), "about");
});
