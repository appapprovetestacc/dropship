import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, Link, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Card,
  EmptyState,
  IndexTable,
  InlineGrid,
  Layout,
  Page,
  SkeletonBodyText,
  SkeletonDisplayText,
  SkeletonPage,
  Tabs,
  Text,
  useIndexResourceState,
} from "@shopify/polaris";
import { useEffect, useMemo, useState } from "react";
import { authenticate } from "~/lib/shopify.server";
import { deletePage, getPageMetrics, listPages, type Page as PageEntity } from "~/lib/pages-repo.server";

interface PageRowSummary {
  id: string;
  title: string;
  slug: string;
  status: "published" | "draft" | "scheduled";
  templateId: string;
  updatedAt: number;
  shopifyPageId: string | null;
}

function pageStatus(p: PageEntity): "published" | "draft" {
  if (p.publishedAt) return "published";
  return "draft";
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { shop } = await authenticate.admin(request, context);
  const env = (context.cloudflare?.env ?? {}) as { D1?: unknown };
  if (!env.D1) {
    return json({
      pages: [] as PageRowSummary[],
      metrics: { total: 0, published: 0, drafts: 0 },
      shop,
      d1Missing: true,
    });
  }
  const realEnv = context.cloudflare?.env as never;
  const [pages, metrics] = await Promise.all([
    listPages(realEnv, shop),
    getPageMetrics(realEnv, shop),
  ]);
  const summary: PageRowSummary[] = pages.map((p) => ({
    id: String(p.id),
    title: p.title,
    slug: p.slug,
    status: pageStatus(p),
    templateId: p.templateId,
    updatedAt: p.updatedAt,
    shopifyPageId: p.shopifyPageId,
  }));
  return json({ pages: summary, metrics, shop, d1Missing: false });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop } = await authenticate.admin(request, context);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const env = context.cloudflare?.env as never;
  if (intent === "delete") {
    const id = Number(form.get("id"));
    if (Number.isFinite(id)) await deletePage(env, shop, id);
    return redirect("/app");
  }
  return json({ ok: false, error: `Unknown intent: ${intent}` }, { status: 400 });
}

const STATUS_LABEL: Record<string, { label: string; tone: "success" | "attention" | "info" }> = {
  published: { label: "Published", tone: "success" },
  draft: { label: "Draft", tone: "attention" },
  scheduled: { label: "Scheduled", tone: "info" },
};

const TABS = [
  { id: "all", content: "All", panelID: "all" },
  { id: "published", content: "Published", panelID: "published" },
  { id: "draft", content: "Draft", panelID: "draft" },
  { id: "scheduled", content: "Scheduled", panelID: "scheduled" },
];

const ONBOARDING_KEY = "dropship-onboarding-dismissed";

function OnboardingBanner({ hasPages }: { hasPages: boolean }) {
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    setDismissed(localStorage.getItem(ONBOARDING_KEY) === "1");
  }, []);
  if (dismissed) return null;
  return (
    <Banner
      title="Finish setting up dropship"
      tone="info"
      onDismiss={() => {
        localStorage.setItem(ONBOARDING_KEY, "1");
        setDismissed(true);
      }}
    >
      <BlockStack gap="200">
        <Text as="p">A few steps to publish your first page.</Text>
        <Box>
          <Text as="p">
            <input type="checkbox" checked readOnly aria-label="Connect your shop" /> Connect your shop
          </Text>
          <Text as="p">
            <input type="checkbox" checked={hasPages} readOnly aria-label="Pick a template" /> Pick a template and create a page
          </Text>
          <Text as="p">
            <input type="checkbox" checked={false} readOnly aria-label="Publish to Shopify" /> Publish to your storefront
          </Text>
        </Box>
      </BlockStack>
    </Banner>
  );
}

function MetricCardsRow({ total, published, drafts }: { total: number; published: number; drafts: number }) {
  const tiles = [
    { label: "Total pages", value: total },
    { label: "Published", value: published },
    { label: "Drafts", value: drafts },
  ];
  return (
    <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
      {tiles.map((t) => (
        <Card key={t.label}>
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" tone="subdued">
              {t.label}
            </Text>
            <Text as="p" variant="heading2xl" fontWeight="bold">
              {t.value}
            </Text>
          </BlockStack>
        </Card>
      ))}
    </InlineGrid>
  );
}

export default function PagesIndex() {
  const { pages, metrics, d1Missing } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const submit = useSubmit();
  // Skeleton only when REVALIDATING this same route. nav.state === "loading"
  // also fires during outbound transitions to other routes — we don't want
  // the index to flash a skeleton on its way out.
  const isReloadingSelf =
    nav.state === "loading" && nav.location?.pathname === "/app";

  const [selectedTab, setSelectedTab] = useState(0);
  const filtered = useMemo(() => {
    const tabId = TABS[selectedTab]?.id ?? "all";
    if (tabId === "all") return pages;
    return pages.filter((p) => p.status === tabId);
  }, [pages, selectedTab]);

  const resourceName = { singular: "page", plural: "pages" };
  const resourceItems = useMemo(() => filtered.map((p) => ({ id: p.id })), [filtered]);
  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(resourceItems);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  if (isReloadingSelf) return <PagesIndexSkeleton />;

  return (
    <Page
      title="Pages"
      primaryAction={{ content: "New page", url: "/app/templates" }}
      secondaryActions={[{ content: "Settings", url: "/app/settings" }]}
    >
      <BlockStack gap="400">
        <OnboardingBanner hasPages={pages.length > 0} />
        {d1Missing ? (
          <Banner tone="warning" title="Database not yet provisioned">
            <p>
              The page builder database (D1) will be created on the next deploy. Pages
              you create now will not persist until the binding is live.
            </p>
          </Banner>
        ) : null}
        <MetricCardsRow {...metrics} />
        <Card>
          <Tabs tabs={TABS} selected={selectedTab} onSelect={setSelectedTab} />
          {filtered.length === 0 ? (
            <Box padding="400">
              <EmptyState
                heading="Create your first landing page"
                action={{ content: "Pick a template", url: "/app/templates" }}
                secondaryAction={{
                  content: "Watch tutorial",
                  url: "https://dropship.appapprove.app/docs/getting-started",
                  external: true,
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>
                  Start from one of six pre-built templates — Landing, About, Contact,
                  Product Spotlight, FAQ, or Coming Soon — and publish to a real
                  Shopify page in minutes.
                </p>
              </EmptyState>
            </Box>
          ) : (
            <IndexTable
              resourceName={resourceName}
              itemCount={filtered.length}
              selectedItemsCount={allResourcesSelected ? "All" : selectedResources.length}
              onSelectionChange={handleSelectionChange}
              selectable
              sortable={[true, true, true, true, false]}
              headings={[
                { title: "Title" },
                { title: "URL slug" },
                { title: "Status" },
                { title: "Updated" },
                { title: "" },
              ]}
              promotedBulkActions={[
                {
                  content: "Delete pages",
                  onAction: () => {
                    for (const id of selectedResources) {
                      const fd = new FormData();
                      fd.set("intent", "delete");
                      fd.set("id", String(id));
                      submit(fd, { method: "post" });
                    }
                  },
                },
              ]}
            >
              {filtered.map((row, index) => (
                <IndexTable.Row
                  id={row.id}
                  key={row.id}
                  position={index}
                  selected={selectedResources.includes(row.id)}
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.location.assign(`/app/pages/${row.id}`);
                    }
                  }}
                >
                  <IndexTable.Cell>
                    <Text as="span" fontWeight="medium">
                      {row.title}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">/pages/{row.slug}</Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge tone={STATUS_LABEL[row.status]?.tone ?? "info"}>
                      {STATUS_LABEL[row.status]?.label ?? row.status}
                    </Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text as="span" tone="subdued">
                      {dateFmt.format(new Date(row.updatedAt * 1000))}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Link to={`/app/pages/${row.id}`} prefetch="intent">
                      Edit
                    </Link>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          )}
        </Card>
      </BlockStack>
      {/* Hidden form so bulk-action onAction can submit. The IndexTable
          bulk-action uses useSubmit directly so this Form is unused —
          kept here as a fallback if JS is disabled. */}
      <Form method="post" hidden>
        <input type="hidden" name="intent" />
        <input type="hidden" name="id" />
      </Form>
    </Page>
  );
}

function PagesIndexSkeleton() {
  return (
    <SkeletonPage primaryAction title="Pages">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={{ xs: 1, sm: 3 }} gap="400">
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="200">
                <SkeletonBodyText lines={1} />
              </Box>
            </Card>
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="200">
                <SkeletonBodyText lines={1} />
              </Box>
            </Card>
            <Card>
              <SkeletonDisplayText size="small" />
              <Box paddingBlockStart="200">
                <SkeletonBodyText lines={1} />
              </Box>
            </Card>
          </InlineGrid>
          <Box paddingBlockStart="400">
            <Card>
              <SkeletonBodyText lines={8} />
            </Card>
          </Box>
        </Layout.Section>
      </Layout>
    </SkeletonPage>
  );
}
