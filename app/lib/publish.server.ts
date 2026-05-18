import type { OfflineSession } from "./session-storage.server";
import type { Env } from "../../load-context";
import type { Block } from "./blocks";
import type { SeoMeta } from "./seo";
import { renderBody } from "./render-page";
import { shopifyAdmin } from "./shopify-api.server";

// pageCreate / pageUpdate via Admin GraphQL. The Online Store 2.0 Page
// object is the surface; we serialise blocks into `body` (HTML string)
// and write SEO into a `seo` metafield namespace so the storefront's
// theme can read it back if it wants (or render the OG/canonical via
// page.metafields.seo.{title,description,og_image,canonical}).
//
// Note: the Shopify Page object has its own dedicated `title`,
// `handle`, and `body` fields — `seo` is a structured field on Page
// since 2024-04, so we use it where available and additionally write
// metafields so older themes can pick them up.

const PAGE_CREATE_MUTATION = `
mutation pageCreate($page: PageCreateInput!) {
  pageCreate(page: $page) {
    page {
      id
      handle
      title
    }
    userErrors { field message code }
  }
}
`;

const PAGE_UPDATE_MUTATION = `
mutation pageUpdate($id: ID!, $page: PageUpdateInput!) {
  pageUpdate(id: $id, page: $page) {
    page {
      id
      handle
      title
    }
    userErrors { field message code }
  }
}
`;

const METAFIELDS_SET_MUTATION = `
mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields { id key namespace }
    userErrors { field message code }
  }
}
`;

interface PageCreateResponse {
  pageCreate: {
    page: { id: string; handle: string; title: string } | null;
    userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
  };
}

interface PageUpdateResponse {
  pageUpdate: {
    page: { id: string; handle: string; title: string } | null;
    userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
  };
}

interface MetafieldsSetResponse {
  metafieldsSet: {
    metafields: Array<{ id: string; key: string; namespace: string }>;
    userErrors: Array<{ field: string[] | null; message: string; code: string | null }>;
  };
}

export interface PublishResult {
  shopifyPageId: string;
  handle: string;
  title: string;
}

export interface PublishInput {
  title: string;
  slug: string;
  blocks: Block[];
  seo: SeoMeta;
  shopifyPageId: string | null;
}

function formatUserErrors(prefix: string, errs: Array<{ message: string }>): never {
  const msg = errs.map((e) => e.message).join("; ");
  throw new Error(`${prefix}: ${msg}`);
}

export async function publishToShopify(
  env: Env,
  session: OfflineSession,
  shop: string,
  input: PublishInput,
): Promise<PublishResult> {
  const api = shopifyAdmin({ env, session, shop });
  const body = renderBody(input.blocks);

  if (input.shopifyPageId) {
    // Update path. Use the supplied gid.
    const data = await api.graphql<PageUpdateResponse>(PAGE_UPDATE_MUTATION, {
      variables: {
        id: input.shopifyPageId,
        page: {
          title: input.title,
          handle: input.slug,
          body,
          isPublished: true,
        },
      },
    });
    if (data.pageUpdate.userErrors.length) {
      formatUserErrors("pageUpdate failed", data.pageUpdate.userErrors);
    }
    const page = data.pageUpdate.page;
    if (!page) throw new Error("pageUpdate returned no page.");
    await writeSeoMetafields(env, session, shop, page.id, input.seo);
    return { shopifyPageId: page.id, handle: page.handle, title: page.title };
  }

  // Create path.
  const data = await api.graphql<PageCreateResponse>(PAGE_CREATE_MUTATION, {
    variables: {
      page: {
        title: input.title,
        handle: input.slug,
        body,
        isPublished: true,
      },
    },
  });
  if (data.pageCreate.userErrors.length) {
    formatUserErrors("pageCreate failed", data.pageCreate.userErrors);
  }
  const page = data.pageCreate.page;
  if (!page) throw new Error("pageCreate returned no page.");
  await writeSeoMetafields(env, session, shop, page.id, input.seo);
  return { shopifyPageId: page.id, handle: page.handle, title: page.title };
}

async function writeSeoMetafields(
  env: Env,
  session: OfflineSession,
  shop: string,
  pageGid: string,
  seo: SeoMeta,
): Promise<void> {
  const fields = [
    { key: "title", type: "single_line_text_field", value: seo.title },
    { key: "description", type: "multi_line_text_field", value: seo.description },
    { key: "og_image", type: "url", value: seo.ogImage },
    { key: "canonical", type: "url", value: seo.canonical },
  ].filter((f) => f.value && f.value.trim().length > 0);

  if (fields.length === 0) return;

  const api = shopifyAdmin({ env, session, shop });
  const data = await api.graphql<MetafieldsSetResponse>(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: fields.map((f) => ({
        ownerId: pageGid,
        namespace: "seo",
        key: f.key,
        type: f.type,
        value: f.value,
      })),
    },
  });
  if (data.metafieldsSet.userErrors.length) {
    // Non-fatal — the page itself published OK. Surface the metafield
    // errors but don't throw so the caller can still mark the page
    // as published.
    console.warn("seo metafield write had errors:", data.metafieldsSet.userErrors);
  }
}
