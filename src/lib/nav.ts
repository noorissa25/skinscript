import type { Messages } from "@/i18n/messages";

type NavKey = keyof Pick<Messages["nav"], "check" | "ingredients" | "conflicts" | "how" | "faq"> | "community";

export const NAV: { href: string; key: NavKey }[] = [
  { href: "#check", key: "check" },
  { href: "#ingredients", key: "ingredients" },
  { href: "#conflicts", key: "conflicts" },
  { href: "#community", key: "community" },
  { href: "#how", key: "how" },
  { href: "#faq", key: "faq" },
];

export function navLabel(t: Messages, key: NavKey) {
  return key === "community" ? t.community.nav : t.nav[key];
}
