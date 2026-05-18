import {
  type LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import {
  buildInstallUrl,
  isValidShop,
  signedState,
  shopifyApi,
} from "~/lib/shopify.server";

// GET /auth?shop=<store>.myshopify.com
// Initiates the Shopify OAuth install flow. Uses an HMAC-signed stateless
// token instead of a SameSite=Lax cookie (which Chromium 120+ blocks on
// cross-site /auth/callback redirects, causing "State mismatch" 401s).
export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (!shop || !isValidShop(shop)) {
    return new Response("Missing or invalid ?shop=<name>.myshopify.com", {
      status: 400,
    });
  }
  const api = shopifyApi(context);
  const state = await signedState({ shop, apiSecret: api.apiSecret });
  const redirectUri = `${api.appUrl.replace(/\/$/, "")}/auth/callback`;
  const installUrl = buildInstallUrl({
    shop,
    apiKey: api.apiKey,
    scopes: api.scopes,
    redirectUri,
    state,
  });
  return new Response(null, { status: 302, headers: { Location: installUrl } });
}

export default function AuthStart() {
  return null;
}
