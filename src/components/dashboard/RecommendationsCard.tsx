import Link from "next/link";
import type { TypModulu } from "@/server/domain/types";
import { MODULE_NAV } from "@/lib/module-ui";
import { Card } from "@/components/Card";

/**
 * "Zalecenia na dziś" — links each recommended type to its route. KONSULTACJA is a CTA to
 * /konsultacja (no content module); the card never fetches modules.
 */
export function RecommendationsCard({ typy }: { typy: TypModulu[] }) {
  return (
    <Card>
      <h2 className="text-xl font-semibold">Zalecenia na dziś:</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {typy.map((typ) => {
          const nav = MODULE_NAV[typ];
          return (
            <li key={typ}>
              <Link
                href={nav.href}
                className="flex items-center gap-3 text-lg hover:underline"
              >
                <span aria-hidden="true" className="text-2xl">
                  {nav.emoji}
                </span>
                <span>{nav.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
