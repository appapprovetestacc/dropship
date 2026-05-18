import type { Template } from "./types";

export const landingTemplate: Template = {
  id: "landing",
  name: "Landing",
  description: "Hero, feature columns, testimonial, and a primary call-to-action.",
  thumbnail:
    "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  blocks: [
    { id: "landing-heading", type: "heading", level: 1, text: "Built for your next launch", align: "center" },
    {
      id: "landing-body",
      type: "body",
      text: "Pair a clear promise with a focused offer. Two short sentences convert better than one long paragraph.",
    },
    {
      id: "landing-cta-1",
      type: "cta",
      text: "Shop the collection",
      url: "/collections/all",
      style: "primary",
      align: "center",
    },
    { id: "landing-spacer-1", type: "spacer", size: "lg" },
    {
      id: "landing-features",
      type: "columns",
      columns: [
        { heading: "Fast shipping", body: "Orders placed before 2pm ship the same day.", icon: "🚚" },
        { heading: "Return-friendly", body: "30-day no-questions-asked return window.", icon: "↩" },
        { heading: "Made well", body: "Sourced from small workshops we visit in person.", icon: "✨" },
      ],
    },
    { id: "landing-spacer-2", type: "spacer", size: "md" },
    {
      id: "landing-testimonial",
      type: "body",
      text: "<em>“The fit and finish exceeded what I expected at this price point.”</em> — Recent customer",
    },
    { id: "landing-spacer-3", type: "spacer", size: "md" },
    {
      id: "landing-cta-2",
      type: "cta",
      text: "Start shopping",
      url: "/collections/all",
      style: "primary",
      align: "center",
    },
  ],
};
