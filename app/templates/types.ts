import type { Block } from "~/lib/blocks";

export interface Template {
  id: TemplateId;
  name: string;
  description: string;
  thumbnail: string;
  // Concrete starter blocks (already instantiated with ids). The editor
  // clones these on "Use this template" so two pages from the same
  // template don't share block-id collisions.
  blocks: Block[];
}

export type TemplateId =
  | "landing"
  | "about"
  | "contact"
  | "product-spotlight"
  | "faq"
  | "coming-soon";

// Section library — Shogun-style. The editor surfaces these as add-block
// options inside the editor regardless of template. Each entry is the
// pre-built section users can drop into any page.
export interface SectionDef {
  id: string;
  name: string;
  description: string;
  category: "hero" | "content" | "social-proof" | "feature" | "form" | "media" | "utility";
  blocks: Block[];
}
