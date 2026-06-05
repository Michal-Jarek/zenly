// Domain-local enum unions. Values are 1:1 with the Prisma enums, so mapping at the
// data/service boundary is identity. The domain must NOT import @prisma/client (ESLint).

/** Stress level derived from a survey score (RB-09). Mirrors Prisma `PoziomStresu`. */
export type PoziomStresu = "LOW" | "MEDIUM" | "HIGH";

/** Intervention module / consultation type. Mirrors Prisma `TypModulu`. */
export type TypModulu = "ODDECH" | "MEDYTACJA" | "MUZYKA" | "CWICZENIA" | "KONSULTACJA";

/** User role. Mirrors Prisma `Rola`. */
export type Rola = "EMPLOYEE" | "PSYCHOLOGIST" | "ADMIN" | "HR";

/** Notification category. Mirrors Prisma `TypPowiadomienia`. */
export type TypPowiadomienia =
  | "ANKIETA_PRZYPOMNIENIE"
  | "KONSULTACJA_POTWIERDZENIE"
  | "PRZERWA"
  | "SYSTEM";
