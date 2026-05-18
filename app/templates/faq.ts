import type { Template } from "./types";

export const faqTemplate: Template = {
  id: "faq",
  name: "FAQ",
  description: "Accordion of common questions, grouped by category.",
  thumbnail:
    "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  blocks: [
    { id: "faq-heading", type: "heading", level: 1, text: "Frequently asked questions" },
    {
      id: "faq-list",
      type: "accordion",
      items: [
        {
          category: "Shipping",
          question: "How long does delivery take?",
          answer: "Most orders arrive within 3–5 business days inside the EU and 7–10 days elsewhere.",
        },
        {
          category: "Shipping",
          question: "Do you ship to my country?",
          answer: "We ship to 47 countries. The checkout will confirm availability for your address.",
        },
        {
          category: "Returns",
          question: "What is your return policy?",
          answer: "Return any unused item within 30 days for a full refund — we'll cover the return label.",
        },
        {
          category: "Returns",
          question: "How do I exchange an item?",
          answer: "Email hello@example.com with your order number — we'll send a prepaid exchange label.",
        },
        {
          category: "Product",
          question: "How should I care for the leather?",
          answer: "Wipe with a dry cloth. Once a year, apply a thin layer of leather conditioner.",
        },
      ],
    },
    {
      id: "faq-cta",
      type: "cta",
      text: "Contact support",
      url: "/pages/contact",
      style: "secondary",
      align: "left",
    },
  ],
};
