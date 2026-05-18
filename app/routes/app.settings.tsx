import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Banner,
  BlockStack,
  Card,
  FormLayout,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useEffect, useRef, useState } from "react";
import { authenticate } from "~/lib/shopify.server";
import { getShopSettings, saveShopSettings } from "~/lib/pages-repo.server";
import { TEMPLATE_LIST } from "~/templates";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { shop } = await authenticate.admin(request, context);
  const env = context.cloudflare?.env as never;
  const settings = await getShopSettings(env, shop);
  return json({ settings });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop } = await authenticate.admin(request, context);
  const env = context.cloudflare?.env as never;
  const form = await request.formData();
  const next = await saveShopSettings(env, shop, {
    defaultTemplate: String(form.get("defaultTemplate") ?? "") || null,
    defaultMetaImage: String(form.get("defaultMetaImage") ?? "") || null,
    autosaveInterval: Number(form.get("autosaveInterval") ?? 15) || 15,
  });
  return json({ ok: true, settings: next });
}

export default function SettingsRoute() {
  const { settings } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();

  const [defaultTemplate, setDefaultTemplate] = useState(settings.defaultTemplate ?? "");
  const [defaultMetaImage, setDefaultMetaImage] = useState(settings.defaultMetaImage ?? "");
  const [autosaveInterval, setAutosaveInterval] = useState(String(settings.autosaveInterval));
  const [errors, setErrors] = useState<{ defaultMetaImage?: string; autosaveInterval?: string }>({});
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  const initialRef = useRef({
    defaultTemplate: settings.defaultTemplate ?? "",
    defaultMetaImage: settings.defaultMetaImage ?? "",
    autosaveInterval: String(settings.autosaveInterval),
  });

  const isDirty =
    defaultTemplate !== initialRef.current.defaultTemplate ||
    defaultMetaImage !== initialRef.current.defaultMetaImage ||
    autosaveInterval !== initialRef.current.autosaveInterval;
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shopify = (window as unknown as { shopify?: { saveBar?: { show: (id: string) => void; hide: (id: string) => void } } }).shopify;
    if (!shopify?.saveBar) return;
    if (isDirty) shopify.saveBar.show("settings-save-bar");
    else shopify.saveBar.hide("settings-save-bar");
  }, [isDirty]);

  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const data = fetcher.data as { ok: boolean; error?: string };
    if (data.ok) {
      initialRef.current = { defaultTemplate, defaultMetaImage, autosaveInterval };
      const win = window as unknown as { shopify?: { toast?: { show: (msg: string) => void } } };
      win.shopify?.toast?.show?.("Settings saved");
      setSubmitErr(null);
    } else if (data.error) {
      setSubmitErr(data.error);
    }
  }, [fetcher.state, fetcher.data, defaultTemplate, defaultMetaImage, autosaveInterval]);

  function handleSave() {
    const next: typeof errors = {};
    if (defaultMetaImage && !/^https?:\/\//i.test(defaultMetaImage)) {
      next.defaultMetaImage = "Image URL must start with https://";
    }
    const n = Number(autosaveInterval);
    if (!Number.isFinite(n) || n < 5 || n > 300) {
      next.autosaveInterval = "Pick an interval between 5 and 300 seconds.";
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const fd = new FormData();
    fd.set("defaultTemplate", defaultTemplate);
    fd.set("defaultMetaImage", defaultMetaImage);
    fd.set("autosaveInterval", autosaveInterval);
    fetcher.submit(fd, { method: "post" });
  }

  function handleDiscard() {
    setDefaultTemplate(initialRef.current.defaultTemplate);
    setDefaultMetaImage(initialRef.current.defaultMetaImage);
    setAutosaveInterval(initialRef.current.autosaveInterval);
    setErrors({});
  }

  return (
    <Page title="Settings" backAction={{ content: "Pages", url: "/app" }}>
      <BlockStack gap="400">
        {submitErr ? (
          <Banner tone="critical" onDismiss={() => setSubmitErr(null)} title="Couldn't save settings">
            <p>{submitErr}</p>
          </Banner>
        ) : null}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  Defaults
                </Text>
                <FormLayout>
                  <Select
                    label="Default template for new pages"
                    options={[
                      { label: "Ask each time", value: "" },
                      ...TEMPLATE_LIST.map((t) => ({ label: t.name, value: t.id })),
                    ]}
                    value={defaultTemplate}
                    onChange={setDefaultTemplate}
                  />
                  <TextField
                    label="Default OG image URL"
                    value={defaultMetaImage}
                    onChange={setDefaultMetaImage}
                    autoComplete="off"
                    helpText="Used when a page's SEO card leaves OG image blank. Absolute https:// URL."
                    error={errors.defaultMetaImage}
                  />
                  <TextField
                    label="Autosave interval (seconds)"
                    type="number"
                    value={autosaveInterval}
                    onChange={setAutosaveInterval}
                    autoComplete="off"
                    error={errors.autosaveInterval}
                    helpText="5–300 seconds. Editor saves the current draft every N seconds while you type."
                  />
                </FormLayout>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingSm">
                  Shop info
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Settings are scoped to your shop only. Other staff on the same shop see the same defaults.
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <ui-save-bar id="settings-save-bar">
        <button variant="primary" onClick={handleSave} loading={isSubmitting ? "" : undefined}>
          Save
        </button>
        <button onClick={handleDiscard}>Discard</button>
      </ui-save-bar>
    </Page>
  );
}
