import type { Template, TemplateId } from "./types";
import { landingTemplate } from "./landing";
import { aboutTemplate } from "./about";
import { contactTemplate } from "./contact";
import { productSpotlightTemplate } from "./product-spotlight";
import { faqTemplate } from "./faq";
import { comingSoonTemplate } from "./coming-soon";

export const TEMPLATES: Record<TemplateId, Template> = {
  landing: landingTemplate,
  about: aboutTemplate,
  contact: contactTemplate,
  "product-spotlight": productSpotlightTemplate,
  faq: faqTemplate,
  "coming-soon": comingSoonTemplate,
};

export const TEMPLATE_LIST: Template[] = [
  landingTemplate,
  aboutTemplate,
  contactTemplate,
  productSpotlightTemplate,
  faqTemplate,
  comingSoonTemplate,
];

export function getTemplate(id: string): Template | null {
  return (TEMPLATES as Record<string, Template>)[id] ?? null;
}

// Clone a template's blocks with fresh ids so two pages from the same
// template don't share block-id collisions in the editor.
import { nextBlockId } from "~/lib/blocks";
import type { Block } from "~/lib/blocks";

export function cloneTemplateBlocks(template: Template): Block[] {
  return template.blocks.map((b) => ({ ...b, id: nextBlockId() } as Block));
}

export type { Template, TemplateId } from "./types";
