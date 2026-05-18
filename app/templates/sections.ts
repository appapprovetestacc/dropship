import type { Block } from "~/lib/blocks";
import type { SectionDef } from "./types";

// Shogun-style section library — the editor surfaces these as "Add section"
// options. Each is a small, focused group of blocks that drops cleanly
// into any page. IDs are stable so the user can recognise them in the
// add-section list; the editor reassigns fresh block IDs on insert.

const heroCentered: SectionDef = {
  id: "hero-centered",
  name: "Centered hero",
  description: "Headline, supporting line, and a primary call-to-action.",
  category: "hero",
  blocks: [
    { id: "s-hc-1", type: "heading", level: 1, text: "Your headline goes here", align: "center" },
    { id: "s-hc-2", type: "body", text: "A short sentence that explains what this page is about." },
    { id: "s-hc-3", type: "cta", text: "Shop now", url: "/collections/all", style: "primary", align: "center" },
  ],
};

const heroSplitImage: SectionDef = {
  id: "hero-split-image",
  name: "Hero with image",
  description: "Hero text alongside a full-bleed image.",
  category: "hero",
  blocks: [
    { id: "s-hs-img", type: "image", src: "", alt: "Hero image" },
    { id: "s-hs-h", type: "heading", level: 1, text: "Headline that anchors the page", align: "left" },
    { id: "s-hs-b", type: "body", text: "One or two sentences that set context for the product story below." },
    { id: "s-hs-cta", type: "cta", text: "Learn more", url: "#", style: "primary", align: "left" },
  ],
};

const heroAnnouncement: SectionDef = {
  id: "hero-announcement",
  name: "Announcement banner",
  description: "Short ribbon-style announcement with a single CTA.",
  category: "hero",
  blocks: [
    { id: "s-ha-h", type: "heading", level: 2, text: "New collection — now shipping", align: "center" },
    { id: "s-ha-cta", type: "cta", text: "Shop the drop", url: "/collections/new", style: "primary", align: "center" },
  ],
};

const featuresThreeCol: SectionDef = {
  id: "features-3-col",
  name: "Three-column features",
  description: "Three benefit columns with icons and short copy.",
  category: "feature",
  blocks: [
    {
      id: "s-f3-cols",
      type: "columns",
      columns: [
        { heading: "Feature one", body: "What the customer gets and why it matters.", icon: "✓" },
        { heading: "Feature two", body: "A second benefit, said plainly.", icon: "✓" },
        { heading: "Feature three", body: "A third benefit, concrete and specific.", icon: "✓" },
      ],
    },
  ],
};

const featuresFourCol: SectionDef = {
  id: "features-4-col",
  name: "Four-column features",
  description: "Four feature tiles, useful for spec sheets.",
  category: "feature",
  blocks: [
    {
      id: "s-f4-cols",
      type: "columns",
      columns: [
        { heading: "Materials", body: "What it's made of.", icon: "🧵" },
        { heading: "Origin", body: "Where it's made.", icon: "🌍" },
        { heading: "Care", body: "How to keep it.", icon: "🧼" },
        { heading: "Warranty", body: "How long it's covered.", icon: "🛡" },
      ],
    },
  ],
};

const testimonialQuote: SectionDef = {
  id: "testimonial-quote",
  name: "Pull quote testimonial",
  description: "Single customer quote with attribution.",
  category: "social-proof",
  blocks: [
    {
      id: "s-tq",
      type: "body",
      text: "<em>“Two sentences from a real customer about a specific outcome.”</em><br />— First Lastname",
    },
  ],
};

const testimonialGrid: SectionDef = {
  id: "testimonial-grid",
  name: "Testimonial grid",
  description: "Three short quotes side-by-side.",
  category: "social-proof",
  blocks: [
    {
      id: "s-tg-h",
      type: "heading",
      level: 2,
      text: "What customers say",
      align: "center",
    },
    {
      id: "s-tg-cols",
      type: "columns",
      columns: [
        { heading: "Asha M.", body: "“Held up to a year of daily use without softening.”" },
        { heading: "Jonas P.", body: "“The fit was right the first time — no exchange needed.”" },
        { heading: "Mei L.", body: "“Customer service replied in under an hour. Real humans.”" },
      ],
    },
  ],
};

const logoStrip: SectionDef = {
  id: "logo-strip",
  name: "Press strip",
  description: "Short list of publications or partners.",
  category: "social-proof",
  blocks: [
    { id: "s-ls-h", type: "heading", level: 3, text: "As featured in", align: "center" },
    {
      id: "s-ls-row",
      type: "columns",
      columns: [
        { heading: "Outlet one", body: "" },
        { heading: "Outlet two", body: "" },
        { heading: "Outlet three", body: "" },
      ],
    },
  ],
};

const richTextSection: SectionDef = {
  id: "rich-text",
  name: "Rich text",
  description: "Heading plus a body paragraph — the workhorse content section.",
  category: "content",
  blocks: [
    { id: "s-rt-h", type: "heading", level: 2, text: "A section heading" },
    {
      id: "s-rt-b",
      type: "body",
      text: "Two or three sentences of supporting copy. Use this for your story, mission, return policy, or care guide.",
    },
  ],
};

const twoColumnText: SectionDef = {
  id: "two-column-text",
  name: "Two-column text",
  description: "Side-by-side paragraphs for compare/contrast layouts.",
  category: "content",
  blocks: [
    {
      id: "s-2c",
      type: "columns",
      columns: [
        { heading: "Side A", body: "Left column copy." },
        { heading: "Side B", body: "Right column copy." },
      ],
    },
  ],
};

const imageWithText: SectionDef = {
  id: "image-with-text",
  name: "Image with text",
  description: "Single image plus a short caption.",
  category: "media",
  blocks: [
    { id: "s-iwt-img", type: "image", src: "", alt: "Section image", caption: "Optional caption." },
    { id: "s-iwt-h", type: "heading", level: 2, text: "Image heading" },
    { id: "s-iwt-b", type: "body", text: "Describe what the image is showing and why it matters." },
  ],
};

const galleryThree: SectionDef = {
  id: "gallery-three",
  name: "Three-image gallery",
  description: "Trio of images in a row.",
  category: "media",
  blocks: [
    {
      id: "s-g3",
      type: "columns",
      columns: [
        { heading: "Detail one", body: "Short description." },
        { heading: "Detail two", body: "Short description." },
        { heading: "Detail three", body: "Short description." },
      ],
    },
  ],
};

const ctaBanner: SectionDef = {
  id: "cta-banner",
  name: "CTA banner",
  description: "Heading plus a prominent call-to-action button.",
  category: "utility",
  blocks: [
    { id: "s-ctab-h", type: "heading", level: 2, text: "Ready to start?", align: "center" },
    { id: "s-ctab-cta", type: "cta", text: "Shop now", url: "/collections/all", style: "primary", align: "center" },
  ],
};

const ctaDoubleButton: SectionDef = {
  id: "cta-double",
  name: "Two-button CTA",
  description: "Primary and secondary calls-to-action side by side.",
  category: "utility",
  blocks: [
    { id: "s-ctd-h", type: "heading", level: 2, text: "Two paths from here", align: "center" },
    { id: "s-ctd-1", type: "cta", text: "Primary action", url: "#", style: "primary", align: "center" },
    { id: "s-ctd-2", type: "cta", text: "Secondary action", url: "#", style: "secondary", align: "center" },
  ],
};

const faqAccordion: SectionDef = {
  id: "faq-accordion",
  name: "FAQ accordion",
  description: "Expandable list of questions and answers.",
  category: "content",
  blocks: [
    { id: "s-faq-h", type: "heading", level: 2, text: "Frequently asked questions" },
    {
      id: "s-faq-acc",
      type: "accordion",
      items: [
        { question: "First question", answer: "Concise answer." },
        { question: "Second question", answer: "Concise answer." },
        { question: "Third question", answer: "Concise answer." },
      ],
    },
  ],
};

const contactForm: SectionDef = {
  id: "contact-form",
  name: "Contact form",
  description: "Name, email, and message fields with a submit button.",
  category: "form",
  blocks: [
    {
      id: "s-cf",
      type: "form",
      heading: "Send a message",
      fields: [
        { name: "name", label: "Your name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "message", label: "How can we help?", type: "textarea", required: true },
      ],
      submitLabel: "Send",
      successMessage: "Thanks — we'll reply within one business day.",
    },
  ],
};

const newsletterCapture: SectionDef = {
  id: "newsletter",
  name: "Newsletter signup",
  description: "Email-only capture form for launch and announcement updates.",
  category: "form",
  blocks: [
    { id: "s-nw-h", type: "heading", level: 2, text: "Get launch updates", align: "center" },
    {
      id: "s-nw-f",
      type: "form",
      heading: "Sign up for updates",
      fields: [{ name: "email", label: "Email", type: "email", required: true }],
      submitLabel: "Notify me",
      successMessage: "You're on the list — talk soon.",
    },
  ],
};

const countdownSection: SectionDef = {
  id: "countdown",
  name: "Countdown timer",
  description: "Server-rendered countdown to a target date.",
  category: "utility",
  blocks: [
    { id: "s-cd", type: "countdown", targetIso: "2099-01-01T00:00:00.000Z", expiredMessage: "We're live." },
  ],
};

const spacerSm: SectionDef = {
  id: "spacer-sm",
  name: "Small spacer",
  description: "16px of vertical whitespace.",
  category: "utility",
  blocks: [{ id: "s-sp-sm", type: "spacer", size: "sm" }],
};

const spacerLg: SectionDef = {
  id: "spacer-lg",
  name: "Large spacer",
  description: "64px of vertical whitespace.",
  category: "utility",
  blocks: [{ id: "s-sp-lg", type: "spacer", size: "lg" }],
};

const teamGrid: SectionDef = {
  id: "team-grid",
  name: "Team grid",
  description: "Three-person team grid with name and role.",
  category: "social-proof",
  blocks: [
    { id: "s-team-h", type: "heading", level: 2, text: "The team" },
    {
      id: "s-team-c",
      type: "columns",
      columns: [
        { heading: "Name — Role", body: "One-line bio." },
        { heading: "Name — Role", body: "One-line bio." },
        { heading: "Name — Role", body: "One-line bio." },
      ],
    },
  ],
};

const valuePropList: SectionDef = {
  id: "value-prop-list",
  name: "Value-prop checklist",
  description: "Four short selling points stacked as a list.",
  category: "feature",
  blocks: [
    { id: "s-vp-1", type: "body", text: "✓ <strong>Free shipping</strong> on orders over $50" },
    { id: "s-vp-2", type: "body", text: "✓ <strong>30-day returns</strong> — no questions asked" },
    { id: "s-vp-3", type: "body", text: "✓ <strong>Five-year warranty</strong> on every piece" },
    { id: "s-vp-4", type: "body", text: "✓ <strong>Carbon-neutral</strong> shipping by default" },
  ],
};

export const SECTION_LIBRARY: SectionDef[] = [
  heroCentered,
  heroSplitImage,
  heroAnnouncement,
  featuresThreeCol,
  featuresFourCol,
  testimonialQuote,
  testimonialGrid,
  logoStrip,
  richTextSection,
  twoColumnText,
  imageWithText,
  galleryThree,
  ctaBanner,
  ctaDoubleButton,
  faqAccordion,
  contactForm,
  newsletterCapture,
  countdownSection,
  teamGrid,
  valuePropList,
  spacerSm,
  spacerLg,
];

export function getSection(id: string): SectionDef | null {
  return SECTION_LIBRARY.find((s) => s.id === id) ?? null;
}

import { nextBlockId } from "~/lib/blocks";

export function cloneSectionBlocks(section: SectionDef): Block[] {
  return section.blocks.map((b) => ({ ...b, id: nextBlockId() } as Block));
}
