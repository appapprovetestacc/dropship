// Block-type model shared by templates, editor, renderer, and tests.
// Pure — no DB / network / browser globals.

export type BlockType =
  | "heading"
  | "body"
  | "image"
  | "cta"
  | "spacer"
  | "columns"
  | "accordion"
  | "form"
  | "countdown";

export interface HeadingBlock {
  id: string;
  type: "heading";
  level: 1 | 2 | 3;
  text: string;
  align?: "left" | "center" | "right";
}

export interface BodyBlock {
  id: string;
  type: "body";
  text: string;
}

export interface ImageBlock {
  id: string;
  type: "image";
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}

export interface CtaBlock {
  id: string;
  type: "cta";
  text: string;
  url: string;
  style: "primary" | "secondary";
  align?: "left" | "center" | "right";
}

export interface SpacerBlock {
  id: string;
  type: "spacer";
  size: "sm" | "md" | "lg";
}

export interface ColumnsBlock {
  id: string;
  type: "columns";
  columns: Array<{ heading: string; body: string; icon?: string }>;
}

export interface AccordionBlock {
  id: string;
  type: "accordion";
  items: Array<{ question: string; answer: string; category?: string }>;
}

export interface FormBlock {
  id: string;
  type: "form";
  heading: string;
  fields: Array<{ name: string; label: string; type: "text" | "email" | "textarea"; required?: boolean }>;
  submitLabel: string;
  successMessage: string;
}

export interface CountdownBlock {
  id: string;
  type: "countdown";
  targetIso: string; // ISO-8601 datetime
  expiredMessage: string;
}

export type Block =
  | HeadingBlock
  | BodyBlock
  | ImageBlock
  | CtaBlock
  | SpacerBlock
  | ColumnsBlock
  | AccordionBlock
  | FormBlock
  | CountdownBlock;

export interface BlockDef<T extends Block = Block> {
  type: T["type"];
  defaults: Omit<T, "id" | "type">;
}

let idCounter = 0;
export function nextBlockId(): string {
  idCounter += 1;
  // Time-based prefix so client + server generations don't collide on re-render.
  return `b_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function instantiateBlock<T extends Block>(def: BlockDef<T>, id?: string): T {
  return { id: id ?? nextBlockId(), type: def.type, ...def.defaults } as T;
}

export function reorderBlocks(blocks: Block[], fromIndex: number, toIndex: number): Block[] {
  if (fromIndex === toIndex) return blocks.slice();
  if (fromIndex < 0 || fromIndex >= blocks.length) return blocks.slice();
  if (toIndex < 0 || toIndex >= blocks.length) return blocks.slice();
  const next = blocks.slice();
  const [moved] = next.splice(fromIndex, 1);
  if (moved) next.splice(toIndex, 0, moved);
  return next;
}
