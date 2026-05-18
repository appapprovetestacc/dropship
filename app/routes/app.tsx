import { json, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLoaderData, useRouteError, isRouteErrorResponse } from "@remix-run/react";
import { AppProvider } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate, shopifyApi } from "~/lib/shopify.server";

// Parent layout for every embedded-admin route. Wraps the Outlet in
// Polaris AppProvider + injects the App Bridge CDN script with the
// configured API key. Child routes inherit the App Bridge `window.shopify`
// global (toast/saveBar/modal helpers) without needing per-route boilerplate.

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export async function loader({ request, context }: LoaderFunctionArgs) {
  // authenticate.admin throws a Response on auth failure; Remix's
  // ErrorBoundary in root.tsx will handle that — but preview-mode and
  // standard embedded flow both pass through here cleanly.
  const { session, shop } = await authenticate.admin(request, context);
  const api = shopifyApi(context);
  return json({
    apiKey: api.apiKey,
    shop,
    hasD1: Boolean(context.cloudflare?.env && (context.cloudflare.env as { D1?: unknown }).D1),
    sessionScope: session.scope,
  });
}

export default function AppShell() {
  const { apiKey } = useLoaderData<typeof loader>();
  return (
    <>
      {/* App Bridge CDN script — registers <ui-save-bar>, <ui-modal>, etc.
          as web components and attaches window.shopify with toast/saveBar
          helpers. Must load BEFORE any child component tries to call
          window.shopify.toast.show(...). */}
      <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js" data-api-key={apiKey}></script>
      <AppProvider i18n={{}}>
        <Outlet />
      </AppProvider>
    </>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Unknown error in embedded admin.";
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>dropship — error</title>
        <Meta />
        <Links />
      </head>
      <body>
        <main style={{ fontFamily: "system-ui", padding: 32, maxWidth: 720 }}>
          <h1>Couldn't load the page builder.</h1>
          <p>{message}</p>
          <p style={{ color: "#666" }}>
            Reload the page from your Shopify admin. If the issue persists, reinstall the app.
          </p>
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
