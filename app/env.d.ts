/// <reference types="vite/client" />

// Vite ?raw imports — yaml/text/etc. resolved at build time as a string.
declare module "*.yaml?raw" {
  const content: string;
  export default content;
}
declare module "*.yml?raw" {
  const content: string;
  export default content;
}

// Polaris CSS via Vite ?url loader.
declare module "*.css?url" {
  const href: string;
  export default href;
}

// Shopify App Bridge web components. Loaded via the CDN script in app.tsx,
// registered globally as custom elements. We treat them as React intrinsic
// elements so JSX can render <ui-save-bar>...</ui-save-bar> + <button
// variant="primary"> without "property does not exist" errors. The
// children are real DOM <button>s rendered into the save-bar slot.
declare namespace JSX {
  interface IntrinsicElements {
    "ui-save-bar": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { id: string; open?: boolean | "" },
      HTMLElement
    >;
    "ui-modal": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & { id: string; open?: boolean | "" },
      HTMLElement
    >;
    button: React.DetailedHTMLProps<
      React.ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: "primary" | "secondary" | "tertiary" | "plain";
        loading?: "" | boolean;
        tone?: "critical" | "success";
      },
      HTMLButtonElement
    >;
  }
}

// App Bridge global. Populated by the cdn.shopify.com/shopifycloud/app-bridge.js
// script tag once it loads. Available client-side only.
interface ShopifyAppBridgeGlobal {
  saveBar?: { show: (id: string) => void; hide: (id: string) => void };
  toast?: { show: (message: string, options?: { isError?: boolean; duration?: number }) => void };
  modal?: { show: (id: string) => void; hide: (id: string) => void };
}
interface Window {
  shopify?: ShopifyAppBridgeGlobal;
}
