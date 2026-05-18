import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useFetcher, useLoaderData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Badge,
  Banner,
  BlockStack,
  Box,
  Button,
  ButtonGroup,
  Card,
  Collapsible,
  Divider,
  FormLayout,
  InlineError,
  InlineStack,
  Layout,
  Modal,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authenticate } from "~/lib/shopify.server";
import {
  appendRevision,
  getPage,
  markPublished,
  type Page as PageEntity,
  updateDraft,
} from "~/lib/pages-repo.server";
import { type Block, reorderBlocks } from "~/lib/blocks";
import { computeDraftDiff, renderBlocks } from "~/lib/render-page";
import { emptySeo, seoErrors, validateSeo, type SeoMeta } from "~/lib/seo";
import { SECTION_LIBRARY, cloneSectionBlocks, getSection } from "~/templates/sections";
import { publishToShopify } from "~/lib/publish.server";
import { listSlugs } from "~/lib/pages-repo.server";
import { nextAvailableSlug, slugify } from "~/lib/slug";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const { shop } = await authenticate.admin(request, context);
  const id = Number(params.id);
  if (!Number.isFinite(id)) throw new Response("Invalid page id.", { status: 400 });
  const env = context.cloudflare?.env as never;
  const page = await getPage(env, shop, id);
  if (!page) throw new Response("Page not found.", { status: 404 });
  return json({
    page: serializePage(page),
    sections: SECTION_LIBRARY.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
    })),
  });
}

function serializePage(p: PageEntity) {
  // Effective view = draft merged over published. The editor edits the
  // draft; the preview shows the draft if it exists.
  return {
    id: p.id,
    shopDomain: p.shopDomain,
    slug: p.slug,
    title: p.title,
    templateId: p.templateId,
    blocks: p.blocks,
    seo: p.seo,
    draftBlocks: p.draftBlocks,
    draftSeo: p.draftSeo,
    publishedAt: p.publishedAt,
    shopifyPageId: p.shopifyPageId,
    updatedAt: p.updatedAt,
  };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
  const { session, shop } = await authenticate.admin(request, context);
  const id = Number(params.id);
  if (!Number.isFinite(id)) return json({ ok: false, error: "Invalid id." }, { status: 400 });
  const env = context.cloudflare?.env as never;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "save") {
    const blocks = JSON.parse(String(form.get("blocks") ?? "[]")) as Block[];
    const seo = JSON.parse(String(form.get("seo") ?? "{}")) as SeoMeta;
    const title = String(form.get("title") ?? "").trim() || "Untitled page";
    const updated = await updateDraft(env, shop, id, { blocks, seo, title });
    return json({ ok: true, page: serializePage(updated) });
  }

  if (intent === "publish") {
    const blocks = JSON.parse(String(form.get("blocks") ?? "[]")) as Block[];
    const seo = JSON.parse(String(form.get("seo") ?? "{}")) as SeoMeta;
    const title = String(form.get("title") ?? "").trim() || "Untitled page";
    const blockingErrors = seoErrors(validateSeo(seo));
    if (blockingErrors.length > 0) {
      return json(
        { ok: false, error: "Fix SEO errors before publishing: " + blockingErrors.map((e) => e.message).join("; ") },
        { status: 400 },
      );
    }
    const existing = await getPage(env, shop, id);
    if (!existing) return json({ ok: false, error: "Page not found." }, { status: 404 });
    // Snapshot the current published state so revisions hold the previous version.
    if (existing.publishedAt) {
      await appendRevision(env, id, { blocks: existing.blocks, seo: existing.seo, title: existing.title });
    }
    // Normalise slug + ensure global uniqueness (suffix with -2/-3/... if needed).
    const slugs = (await listSlugs(env, shop)).filter((s) => s !== existing.slug);
    const slug = nextAvailableSlug(slugify(existing.slug || title), slugs);
    const publishResult = await publishToShopify(env, session, shop, {
      title,
      slug,
      blocks,
      seo,
      shopifyPageId: existing.shopifyPageId,
    });
    const updated = await markPublished(env, shop, id, {
      blocks,
      seo,
      title,
      shopifyPageId: publishResult.shopifyPageId,
    });
    return json({ ok: true, page: serializePage(updated), publishResult });
  }

  if (intent === "delete") {
    return redirect("/app");
  }

  return json({ ok: false, error: `Unknown intent: ${intent}` }, { status: 400 });
}

// Client-side block snapshot type — kept loose so we can edit any block
// shape via JSON-stringify roundtrip without re-validating per change.

export default function PageEditor() {
  const { page, sections } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const submit = useSubmit();
  const nav = useNavigation();

  const initial = useMemo(() => {
    return {
      title: page.title,
      blocks: (page.draftBlocks ?? page.blocks) as Block[],
      seo: (page.draftSeo ?? page.seo ?? emptySeo()) as SeoMeta,
    };
  }, [page]);

  const [title, setTitle] = useState(initial.title);
  const [blocks, setBlocks] = useState<Block[]>(initial.blocks);
  const [seo, setSeo] = useState<SeoMeta>(initial.seo);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [seoOpen, setSeoOpen] = useState(false);
  const [sectionPickerOpen, setSectionPickerOpen] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [bannerSuccess, setBannerSuccess] = useState<string | null>(null);

  const initialRef = useRef(initial);
  const isDirty =
    title !== initialRef.current.title ||
    JSON.stringify(blocks) !== JSON.stringify(initialRef.current.blocks) ||
    JSON.stringify(seo) !== JSON.stringify(initialRef.current.seo);

  const isSubmitting = fetcher.state !== "idle";

  // Sync App Bridge SaveBar with dirty state.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const shopify = (window as unknown as { shopify?: { saveBar?: { show: (id: string) => void; hide: (id: string) => void } } }).shopify;
    if (!shopify?.saveBar) return;
    if (isDirty) shopify.saveBar.show("page-editor-save-bar");
    else shopify.saveBar.hide("page-editor-save-bar");
  }, [isDirty]);

  // Show toast / error banner on action response.
  useEffect(() => {
    if (fetcher.state !== "idle" || !fetcher.data) return;
    const data = fetcher.data as { ok: boolean; error?: string; publishResult?: { handle: string } };
    if (data.ok) {
      initialRef.current = { title, blocks, seo };
      const win = window as unknown as { shopify?: { toast?: { show: (msg: string) => void } } };
      if (data.publishResult) {
        win.shopify?.toast?.show?.(`Published as /pages/${data.publishResult.handle}`);
        setBannerSuccess(`Live at /pages/${data.publishResult.handle}. Storefront usually reflects within 30 seconds.`);
      } else {
        win.shopify?.toast?.show?.("Changes saved");
      }
      setBannerError(null);
    } else if (data.error) {
      setBannerError(data.error);
      setBannerSuccess(null);
    }
  }, [fetcher.state, fetcher.data, title, blocks, seo]);

  const seoIssues = useMemo(() => validateSeo(seo), [seo]);
  const seoBlockers = useMemo(() => seoErrors(seoIssues), [seoIssues]);
  const draftDiff = useMemo(
    () =>
      computeDraftDiff(
        { blocks: page.blocks as Block[], seo: page.seo },
        { blocks, seo },
      ),
    [page.blocks, page.seo, blocks, seo],
  );

  const handleSave = useCallback(() => {
    const fd = new FormData();
    fd.set("intent", "save");
    fd.set("title", title);
    fd.set("blocks", JSON.stringify(blocks));
    fd.set("seo", JSON.stringify(seo));
    fetcher.submit(fd, { method: "post" });
  }, [title, blocks, seo, fetcher]);

  const handleDiscard = useCallback(() => {
    setTitle(initialRef.current.title);
    setBlocks(initialRef.current.blocks);
    setSeo(initialRef.current.seo);
  }, []);

  const handlePublish = useCallback(() => {
    if (seoBlockers.length > 0) {
      setBannerError("Fix SEO errors before publishing: " + seoBlockers.map((e) => e.message).join("; "));
      setSeoOpen(true);
      return;
    }
    const fd = new FormData();
    fd.set("intent", "publish");
    fd.set("title", title);
    fd.set("blocks", JSON.stringify(blocks));
    fd.set("seo", JSON.stringify(seo));
    fetcher.submit(fd, { method: "post" });
  }, [title, blocks, seo, seoBlockers, fetcher]);

  const moveBlock = useCallback((from: number, to: number) => {
    setBlocks((prev) => reorderBlocks(prev, from, to));
  }, []);

  const updateBlock = useCallback((idx: number, next: Block) => {
    setBlocks((prev) => prev.map((b, i) => (i === idx ? next : b)));
  }, []);

  const deleteBlock = useCallback((idx: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addSection = useCallback((sectionId: string) => {
    const section = getSection(sectionId);
    if (!section) return;
    setBlocks((prev) => [...prev, ...cloneSectionBlocks(section)]);
    setSectionPickerOpen(false);
  }, []);

  return (
    <Page
      backAction={{ content: "Pages", url: "/app" }}
      title={title || "Untitled page"}
      titleMetadata={
        page.publishedAt ? (
          <Badge tone={draftDiff.hasDraft ? "attention" : "success"}>
            {draftDiff.hasDraft ? "Unpublished changes" : "Published"}
          </Badge>
        ) : (
          <Badge tone="attention">Draft</Badge>
        )
      }
      primaryAction={{
        content: page.publishedAt ? "Republish" : "Publish",
        loading: isSubmitting && fetcher.formData?.get("intent") === "publish",
        disabled: isSubmitting || (seoBlockers.length > 0),
        onAction: handlePublish,
      }}
      secondaryActions={[
        {
          content: "Open in storefront",
          url: page.publishedAt ? `https://${page.shopDomain}/pages/${page.slug}` : undefined,
          external: true,
          disabled: !page.publishedAt,
        },
      ]}
    >
      <BlockStack gap="400">
        {bannerError ? (
          <Banner tone="critical" onDismiss={() => setBannerError(null)} title="Couldn't save changes">
            <p>{bannerError}</p>
          </Banner>
        ) : null}
        {bannerSuccess ? (
          <Banner tone="success" onDismiss={() => setBannerSuccess(null)} title="Page published">
            <p>{bannerSuccess}</p>
          </Banner>
        ) : null}

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <TextField
                  label="Page title"
                  value={title}
                  onChange={setTitle}
                  autoComplete="off"
                  helpText={`URL: /pages/${page.slug}`}
                />
                <Divider />
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingMd">
                    Sections
                  </Text>
                  <Button onClick={() => setSectionPickerOpen(true)}>Add section</Button>
                </InlineStack>
                {blocks.length === 0 ? (
                  <Box padding="400">
                    <Text as="p" tone="subdued">
                      This page has no sections. Click "Add section" to insert one from the library.
                    </Text>
                  </Box>
                ) : (
                  <BlockStack gap="300">
                    {blocks.map((block, idx) => (
                      <BlockEditorCard
                        key={block.id}
                        block={block}
                        index={idx}
                        total={blocks.length}
                        onChange={(next) => updateBlock(idx, next)}
                        onMoveUp={() => moveBlock(idx, idx - 1)}
                        onMoveDown={() => moveBlock(idx, idx + 1)}
                        onDelete={() => deleteBlock(idx)}
                      />
                    ))}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <SeoCard
                seo={seo}
                onChange={setSeo}
                isOpen={seoOpen}
                onToggle={() => setSeoOpen((v) => !v)}
                issues={seoIssues}
              />
            </Box>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">
                    Preview
                  </Text>
                  <ButtonGroup variant="segmented">
                    <Button
                      pressed={previewMode === "mobile"}
                      onClick={() => setPreviewMode("mobile")}
                    >
                      Mobile
                    </Button>
                    <Button
                      pressed={previewMode === "desktop"}
                      onClick={() => setPreviewMode("desktop")}
                    >
                      Desktop
                    </Button>
                  </ButtonGroup>
                </InlineStack>
                <Box
                  background="bg-surface-secondary"
                  padding="200"
                  borderRadius="200"
                  borderColor="border"
                  borderWidth="025"
                >
                  <PreviewFrame
                    mode={previewMode}
                    pageId={page.id}
                    blocks={blocks}
                    title={title}
                    seo={seo}
                  />
                </Box>
                <Text as="p" tone="subdued" variant="bodySm">
                  Preview reflects unsaved edits in the editor.
                </Text>
              </BlockStack>
            </Card>

            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">
                    Details
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Template: {page.templateId}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Last update: {new Date(page.updatedAt * 1000).toLocaleString()}
                  </Text>
                  {page.publishedAt ? (
                    <Text as="p" variant="bodySm" tone="subdued">
                      Published: {new Date(page.publishedAt * 1000).toLocaleString()}
                    </Text>
                  ) : null}
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>

      <Modal
        open={sectionPickerOpen}
        onClose={() => setSectionPickerOpen(false)}
        title="Add a section"
        primaryAction={{ content: "Close", onAction: () => setSectionPickerOpen(false) }}
      >
        <Modal.Section>
          <BlockStack gap="300">
            <Text as="p" tone="subdued">
              Choose a pre-built section to drop into this page. You can edit, reorder, or remove it after.
            </Text>
            <BlockStack gap="200">
              {sections.map((s) => (
                <Card key={s.id}>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="p" fontWeight="medium">
                        {s.name}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {s.description}
                      </Text>
                    </BlockStack>
                    <Button onClick={() => addSection(s.id)} variant="primary">
                      Add
                    </Button>
                  </InlineStack>
                </Card>
              ))}
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>

      {/* App Bridge SaveBar — surfaces when isDirty toggles via the
          useEffect above. Buttons fire imperative actions; they're
          inert nodes when App Bridge isn't loaded. */}
      <ui-save-bar id="page-editor-save-bar">
        <button variant="primary" onClick={handleSave} loading={isSubmitting && fetcher.formData?.get("intent") === "save" ? "" : undefined}>
          Save
        </button>
        <button onClick={handleDiscard}>Discard</button>
      </ui-save-bar>

      {/* Fallback non-JS form so SaveBar isn't the only path. */}
      <Form method="post" hidden>
        <input type="hidden" name="intent" value="save" />
        <input type="hidden" name="title" value={title} />
        <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
        <input type="hidden" name="seo" value={JSON.stringify(seo)} />
      </Form>
    </Page>
  );
}

// ─── Section / block editor card ───────────────────────────────────────────

function BlockEditorCard({
  block,
  index,
  total,
  onChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  block: Block;
  index: number;
  total: number;
  onChange: (next: Block) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const labelByType: Record<string, string> = {
    heading: "Heading",
    body: "Body",
    image: "Image",
    cta: "Call-to-action",
    spacer: "Spacer",
    columns: "Columns",
    accordion: "Accordion",
    form: "Form",
    countdown: "Countdown",
  };
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Box>
              <span
                aria-hidden
                style={{ cursor: "grab", fontSize: 16, color: "#999" }}
                title="Drag to reorder (use the buttons below as a fallback)"
              >
                ⋮⋮
              </span>
            </Box>
            <Text as="span" fontWeight="medium">
              {labelByType[block.type] ?? block.type}
            </Text>
          </InlineStack>
          <InlineStack gap="100">
            <Button onClick={onMoveUp} disabled={index === 0} accessibilityLabel="Move up">
              ↑
            </Button>
            <Button onClick={onMoveDown} disabled={index === total - 1} accessibilityLabel="Move down">
              ↓
            </Button>
            <Button tone="critical" onClick={onDelete} accessibilityLabel="Delete block">
              Delete
            </Button>
          </InlineStack>
        </InlineStack>
        <BlockBody block={block} onChange={onChange} />
      </BlockStack>
    </Card>
  );
}

function BlockBody({ block, onChange }: { block: Block; onChange: (next: Block) => void }) {
  switch (block.type) {
    case "heading":
      return (
        <FormLayout>
          <TextField
            label="Heading text"
            value={block.text}
            onChange={(v) => onChange({ ...block, text: v })}
            autoComplete="off"
          />
          <Select
            label="Level"
            options={[
              { label: "H1", value: "1" },
              { label: "H2", value: "2" },
              { label: "H3", value: "3" },
            ]}
            value={String(block.level)}
            onChange={(v) => onChange({ ...block, level: Number(v) as 1 | 2 | 3 })}
          />
          <Select
            label="Alignment"
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
            value={block.align ?? "left"}
            onChange={(v) => onChange({ ...block, align: v as "left" | "center" | "right" })}
          />
        </FormLayout>
      );
    case "body":
      return (
        <TextField
          label="Body text"
          value={block.text}
          onChange={(v) => onChange({ ...block, text: v })}
          autoComplete="off"
          multiline={4}
          helpText="Plain text. Inline <b>, <i>, <em>, <strong>, <u>, <br /> tags are allowed."
        />
      );
    case "image":
      return (
        <FormLayout>
          <TextField
            label="Image URL"
            value={block.src}
            onChange={(v) => onChange({ ...block, src: v })}
            autoComplete="off"
            helpText="Paste a Shopify Files URL or any HTTPS image URL. Resized variants at 320/640/1280 px are generated automatically."
          />
          <TextField
            label="Alt text"
            value={block.alt}
            onChange={(v) => onChange({ ...block, alt: v })}
            autoComplete="off"
          />
          <TextField
            label="Caption (optional)"
            value={block.caption ?? ""}
            onChange={(v) => onChange({ ...block, caption: v })}
            autoComplete="off"
          />
        </FormLayout>
      );
    case "cta":
      return (
        <FormLayout>
          <TextField
            label="Button text"
            value={block.text}
            onChange={(v) => onChange({ ...block, text: v })}
            autoComplete="off"
          />
          <TextField
            label="URL"
            value={block.url}
            onChange={(v) => onChange({ ...block, url: v })}
            autoComplete="off"
            helpText="Use /collections/all, /products/<handle>, /pages/<handle>, or an absolute https:// URL."
          />
          <Select
            label="Style"
            options={[
              { label: "Primary", value: "primary" },
              { label: "Secondary", value: "secondary" },
            ]}
            value={block.style}
            onChange={(v) => onChange({ ...block, style: v as "primary" | "secondary" })}
          />
          <Select
            label="Alignment"
            options={[
              { label: "Left", value: "left" },
              { label: "Center", value: "center" },
              { label: "Right", value: "right" },
            ]}
            value={block.align ?? "left"}
            onChange={(v) => onChange({ ...block, align: v as "left" | "center" | "right" })}
          />
        </FormLayout>
      );
    case "spacer":
      return (
        <Select
          label="Size"
          options={[
            { label: "Small (16px)", value: "sm" },
            { label: "Medium (32px)", value: "md" },
            { label: "Large (64px)", value: "lg" },
          ]}
          value={block.size}
          onChange={(v) => onChange({ ...block, size: v as "sm" | "md" | "lg" })}
        />
      );
    case "columns":
      return (
        <BlockStack gap="200">
          <Text as="p" tone="subdued" variant="bodySm">
            {block.columns.length} column{block.columns.length === 1 ? "" : "s"}.
          </Text>
          {block.columns.map((col, i) => (
            <Card key={i}>
              <BlockStack gap="200">
                <TextField
                  label={`Column ${i + 1} heading`}
                  value={col.heading}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      columns: block.columns.map((c, j) => (j === i ? { ...c, heading: v } : c)),
                    })
                  }
                  autoComplete="off"
                />
                <TextField
                  label={`Column ${i + 1} body`}
                  value={col.body}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      columns: block.columns.map((c, j) => (j === i ? { ...c, body: v } : c)),
                    })
                  }
                  autoComplete="off"
                  multiline={2}
                />
              </BlockStack>
            </Card>
          ))}
          <InlineStack gap="200">
            <Button
              onClick={() =>
                onChange({
                  ...block,
                  columns: [...block.columns, { heading: "", body: "" }],
                })
              }
              disabled={block.columns.length >= 4}
            >
              Add column
            </Button>
            <Button
              onClick={() =>
                onChange({
                  ...block,
                  columns: block.columns.slice(0, -1),
                })
              }
              disabled={block.columns.length <= 1}
            >
              Remove last column
            </Button>
          </InlineStack>
        </BlockStack>
      );
    case "accordion":
      return (
        <BlockStack gap="200">
          {block.items.map((item, i) => (
            <Card key={i}>
              <BlockStack gap="200">
                <TextField
                  label={`Question ${i + 1}`}
                  value={item.question}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      items: block.items.map((it, j) => (j === i ? { ...it, question: v } : it)),
                    })
                  }
                  autoComplete="off"
                />
                <TextField
                  label="Answer"
                  value={item.answer}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      items: block.items.map((it, j) => (j === i ? { ...it, answer: v } : it)),
                    })
                  }
                  autoComplete="off"
                  multiline={3}
                />
                <TextField
                  label="Category (optional)"
                  value={item.category ?? ""}
                  onChange={(v) =>
                    onChange({
                      ...block,
                      items: block.items.map((it, j) => (j === i ? { ...it, category: v } : it)),
                    })
                  }
                  autoComplete="off"
                />
              </BlockStack>
            </Card>
          ))}
          <Button
            onClick={() =>
              onChange({ ...block, items: [...block.items, { question: "", answer: "" }] })
            }
          >
            Add question
          </Button>
        </BlockStack>
      );
    case "form":
      return (
        <BlockStack gap="200">
          <TextField
            label="Form heading"
            value={block.heading}
            onChange={(v) => onChange({ ...block, heading: v })}
            autoComplete="off"
          />
          <TextField
            label="Submit button label"
            value={block.submitLabel}
            onChange={(v) => onChange({ ...block, submitLabel: v })}
            autoComplete="off"
          />
          <TextField
            label="Success message"
            value={block.successMessage}
            onChange={(v) => onChange({ ...block, successMessage: v })}
            autoComplete="off"
            multiline={2}
          />
          <Text as="p" tone="subdued" variant="bodySm">
            Form fields are managed per template — edit the schema in app/templates/* to customise.
          </Text>
        </BlockStack>
      );
    case "countdown":
      return (
        <FormLayout>
          <TextField
            label="Target date / time (ISO 8601)"
            value={block.targetIso}
            onChange={(v) => onChange({ ...block, targetIso: v })}
            autoComplete="off"
            helpText="Example: 2026-06-15T12:00:00Z"
          />
          <TextField
            label="Expired message"
            value={block.expiredMessage}
            onChange={(v) => onChange({ ...block, expiredMessage: v })}
            autoComplete="off"
          />
        </FormLayout>
      );
    default:
      return null;
  }
}

// ─── SEO card ─────────────────────────────────────────────────────────────

function SeoCard({
  seo,
  onChange,
  isOpen,
  onToggle,
  issues,
}: {
  seo: SeoMeta;
  onChange: (next: SeoMeta) => void;
  isOpen: boolean;
  onToggle: () => void;
  issues: ReturnType<typeof validateSeo>;
}) {
  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h2" variant="headingMd">
              SEO
            </Text>
            <Text as="p" tone="subdued" variant="bodySm">
              Title, description, OG image, and canonical URL — written to Shopify Page metafields under namespace `seo`.
            </Text>
          </BlockStack>
          <Button onClick={onToggle} ariaExpanded={isOpen} ariaControls="seo-card-body">
            {isOpen ? "Hide" : "Edit"}
          </Button>
        </InlineStack>
        <Collapsible id="seo-card-body" open={isOpen} transition={{ duration: "150ms" }}>
          <FormLayout>
            <TextField
              label="SEO title"
              value={seo.title}
              onChange={(v) => onChange({ ...seo, title: v })}
              autoComplete="off"
              helpText={`${seo.title.length}/60 characters`}
              error={issues.find((i) => i.field === "title" && i.level === "error")?.message}
            />
            <TextField
              label="Meta description"
              value={seo.description}
              onChange={(v) => onChange({ ...seo, description: v })}
              autoComplete="off"
              multiline={3}
              helpText={`${seo.description.length}/160 characters`}
            />
            <TextField
              label="OG image URL"
              value={seo.ogImage}
              onChange={(v) => onChange({ ...seo, ogImage: v })}
              autoComplete="off"
              helpText="Absolute https:// URL. Used for social-share previews on Facebook, Twitter, LinkedIn."
              error={issues.find((i) => i.field === "ogImage")?.message}
            />
            <TextField
              label="Canonical URL"
              value={seo.canonical}
              onChange={(v) => onChange({ ...seo, canonical: v })}
              autoComplete="off"
              helpText="Optional. Use when this page is a copy of an existing URL you want to point search engines to."
              error={issues.find((i) => i.field === "canonical")?.message}
            />
            {issues
              .filter((i) => i.level === "warning")
              .map((i) => (
                <Box key={`${i.field}-${i.message}`}>
                  <InlineError message={i.message} fieldID={`seo-${i.field}`} />
                </Box>
              ))}
          </FormLayout>
        </Collapsible>
      </BlockStack>
    </Card>
  );
}

// ─── Preview iframe ───────────────────────────────────────────────────────

function PreviewFrame({
  mode,
  pageId,
  blocks,
  title,
  seo,
}: {
  mode: "mobile" | "desktop";
  pageId: number;
  blocks: Block[];
  title: string;
  seo: SeoMeta;
}) {
  // Shop is needed so the preview route's public-auth fallback can
  // verify the request — App Bridge can't inject a Bearer header on
  // an iframe document load. We have it from the loader.
  const { page } = useLoaderData<typeof loader>();
  const shop = page.shopDomain;
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Push new state to the iframe via postMessage on every change. We send
  // the pre-rendered body HTML so the iframe doesn't need to import the
  // renderer client-side — keeps the iframe doc tiny + avoids the iframe
  // running our React bundle.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const bodyHtml = renderBlocks(blocks);
    win.postMessage({ type: "dropship:preview", title, bodyHtml, seo }, "*");
  }, [title, blocks, seo]);
  const width = mode === "mobile" ? 375 : 1280;
  const scale = mode === "mobile" ? 1 : 0.5;
  return (
    <div
      style={{
        width: "100%",
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: width * scale,
          height: 480,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fff",
          overflow: "hidden",
        }}
      >
        <iframe
          ref={iframeRef}
          title={`Preview (${mode})`}
          src={`/preview/${pageId}?mode=${mode}&shop=${encodeURIComponent(shop)}`}
          width={width}
          height={480 / scale}
          style={{
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width,
            height: 480 / scale,
            display: "block",
          }}
          loading="lazy"
        />
      </div>
    </div>
  );
}
