import type { Template } from "./types";

export const productSpotlightTemplate: Template = {
  id: "product-spotlight",
  name: "Product Spotlight",
  description: "Full-bleed image, product story, and a buy-now call-to-action.",
  thumbnail:
    "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  blocks: [
    {
      id: "spotlight-image",
      type: "image",
      src: "",
      alt: "Product hero image",
    },
    { id: "spotlight-heading", type: "heading", level: 1, text: "The everyday carry, rethought", align: "center" },
    {
      id: "spotlight-body",
      type: "body",
      text: "Vegetable-tanned leather, brass hardware, and a layout that holds the things you actually carry. Two years of prototyping went into the pocket map.",
    },
    {
      id: "spotlight-features",
      type: "columns",
      columns: [
        { heading: "Materials", body: "Full-grain leather, solid brass." },
        { heading: "Made in", body: "Florence, Italy" },
        { heading: "Warranty", body: "Five-year repair coverage." },
      ],
    },
    {
      id: "spotlight-cta",
      type: "cta",
      text: "Add to cart — $189",
      url: "/products/everyday-carry",
      style: "primary",
      align: "center",
    },
    { id: "spotlight-h2", type: "heading", level: 2, text: "Customers also viewed" },
    {
      id: "spotlight-related",
      type: "columns",
      columns: [
        { heading: "Cardholder", body: "$48" },
        { heading: "Belt", body: "$120" },
        { heading: "Keyring", body: "$32" },
      ],
    },
  ],
};
