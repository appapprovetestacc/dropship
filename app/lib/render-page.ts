import type { Block } from "./blocks";
import { buildSrcset, resizedImageUrl } from "./image-cdn";

// Server-side renderer. Takes a block list, returns an HTML string suitable
// for the Shopify Page `body_html` field. Two output modes:
//
//   - body(blocks): inline-styled HTML only (no <html>/<head>/<style>).
//     This is what `pageCreate` / `pageUpdate` accept — Shopify wraps it
//     in the theme's `page.liquid` template at render time.
//   - fullDocument(blocks, meta): standalone document used by the preview
//     iframe. Includes <style> + a viewport meta + uses theme CSS vars
//     so it looks plausible against a generic theme.

export interface RenderMeta {
  title: string;
  description?: string;
  ogImage?: string;
  canonical?: string;
}

// Whitelist sanitizer for `body` rich-text — strip everything except a
// short list of inline tags + safe attrs. CLAUDE.md mandate: user-provided
// text MUST be HTML-escaped at RENDER time, not just at storage.
const ALLOWED_INLINE_TAGS = new Set(["b", "strong", "i", "em", "u", "br"]);

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Allow a short whitelist of inline formatting tags (no attrs). Anything
// else is escaped. This is a tight subset on purpose — XSS surface
// minimised, formatting still possible.
export function sanitizeInline(text: string): string {
  // First, fully escape. Then, restore allowed tags by replacing the
  // escaped form with the real tag. Order matters: we never reverse-escape
  // anything that wasn't in the whitelist.
  const escaped = escapeHtml(text);
  let out = escaped;
  for (const tag of ALLOWED_INLINE_TAGS) {
    const openRe = new RegExp(`&lt;${tag}&gt;`, "gi");
    const closeRe = new RegExp(`&lt;/${tag}&gt;`, "gi");
    const selfRe = new RegExp(`&lt;${tag}\\s*/&gt;`, "gi");
    out = out.replace(openRe, `<${tag}>`);
    out = out.replace(closeRe, `</${tag}>`);
    out = out.replace(selfRe, `<${tag} />`);
  }
  // Preserve newlines as <br> for body blocks (textarea inputs).
  out = out.replace(/\r?\n/g, "<br />");
  return out;
}

// URL sanitizer — only allow http(s) + mailto + tel + relative paths. Anything
// else (javascript:, data:, file:) is replaced with `#` so a malicious CTA
// URL can't trigger script execution when the page renders.
export function sanitizeUrl(url: string): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return "#";
}

function attr(value: string): string {
  return escapeHtml(value);
}

function spacerSize(size: "sm" | "md" | "lg"): string {
  return { sm: "16px", md: "32px", lg: "64px" }[size];
}

function renderBlock(block: Block): string {
  switch (block.type) {
    case "heading": {
      const tag = `h${block.level}`;
      const align = block.align ?? "left";
      return `<${tag} class="pb-heading pb-align-${align}">${sanitizeInline(block.text)}</${tag}>`;
    }
    case "body": {
      return `<div class="pb-body">${sanitizeInline(block.text)}</div>`;
    }
    case "image": {
      const src = sanitizeUrl(block.src);
      const srcset = src && src !== "#" ? ` srcset="${attr(buildSrcset(src))}" sizes="(max-width: 600px) 100vw, 50vw"` : "";
      const fallback = src && src !== "#" ? resizedImageUrl(src, 1280) : src;
      const caption = block.caption
        ? `<figcaption class="pb-image__caption">${sanitizeInline(block.caption)}</figcaption>`
        : "";
      return `<figure class="pb-image"><img src="${attr(fallback)}" alt="${attr(block.alt)}" loading="lazy"${srcset} />${caption}</figure>`;
    }
    case "cta": {
      const variant = block.style === "primary" ? "pb-cta--primary" : "pb-cta--secondary";
      const align = block.align ?? "left";
      return `<div class="pb-cta-wrap pb-align-${align}"><a class="pb-cta ${variant}" href="${attr(sanitizeUrl(block.url))}">${sanitizeInline(block.text)}</a></div>`;
    }
    case "spacer": {
      return `<div class="pb-spacer" style="height:${spacerSize(block.size)}"></div>`;
    }
    case "columns": {
      const cells = block.columns
        .map(
          (c) =>
            `<div class="pb-column">${c.icon ? `<div class="pb-column__icon">${sanitizeInline(c.icon)}</div>` : ""}<h3 class="pb-column__heading">${sanitizeInline(c.heading)}</h3><p class="pb-column__body">${sanitizeInline(c.body)}</p></div>`,
        )
        .join("");
      return `<div class="pb-columns" data-cols="${block.columns.length}">${cells}</div>`;
    }
    case "accordion": {
      const items = block.items
        .map(
          (item) =>
            `<details class="pb-accordion__item"${item.category ? ` data-category="${attr(item.category)}"` : ""}><summary>${sanitizeInline(item.question)}</summary><div class="pb-accordion__answer">${sanitizeInline(item.answer)}</div></details>`,
        )
        .join("");
      return `<div class="pb-accordion">${items}</div>`;
    }
    case "form": {
      const fields = block.fields
        .map((f) => {
          const id = `pb-field-${attr(f.name)}`;
          const required = f.required ? " required" : "";
          if (f.type === "textarea") {
            return `<div class="pb-form__field"><label for="${id}">${escapeHtml(f.label)}</label><textarea id="${id}" name="${attr(f.name)}"${required} rows="4"></textarea></div>`;
          }
          return `<div class="pb-form__field"><label for="${id}">${escapeHtml(f.label)}</label><input id="${id}" type="${f.type === "email" ? "email" : "text"}" name="${attr(f.name)}"${required} /></div>`;
        })
        .join("");
      return `<form class="pb-form" data-pb-form="${attr(block.id)}" action="/apps/dropship/contact" method="post"><h3>${sanitizeInline(block.heading)}</h3>${fields}<button class="pb-cta pb-cta--primary" type="submit">${escapeHtml(block.submitLabel)}</button><div role="status" aria-live="polite" class="pb-form__status" data-success-message="${attr(block.successMessage)}"></div></form>`;
    }
    case "countdown": {
      // Server-rendered placeholder; theme-app-embed can hydrate with JS.
      // Static fallback shows the target date so it's never an empty box.
      const targetMs = Date.parse(block.targetIso) || 0;
      const dateText = targetMs ? new Date(targetMs).toUTCString() : "soon";
      return `<div class="pb-countdown" data-target="${attr(block.targetIso)}" data-expired="${attr(block.expiredMessage)}" role="timer"><time datetime="${attr(block.targetIso)}">${escapeHtml(dateText)}</time></div>`;
    }
  }
}

export function renderBlocks(blocks: Block[]): string {
  return blocks.map(renderBlock).join("\n");
}

// Inline CSS — kept short, uses theme CSS variables where possible so the
// rendered page picks up the merchant's theme palette. Hardcoded fallback
// values for places the theme might not define a variable.
const INLINE_CSS = `
.pb-root{font-family:var(--font-body-family,system-ui,sans-serif);color:var(--color-foreground,#1a1a1a);line-height:1.6;max-width:1200px;margin:0 auto;padding:24px 16px}
.pb-root *{box-sizing:border-box}
.pb-align-left{text-align:left}.pb-align-center{text-align:center}.pb-align-right{text-align:right}
.pb-heading{margin:0 0 16px;line-height:1.2}
h1.pb-heading{font-size:clamp(28px,5vw,48px)}
h2.pb-heading{font-size:clamp(22px,3.5vw,32px)}
h3.pb-heading{font-size:clamp(18px,2.5vw,24px)}
.pb-body{margin:0 0 16px;font-size:16px}
.pb-image{margin:0 0 24px}
.pb-image img{max-width:100%;height:auto;display:block;border-radius:8px}
.pb-image__caption{font-size:13px;color:var(--color-foreground,#666);opacity:.7;margin-top:8px;text-align:center}
.pb-cta-wrap{margin:0 0 24px}
.pb-cta{display:inline-block;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;transition:transform .12s ease}
.pb-cta:hover{transform:translateY(-1px)}
.pb-cta--primary{background:var(--color-button,#1a1a1a);color:var(--color-button-text,#fff)}
.pb-cta--secondary{background:transparent;color:var(--color-foreground,#1a1a1a);border:1px solid currentColor}
.pb-spacer{width:100%}
.pb-columns{display:grid;gap:24px;margin:0 0 32px}
.pb-columns[data-cols="2"]{grid-template-columns:repeat(auto-fit,minmax(280px,1fr))}
.pb-columns[data-cols="3"]{grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.pb-columns[data-cols="4"]{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.pb-column__icon{font-size:32px;margin-bottom:8px}
.pb-column__heading{margin:0 0 8px;font-size:18px}
.pb-column__body{margin:0;font-size:15px}
.pb-accordion{border-top:1px solid currentColor;border-color:rgba(0,0,0,.1);margin:0 0 32px}
.pb-accordion__item{border-bottom:1px solid rgba(0,0,0,.1);padding:12px 0}
.pb-accordion__item summary{cursor:pointer;font-weight:600;padding:8px 0;list-style:none}
.pb-accordion__item summary::-webkit-details-marker{display:none}
.pb-accordion__item summary::after{content:"+";float:right}
.pb-accordion__item[open] summary::after{content:"−"}
.pb-accordion__answer{padding:8px 0;font-size:15px}
.pb-form{display:grid;gap:12px;max-width:520px;margin:0 0 32px}
.pb-form__field{display:grid;gap:4px}
.pb-form__field label{font-size:14px;font-weight:500}
.pb-form__field input,.pb-form__field textarea{width:100%;padding:10px 12px;border:1px solid rgba(0,0,0,.15);border-radius:6px;font:inherit}
.pb-form__field input:focus-visible,.pb-form__field textarea:focus-visible{outline:2px solid var(--color-button,#1a1a1a);outline-offset:2px}
.pb-form__status{font-size:14px;min-height:1.5em}
.pb-countdown{font-size:24px;font-weight:700;margin:0 0 32px}
@media (max-width:600px){.pb-root{padding:16px 12px}.pb-columns{gap:16px}}
`;

export function renderBody(blocks: Block[]): string {
  // Shopify Page body_html — wraps in a single root div + a <style> block
  // so theme isolation is best-effort. Theme designers can override via
  // the theme's `page.liquid`.
  return `<style>${INLINE_CSS}</style>\n<div class="pb-root">${renderBlocks(blocks)}</div>`;
}

export function renderFullDocument(blocks: Block[], meta: RenderMeta): string {
  const title = escapeHtml(meta.title);
  const description = meta.description ? `<meta name="description" content="${attr(meta.description)}" />` : "";
  const ogImage = meta.ogImage ? `<meta property="og:image" content="${attr(meta.ogImage)}" />` : "";
  const canonical = meta.canonical ? `<link rel="canonical" href="${attr(meta.canonical)}" />` : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${title}</title>
${description}
${ogImage}
${canonical}
<style>${INLINE_CSS}</style>
</head>
<body>
<div class="pb-root">${renderBlocks(blocks)}</div>
</body>
</html>`;
}

// Draft-vs-published diff. Tells the editor whether the user has unsaved
// or unpublished changes — drives the "Republish" button visibility +
// the dirty-state SaveBar.
export interface DraftDiff {
  hasDraft: boolean;
  changedFields: Array<"blocks" | "seo">;
}

export function computeDraftDiff(
  published: { blocks: Block[]; seo: unknown },
  draft: { blocks: Block[] | null; seo: unknown | null },
): DraftDiff {
  const changed: Array<"blocks" | "seo"> = [];
  if (draft.blocks && JSON.stringify(draft.blocks) !== JSON.stringify(published.blocks)) {
    changed.push("blocks");
  }
  if (draft.seo && JSON.stringify(draft.seo) !== JSON.stringify(published.seo)) {
    changed.push("seo");
  }
  return { hasDraft: changed.length > 0, changedFields: changed };
}
