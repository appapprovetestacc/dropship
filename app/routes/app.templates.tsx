import { json, redirect, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Form, useNavigation } from "@remix-run/react";
import {
  BlockStack,
  Box,
  Button,
  Card,
  InlineGrid,
  Page,
  Text,
} from "@shopify/polaris";
import { authenticate } from "~/lib/shopify.server";
import { cloneTemplateBlocks, getTemplate, TEMPLATE_LIST, type TemplateId } from "~/templates";
import { createPage, listSlugs } from "~/lib/pages-repo.server";
import { nextAvailableSlug, slugify } from "~/lib/slug";
import { emptySeo } from "~/lib/seo";

export async function loader({ request, context }: LoaderFunctionArgs) {
  await authenticate.admin(request, context);
  return json({ templates: TEMPLATE_LIST.map((t) => ({ id: t.id, name: t.name, description: t.description, thumbnail: t.thumbnail })) });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const { shop } = await authenticate.admin(request, context);
  const env = context.cloudflare?.env as never;
  const form = await request.formData();
  const templateId = String(form.get("templateId") ?? "") as TemplateId;
  const template = getTemplate(templateId);
  if (!template) {
    return json({ ok: false, error: `Unknown template: ${templateId}` }, { status: 400 });
  }
  const baseTitle = template.name + " page";
  const existingSlugs = await listSlugs(env, shop);
  const slug = nextAvailableSlug(slugify(baseTitle), existingSlugs);
  const blocks = cloneTemplateBlocks(template);
  const page = await createPage(env, {
    shopDomain: shop,
    slug,
    title: baseTitle,
    templateId: template.id,
    blocks,
    seo: { ...emptySeo(), title: baseTitle },
  });
  return redirect(`/app/pages/${page.id}`);
}

export default function TemplatesPicker() {
  const nav = useNavigation();
  const submittingId =
    nav.state === "submitting" && nav.formData ? String(nav.formData.get("templateId") ?? "") : null;

  return (
    <Page
      title="Pick a template"
      backAction={{ content: "Pages", url: "/app" }}
    >
      <BlockStack gap="400">
        <Text as="p" tone="subdued">
          Start from a pre-built layout — you can edit, reorder, and remove any block after.
        </Text>
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
          {TEMPLATE_LIST_CARDS.map((t) => (
            <Card key={t.id}>
              <BlockStack gap="300">
                <Box
                  background="bg-surface-secondary"
                  borderRadius="200"
                  minHeight="160px"
                  padding="400"
                >
                  <Text as="p" variant="headingMd" alignment="center">
                    {t.name}
                  </Text>
                </Box>
                <BlockStack gap="100">
                  <Text as="h3" variant="headingMd">
                    {t.name}
                  </Text>
                  <Text as="p" tone="subdued">
                    {t.description}
                  </Text>
                </BlockStack>
                <Form method="post">
                  <input type="hidden" name="templateId" value={t.id} />
                  <Button
                    submit
                    variant="primary"
                    loading={submittingId === t.id}
                    disabled={submittingId !== null && submittingId !== t.id}
                  >
                    Use this template
                  </Button>
                </Form>
              </BlockStack>
            </Card>
          ))}
        </InlineGrid>
      </BlockStack>
    </Page>
  );
}

const TEMPLATE_LIST_CARDS = TEMPLATE_LIST.map((t) => ({
  id: t.id,
  name: t.name,
  description: t.description,
}));
