import {
  PrismaClient,
  PasmoCzasu,
  PoziomStresu,
  Rola,
  TypModulu,
} from "@prisma/client";
import bcrypt from "bcryptjs";

// Full, idempotent seed (upsert by stable keys/ids) — safe to re-run on every container start.
const prisma = new PrismaClient();

// Shared demo password. Meets the future password policy (>=12 chars; lower/upper/digit/special),
// so seeded accounts stay loginable after step 4. Listed in the README (step 8).
const DEMO_PASSWORD = "Zenly!Demo2026#Pass";
const BCRYPT_COST = 10;

const ANKIETA_ID = "seed-ankieta-stres-v1";

// Survey questions 1:1 from the plan (kolejnosc 1..10), scale 1..5.
const SURVEY_QUESTIONS = [
  "Czułem/am się przytłoczony/a ilością obowiązków w pracy.",
  "Miałem/am trudność z odprężeniem się po zakończeniu pracy.",
  "Odczuwałem/am napięcie lub zdenerwowanie bez wyraźnego powodu.",
  "Miałem/am poczucie utraty kontroli nad ważnymi sprawami zawodowymi.",
  "Czułem/am presję czasu podczas wykonywania codziennych zadań.",
  "Miałem/am trudności ze skupieniem się na pracy.",
  "Reagowałem/am bardziej emocjonalnie niż zwykle (np. irytacją, frustracją).",
  "Czułem/am zmęczenie psychiczne mimo niewielkiego wysiłku.",
  "Miałem/am poczucie, że wymagania wobec mnie przekraczają moje możliwości.",
  "Odczuwałem/am stres związany z pracą nawet po godzinach.",
];

// RB-09 thresholds: <=10 LOW / 11-20 MEDIUM / >20 HIGH.
function levelFor(sum: number): PoziomStresu {
  if (sum <= 10) return "LOW";
  if (sum <= 20) return "MEDIUM";
  return "HIGH";
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function plusMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const hasloHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);

  // --- Users (admin, HR, psychologist, two employees) ---
  const userData: {
    login: string;
    email: string;
    imie: string;
    nazwisko: string;
    rola: Rola;
  }[] = [
    {
      login: "admin",
      email: "admin@zenly.local",
      imie: "Anna",
      nazwisko: "Adminowska",
      rola: "ADMIN",
    },
    {
      login: "hr",
      email: "hr@zenly.local",
      imie: "Halina",
      nazwisko: "Rekrutacka",
      rola: "HR",
    },
    {
      login: "psycholog1",
      email: "psycholog1@zenly.local",
      imie: "Piotr",
      nazwisko: "Kojarski",
      rola: "PSYCHOLOGIST",
    },
    {
      login: "pracownik1",
      email: "pracownik1@zenly.local",
      imie: "Ewa",
      nazwisko: "Kowalska",
      rola: "EMPLOYEE",
    },
    {
      login: "pracownik2",
      email: "pracownik2@zenly.local",
      imie: "Marek",
      nazwisko: "Nowak",
      rola: "EMPLOYEE",
    },
  ];

  const userIds: Record<string, string> = {};
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { login: u.login },
      update: {
        imie: u.imie,
        nazwisko: u.nazwisko,
        email: u.email,
        rola: u.rola,
        hasloHash,
      },
      create: {
        login: u.login,
        email: u.email,
        imie: u.imie,
        nazwisko: u.nazwisko,
        rola: u.rola,
        hasloHash,
      },
    });
    userIds[u.login] = user.id;
  }

  // --- Survey + 10 questions ---
  const ankieta = await prisma.ankieta.upsert({
    where: { id: ANKIETA_ID },
    update: { tytul: "Ankieta poziomu stresu", aktywna: true, wersja: 1 },
    create: {
      id: ANKIETA_ID,
      tytul: "Ankieta poziomu stresu",
      aktywna: true,
      wersja: 1,
    },
  });

  const pytaniaIds: string[] = [];
  for (let i = 0; i < SURVEY_QUESTIONS.length; i++) {
    const kolejnosc = i + 1;
    const pytanie = await prisma.pytanie.upsert({
      where: { ankietaId_kolejnosc: { ankietaId: ankieta.id, kolejnosc } },
      update: { tresc: SURVEY_QUESTIONS[i] },
      create: { ankietaId: ankieta.id, kolejnosc, tresc: SURVEY_QUESTIONS[i] },
    });
    pytaniaIds.push(pytanie.id);
  }

  // --- 4 psychologists; #1 is linked to the PSYCHOLOGIST user (demo RBAC) ---
  const psychologSpec: {
    id: string;
    imie: string;
    nazwisko: string;
    telefon: string;
    specjalizacja: string;
    userId: string | null;
  }[] = [
    {
      id: "seed-psy-1",
      imie: "Piotr",
      nazwisko: "Kojarski",
      telefon: "+48 600 100 001",
      specjalizacja: "Stres zawodowy i wypalenie",
      userId: userIds["psycholog1"],
    },
    {
      id: "seed-psy-2",
      imie: "Katarzyna",
      nazwisko: "Zielińska",
      telefon: "+48 600 100 002",
      specjalizacja: "Terapia poznawczo-behawioralna",
      userId: null,
    },
    {
      id: "seed-psy-3",
      imie: "Tomasz",
      nazwisko: "Wójcik",
      telefon: "+48 600 100 003",
      specjalizacja: "Mindfulness i zarządzanie stresem",
      userId: null,
    },
    {
      id: "seed-psy-4",
      imie: "Magdalena",
      nazwisko: "Lewandowska",
      telefon: "+48 600 100 004",
      specjalizacja: "Równowaga praca–życie",
      userId: null,
    },
  ];

  for (const p of psychologSpec) {
    const linkDoSpotkania = `https://meet.zenly.local/${p.id}`;
    await prisma.psycholog.upsert({
      where: { id: p.id },
      update: {
        imie: p.imie,
        nazwisko: p.nazwisko,
        telefon: p.telefon,
        specjalizacja: p.specjalizacja,
        linkDoSpotkania,
        userId: p.userId,
      },
      create: {
        id: p.id,
        imie: p.imie,
        nazwisko: p.nazwisko,
        telefon: p.telefon,
        specjalizacja: p.specjalizacja,
        linkDoSpotkania,
        userId: p.userId,
      },
    });
    await prisma.kalendarz.upsert({
      where: { psychologId: p.id },
      update: {},
      create: { id: `seed-kal-${p.id}`, psychologId: p.id },
    });
  }

  // --- Slots: 3 free future slots per psychologist + one occupied slot on #1 ---
  for (const p of psychologSpec) {
    const kalendarzId = `seed-kal-${p.id}`;
    for (let s = 1; s <= 3; s++) {
      const poczatek = daysAgo(-s);
      poczatek.setHours(9 + s * 2, 0, 0, 0);
      const termin = {
        kalendarzId,
        poczatek,
        koniec: plusMinutes(poczatek, 55),
        zajety: false,
      };
      await prisma.termin.upsert({
        where: { id: `seed-term-${p.id}-${s}` },
        update: termin,
        create: { id: `seed-term-${p.id}-${s}`, ...termin },
      });
    }
  }
  {
    const p = psychologSpec[0];
    const kalendarzId = `seed-kal-${p.id}`;
    const poczatek = daysAgo(-1);
    poczatek.setHours(17, 0, 0, 0);
    const busy = {
      kalendarzId,
      poczatek,
      koniec: plusMinutes(poczatek, 55),
      zajety: true,
    };
    await prisma.termin.upsert({
      where: { id: `seed-term-${p.id}-busy` },
      update: busy,
      create: { id: `seed-term-${p.id}-busy`, ...busy },
    });
  }

  // --- Content modules: exactly 4 (no KONSULTACJA record — that is a route/CTA) ---
  const moduly: { typ: TypModulu; tytul: string; opis: string }[] = [
    {
      typ: "ODDECH",
      tytul: "Ćwiczenia oddechowe",
      opis: "Krótkie techniki oddechowe redukujące napięcie.",
    },
    {
      typ: "MEDYTACJA",
      tytul: "Medytacje prowadzone",
      opis: "Nagrania medytacji uważności i relaksacji.",
    },
    {
      typ: "CWICZENIA",
      tytul: "Ćwiczenia relaksacyjne",
      opis: "Ćwiczenia fizyczne rozładowujące stres.",
    },
    {
      typ: "MUZYKA",
      tytul: "Muzyka relaksacyjna",
      opis: "Radio internetowe z muzyką wyciszającą.",
    },
  ];

  const modulIdByTyp: Record<string, string> = {};
  for (const m of moduly) {
    const modul = await prisma.modul.upsert({
      where: { typ: m.typ },
      update: { tytul: m.tytul, opis: m.opis },
      create: { typ: m.typ, tytul: m.tytul, opis: m.opis },
    });
    modulIdByTyp[m.typ] = modul.id;
  }

  // ODDECH / MEDYTACJA / CWICZENIA: 10 resources each (5 short + 5 long), placeholder YouTube links.
  const contentTypes: TypModulu[] = ["ODDECH", "MEDYTACJA", "CWICZENIA"];
  for (const typ of contentTypes) {
    const modulId = modulIdByTyp[typ];
    for (let i = 1; i <= 10; i++) {
      const pasmo: PasmoCzasu = i <= 5 ? "SHORT_5_10" : "LONG_15_30";
      const minuty = pasmo === "SHORT_5_10" ? "5–10 min" : "15–30 min";
      const zasob = {
        modulId,
        etykieta: `${typ} — nagranie ${i} (${minuty})`,
        url: `https://www.youtube.com/watch?v=zenly-${typ.toLowerCase()}-${i}`,
        pasmo,
      };
      await prisma.modulZasob.upsert({
        where: { id: `seed-zasob-${typ}-${i}` },
        update: zasob,
        create: { id: `seed-zasob-${typ}-${i}`, ...zasob },
      });
    }
  }
  // MUZYKA: one internet-radio resource (placeholder stream URL).
  {
    const radio = {
      modulId: modulIdByTyp["MUZYKA"],
      etykieta: "Radio relaksacyjne Zenly",
      url: "https://stream.zenly.local/relaks",
      pasmo: "LONG_15_30" as PasmoCzasu,
    };
    await prisma.modulZasob.upsert({
      where: { id: "seed-zasob-MUZYKA-1" },
      update: radio,
      create: { id: "seed-zasob-MUZYKA-1", ...radio },
    });
  }

  // --- Time-dependent survey results (computed from now) ---
  async function seedResult(
    id: string,
    userId: string,
    answers: number[],
    dataWypelnienia: Date,
  ) {
    const sumaPunktow = answers.reduce((a, b) => a + b, 0);
    const poziomStresu = levelFor(sumaPunktow);
    await prisma.wynikAnkiety.upsert({
      where: { id },
      update: {
        userId,
        ankietaId: ANKIETA_ID,
        sumaPunktow,
        poziomStresu,
        dataWypelnienia,
      },
      create: {
        id,
        userId,
        ankietaId: ANKIETA_ID,
        sumaPunktow,
        poziomStresu,
        dataWypelnienia,
      },
    });
    for (let i = 0; i < answers.length; i++) {
      const pytanieId = pytaniaIds[i];
      await prisma.odpowiedz.upsert({
        where: { wynikAnkietyId_pytanieId: { wynikAnkietyId: id, pytanieId } },
        update: { wartosc: answers[i] },
        create: { wynikAnkietyId: id, pytanieId, wartosc: answers[i] },
      });
    }
  }

  const low = Array(10).fill(1); // sum 10 -> LOW
  const medium = [2, 2, 2, 2, 2, 2, 2, 2, 1, 1]; // sum 18 -> MEDIUM
  const high = Array(10).fill(4); // sum 40 -> HIGH

  // pracownik1: a single result older than one month -> demonstrates a required (overdue) survey.
  await seedResult(
    "seed-wynik-pracownik1-1",
    userIds["pracownik1"],
    medium,
    daysAgo(40),
  );

  // pracownik2: three results over time (rising) -> demonstrates the stress trend.
  await seedResult(
    "seed-wynik-pracownik2-1",
    userIds["pracownik2"],
    low,
    daysAgo(60),
  );
  await seedResult(
    "seed-wynik-pracownik2-2",
    userIds["pracownik2"],
    medium,
    daysAgo(30),
  );
  await seedResult(
    "seed-wynik-pracownik2-3",
    userIds["pracownik2"],
    high,
    daysAgo(2),
  );

  console.log(
    `[seed] users=${userData.length} psychologs=${psychologSpec.length} pytania=${pytaniaIds.length} ` +
      `moduly=${moduly.length} (ODDECH/MEDYTACJA/CWICZENIA x10 + MUZYKA x1) wyniki=4`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
