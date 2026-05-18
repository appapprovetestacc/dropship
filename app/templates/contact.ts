import type { Template } from "./types";

export const contactTemplate: Template = {
  id: "contact",
  name: "Contact",
  description: "Inquiry form, business hours, and location details.",
  thumbnail:
    "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  blocks: [
    { id: "contact-heading", type: "heading", level: 1, text: "Get in touch", align: "left" },
    {
      id: "contact-intro",
      type: "body",
      text: "Send us a message and we'll reply within one business day.",
    },
    {
      id: "contact-form",
      type: "form",
      heading: "Send a message",
      fields: [
        { name: "name", label: "Your name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "message", label: "How can we help?", type: "textarea", required: true },
      ],
      submitLabel: "Send message",
      successMessage: "Thanks — we'll reply within one business day.",
    },
    { id: "contact-spacer", type: "spacer", size: "md" },
    {
      id: "contact-details",
      type: "columns",
      columns: [
        { heading: "Hours", body: "Mon–Fri, 9am to 5pm CET" },
        { heading: "Email", body: "hello@example.com" },
        { heading: "Phone", body: "+1 (555) 010-0123" },
      ],
    },
  ],
};
