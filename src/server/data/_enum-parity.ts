// Compile-time guard: the domain-local enum unions (src/server/domain/types.ts) must stay
// 1:1 with the Prisma enums. The domain cannot import @prisma/client, so the check lives here
// in the data layer. A schema change that drifts from a domain union breaks the build instead
// of silently corrupting the identity mapping at the data/service boundary. Type-only — no runtime.
import type { $Enums } from "@prisma/client";
import type {
  PoziomStresu,
  TypModulu,
  Rola,
  TypPowiadomienia,
} from "@/server/domain/types";

type Equal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Expect<T extends true> = T;

export type AssertPoziomStresu = Expect<Equal<PoziomStresu, $Enums.PoziomStresu>>;
export type AssertTypModulu = Expect<Equal<TypModulu, $Enums.TypModulu>>;
export type AssertRola = Expect<Equal<Rola, $Enums.Rola>>;
export type AssertTypPowiadomienia = Expect<Equal<TypPowiadomienia, $Enums.TypPowiadomienia>>;
