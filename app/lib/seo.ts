// SEO meta-fields validator. Pure — caller decides what to do with the
// returned warnings/errors. Used both at save-time (inline error banners)
// and at publish-time (gate publish on `level: 'error'`).

export interface SeoMeta {
  title: string;
  description: string;
  ogImage: string;
  canonical: string;
}

export interface SeoIssue {
  field: keyof SeoMeta;
  level: "error" | "warning";
  message: string;
}

// Length limits per Google's documented title/description rendering. Going
// over isn't fatal (search engines truncate), so these are warnings not
// errors — except an empty title/description, which break OG previews.
const TITLE_MIN = 10;
const TITLE_MAX = 60;
const DESC_MIN = 50;
const DESC_MAX = 160;

export function validateSeo(meta: Partial<SeoMeta>): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const title = (meta.title ?? "").trim();
  const description = (meta.description ?? "").trim();
  const ogImage = (meta.ogImage ?? "").trim();
  const canonical = (meta.canonical ?? "").trim();

  if (!title) {
    issues.push({ field: "title", level: "error", message: "Title is required." });
  } else if (title.length < TITLE_MIN) {
    issues.push({
      field: "title",
      level: "warning",
      message: `Title is short (${title.length} chars). Aim for ${TITLE_MIN}–${TITLE_MAX}.`,
    });
  } else if (title.length > TITLE_MAX) {
    issues.push({
      field: "title",
      level: "warning",
      message: `Title is long (${title.length} chars). Search engines truncate around ${TITLE_MAX}.`,
    });
  }

  if (!description) {
    issues.push({
      field: "description",
      level: "warning",
      message: "Description helps social-share previews. Add 1–2 sentences.",
    });
  } else if (description.length < DESC_MIN) {
    issues.push({
      field: "description",
      level: "warning",
      message: `Description is short (${description.length} chars). Aim for ${DESC_MIN}–${DESC_MAX}.`,
    });
  } else if (description.length > DESC_MAX) {
    issues.push({
      field: "description",
      level: "warning",
      message: `Description is long (${description.length} chars). Search engines truncate around ${DESC_MAX}.`,
    });
  }

  if (ogImage && !isAbsoluteUrl(ogImage)) {
    issues.push({
      field: "ogImage",
      level: "error",
      message: "OG image must be an absolute URL (https://…).",
    });
  }

  if (canonical && !isAbsoluteUrl(canonical)) {
    issues.push({
      field: "canonical",
      level: "error",
      message: "Canonical URL must be absolute (https://…).",
    });
  }

  return issues;
}

export function seoErrors(issues: SeoIssue[]): SeoIssue[] {
  return issues.filter((i) => i.level === "error");
}

export function seoHasBlockingError(meta: Partial<SeoMeta>): boolean {
  return seoErrors(validateSeo(meta)).length > 0;
}

function isAbsoluteUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function emptySeo(): SeoMeta {
  return { title: "", description: "", ogImage: "", canonical: "" };
}
