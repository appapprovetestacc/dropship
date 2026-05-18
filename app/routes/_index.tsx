import { redirect, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => [
  { title: "dropship" },
  {
    name: "description",
    content:
      "dropship is a Shopify App that runs inside your store's admin. Install via Shopify admin → Apps to enable it on your storefront.",
  },
];

// F-NEW-V — Shopify install entry. When a merchant clicks "Add app"
// in the App Store, Shopify hits the root URL with ?shop=<store> and
// ?hmac=<sig>. We must redirect to OAuth IMMEDIATELY — rendering HTML
// first triggers "app must request install immediately when Add app
// is clicked" reviewer rejection (shopify-check install-flow).
// Visits without ?shop= still see the marketing index.
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  if (shop) {
    return redirect(`/auth?shop=${encodeURIComponent(shop)}`);
  }
  return null;
}

export default function Index() {
  return (
    <main style={{ fontFamily: "system-ui", padding: "2rem", maxWidth: 720, lineHeight: 1.55 }}>
      <h1 style={{ marginTop: 0 }}>dropship</h1>
      <p>
        dropship is a Shopify App. It runs inside your store's admin and
        configures storefront features for your shoppers.
      </p>
      <h2 style={{ marginTop: "2rem", fontSize: "1.15rem" }}>Install</h2>
      <p style={{ marginTop: "0.25rem" }}>
        Open your Shopify admin → <strong>Apps</strong> → search for{" "}
        <strong>dropship</strong>, or use the Add-app link your store
        owner shared with you. After install you'll see dropship in the
        Apps menu of your Shopify admin.
      </p>
      <h2 style={{ marginTop: "2rem", fontSize: "1.15rem" }}>Storefront surface</h2>
      <p style={{ marginTop: "0.25rem" }}>
        Once installed, dropship's storefront features render at{" "}
        <code>https://&lt;your-store&gt;.myshopify.com/apps/dropship</code>{" "}
        and as theme app embeds you can enable from the Shopify theme editor.
      </p>
      <h2 style={{ marginTop: "2rem", fontSize: "1.15rem" }}>Support</h2>
      <p style={{ marginTop: "0.25rem" }}>
        Reach out via your store's app listing or the email in your install
        confirmation. We respond within one business day.
      </p>
    </main>
  );
}
