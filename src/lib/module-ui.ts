import type { TypModulu } from "@/server/domain/types";

/** Navigation view of a recommended module type: label, emoji and target route. */
export type ModuleNav = { label: string; emoji: string; href: string };

/**
 * Map each module/consultation type to a label, emoji and route. KONSULTACJA is a call-to-action
 * pointing at `/konsultacja` (it has no content module), the other four point at their pages.
 */
export const MODULE_NAV: Record<TypModulu, ModuleNav> = {
  ODDECH: { label: "Ćwiczenia oddechowe", emoji: "🌿", href: "/oddech" },
  MEDYTACJA: { label: "Medytacja", emoji: "🧘", href: "/medytacja" },
  MUZYKA: { label: "Muzyka relaksacyjna", emoji: "🎧", href: "/muzyka" },
  CWICZENIA: { label: "Ćwiczenia fizyczne", emoji: "🏃", href: "/cwiczenia" },
  KONSULTACJA: { label: "Umów konsultację", emoji: "💬", href: "/konsultacja" },
};
