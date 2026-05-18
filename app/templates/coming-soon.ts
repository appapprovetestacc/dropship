import type { Template } from "./types";

// 14-day countdown from today by default. The editor exposes this as a
// `targetIso` field on the countdown block, so customers retarget it.
function fortnightFromNow(): string {
  const t = new Date();
  t.setUTCDate(t.getUTCDate() + 14);
  t.setUTCHours(12, 0, 0, 0);
  return t.toISOString();
}

export const comingSoonTemplate: Template = {
  id: "coming-soon",
  name: "Coming Soon",
  description: "Countdown timer plus an email capture form for launch updates.",
  thumbnail:
    "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png",
  blocks: [
    { id: "coming-heading", type: "heading", level: 1, text: "Launching soon", align: "center" },
    {
      id: "coming-body",
      type: "body",
      text: "We're putting the finishing touches on something we're proud of. Drop your email to get a heads-up the moment it goes live.",
    },
    {
      id: "coming-countdown",
      type: "countdown",
      targetIso: fortnightFromNow(),
      expiredMessage: "We're live — thanks for waiting.",
    },
    {
      id: "coming-form",
      type: "form",
      heading: "Get the launch notice",
      fields: [{ name: "email", label: "Email", type: "email", required: true }],
      submitLabel: "Notify me",
      successMessage: "You're on the list — talk soon.",
    },
  ],
};
