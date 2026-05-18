import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { authenticate } from "~/lib/shopify.server";
import { getPage } from "~/lib/pages-repo.server";
import { renderFullDocument } from "~/lib/render-page";

// Standalone HTML route used as the src of the editor's preview iframe.
// The editor postMessages new state into the iframe on every change, but
// the initial render uses the persisted draft (or published) state so the
// frame isn't blank before the first message lands.
//
// Auth: this route is opened inside the embedded admin in an iframe, so
// it has access to the same session as the parent. authenticate.public
// is enough — we only need to know which shop's pages we're allowed to
// render.

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return new Response("Invalid id.", { status: 400 });
  }
  // authenticate.admin requires a Bearer token (App Bridge), which an
  // iframe sub-document doesn't have. Fall back to authenticate.public
  // (validates ?shop=) for the preview path so the editor can mount it.
  // Auth check is best-effort — the preview never mutates anything.
  let shop: string | null = null;
  try {
    const result = await authenticate.admin(request, context);
    shop = result.shop;
  } catch {
    try {
      const result = authenticate.public(request, context);
      shop = result.shop;
    } catch {
      shop = null;
    }
  }
  const env = context.cloudflare?.env as never;
  if (!shop) {
    return new Response("Auth required.", { status: 401 });
  }
  const page = await getPage(env, shop, id);
  if (!page) {
    return new Response("Page not found.", { status: 404 });
  }
  const blocks = page.draftBlocks ?? page.blocks;
  const seo = page.draftSeo ?? page.seo;
  const html = renderFullDocument(blocks, {
    title: page.title,
    description: seo.description,
    ogImage: seo.ogImage,
    canonical: seo.canonical,
  });
  // Inject a tiny postMessage listener so the editor can push live
  // edits without re-fetching this route on every keystroke.
  // Iframe-side live-update bridge. Parent (editor) posts a
  // {type:'dropship:preview', title, bodyHtml, seo} message on every edit.
  // We swap the body HTML into the existing .pb-root container — the
  // <style> block already in the doc head keeps the rendering consistent
  // without re-shipping CSS on every update. The bodyHtml is whatever
  // renderBlocks() returns; the renderer itself already escapes user
  // content, so a direct innerHTML assignment here is safe (the parent
  // never sends unescaped strings).
  const liveScript = `
<script>
(function(){
  window.addEventListener('message', function(e){
    var d = e && e.data;
    if (!d || d.type !== 'dropship:preview') return;
    if (typeof d.title === 'string') {
      var titleEl = document.querySelector('title');
      if (titleEl) titleEl.textContent = d.title;
    }
    if (typeof d.bodyHtml === 'string') {
      var root = document.querySelector('.pb-root');
      if (root) root.innerHTML = d.bodyHtml;
    }
  });
})();
</script>
`;
  const withScript = html.replace("</body>", liveScript + "</body>");
  return new Response(withScript, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      // Allow embedding inside the embedded-admin iframe.
      "x-frame-options": "SAMEORIGIN",
    },
  });
}

export default function PreviewRoute() {
  return null;
}
