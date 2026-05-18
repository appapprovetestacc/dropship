import type { Template } from "./types";

export const aboutTemplate: Template = {
  id: "about",
  name: "About",
  description: "Mission, story, and the team behind the store.",
  thumbnail:
    "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  blocks: [
    { id: "about-heading", type: "heading", level: 1, text: "About us", align: "left" },
    {
      id: "about-mission",
      type: "body",
      text: "We started in 2019 with a question: why are everyday objects so hard to love? We make pieces designed to outlast the next trend cycle.",
    },
    {
      id: "about-image",
      type: "image",
      src: "",
      alt: "Photo of the workshop",
      caption: "Inside our workshop in Lisbon.",
    },
    { id: "about-h2", type: "heading", level: 2, text: "What we believe" },
    {
      id: "about-values",
      type: "columns",
      columns: [
        { heading: "Built to last", body: "Materials chosen for decades of use, not seasons." },
        { heading: "Honest pricing", body: "No retail markup theater — clear costs, fair margins." },
        { heading: "Made with care", body: "We know every maker we work with by name." },
      ],
    },
    { id: "about-team-h", type: "heading", level: 2, text: "The team" },
    {
      id: "about-team",
      type: "columns",
      columns: [
        { heading: "Asha — Founder", body: "Designs every piece. Reachable at hello@example.com." },
        { heading: "Marek — Production", body: "Translates Asha's sketches into runnable tech-packs." },
        { heading: "Liu — Customer care", body: "Answers every email within one business day." },
      ],
    },
  ],
};
