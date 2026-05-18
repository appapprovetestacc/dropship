// Image-resize URL builder. Two transforms supported:
//
//   1. Shopify CDN (cdn.shopify.com / *.shopifycdn.com). Append the
//      `_320x.`, `_640x.`, `_1280x.` width suffix before the extension.
//      Shopify resizes lazily on first request and edge-caches the result.
//
//   2. Cloudflare Image Resizing (any other URL). Routed through
//      `/cdn-cgi/image/width=<w>,quality=85,format=auto/<original>`.
//      Falls through gracefully — if CF Image Resizing isn't enabled
//      on the zone the resized URL just 404s and the renderer can fall
//      back to the original.

export const RESIZE_WIDTHS = [320, 640, 1280] as const;
export type ResizeWidth = (typeof RESIZE_WIDTHS)[number];

const SHOPIFY_CDN_HOSTS = ["cdn.shopify.com", "cdn.shopifycdn.net"];

function isShopifyCdn(url: string): boolean {
  try {
    const u = new URL(url);
    return SHOPIFY_CDN_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h));
  } catch {
    return false;
  }
}

function shopifyResize(url: string, width: ResizeWidth): string {
  // Strip any existing width suffix so re-uploading doesn't double-suffix.
  // Pattern: /…/foo_640x.jpg → /…/foo.jpg
  const cleaned = url.replace(/(_\d+x(\d+)?)(\.[a-zA-Z]+)(\?|$)/, "$3$4");
  return cleaned.replace(/(\.[a-zA-Z]+)(\?|$)/, `_${width}x$1$2`);
}

function cloudflareResize(url: string, width: ResizeWidth): string {
  // Same-origin resize path. We don't know the merchant's Worker hostname
  // at URL-build time, so emit a relative path; the browser resolves
  // against the current document origin (which is the embedded admin
  // when used in the editor preview, or the storefront when used in
  // published HTML — Shopify proxies the asset).
  const opts = `width=${width},quality=85,format=auto`;
  const absolute = url.startsWith("http") ? url : url;
  return `/cdn-cgi/image/${opts}/${absolute}`;
}

export function resizedImageUrl(url: string, width: ResizeWidth): string {
  if (!url) return url;
  return isShopifyCdn(url) ? shopifyResize(url, width) : cloudflareResize(url, width);
}

export interface ResizedSet {
  original: string;
  w320: string;
  w640: string;
  w1280: string;
}

export function buildResizedSet(url: string): ResizedSet {
  return {
    original: url,
    w320: resizedImageUrl(url, 320),
    w640: resizedImageUrl(url, 640),
    w1280: resizedImageUrl(url, 1280),
  };
}

// `srcset` string for responsive <img>. Use with sizes="(max-width: 600px)
// 100vw, 50vw" for a mobile-first responsive image.
export function buildSrcset(url: string): string {
  return RESIZE_WIDTHS.map((w) => `${resizedImageUrl(url, w)} ${w}w`).join(", ");
}
