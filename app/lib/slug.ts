// Slug helpers — pure, used by editor + uniqueness check.

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "page";
}

// Picks the next available slug given a list of existing slugs. If `base`
// is free returns it as-is; otherwise appends `-2`, `-3`, … until free.
// Used by the page-create action to keep (shop_domain, slug) unique without
// a DB round-trip per attempt (caller fetches all candidates once).
export function nextAvailableSlug(base: string, existing: Iterable<string>): string {
  const taken = new Set(existing);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) {
    n += 1;
    if (n > 9999) return `${base}-${Date.now().toString(36)}`;
  }
  return `${base}-${n}`;
}
