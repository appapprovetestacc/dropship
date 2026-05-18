import { test } from "node:test";
import assert from "node:assert/strict";
import { seoErrors, validateSeo, seoHasBlockingError } from "../seo";

test("validateSeo: empty title is a blocking error", () => {
  const issues = validateSeo({ title: "", description: "anything" });
  const titleErr = issues.find((i) => i.field === "title" && i.level === "error");
  assert.ok(titleErr, "title-required error should be present");
});

test("validateSeo: short title is a warning, not an error", () => {
  const issues = validateSeo({ title: "Hi", description: "" });
  const titleIssue = issues.find((i) => i.field === "title");
  assert.equal(titleIssue?.level, "warning");
});

test("validateSeo: og image must be absolute when set", () => {
  const issues = validateSeo({
    title: "A long enough title for tests",
    description: "x".repeat(60),
    ogImage: "not-a-url",
  });
  const og = issues.find((i) => i.field === "ogImage");
  assert.equal(og?.level, "error");
});

test("seoHasBlockingError returns false when only warnings present", () => {
  // Title is short (warning) and description empty (warning), but no errors.
  const blocking = seoHasBlockingError({ title: "Short", description: "" });
  assert.equal(blocking, false);
});

test("seoErrors filters to only level=error issues", () => {
  const issues = validateSeo({ title: "", description: "x".repeat(60), canonical: "javascript:alert(1)" });
  const errors = seoErrors(issues);
  assert.ok(errors.every((e) => e.level === "error"));
  assert.ok(errors.length >= 2, "title empty + canonical-not-absolute should both error");
});
