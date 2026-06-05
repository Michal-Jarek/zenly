/*
  Warnings:

  - Added the required column `imie` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nazwisko` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Rola" AS ENUM ('EMPLOYEE', 'PSYCHOLOGIST', 'ADMIN', 'HR');

-- CreateEnum
CREATE TYPE "PoziomStresu" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "TypModulu" AS ENUM ('ODDECH', 'MEDYTACJA', 'MUZYKA', 'CWICZENIA', 'KONSULTACJA');

-- CreateEnum
CREATE TYPE "PasmoCzasu" AS ENUM ('SHORT_5_10', 'LONG_15_30');

-- CreateEnum
CREATE TYPE "StatusWizyty" AS ENUM ('ZAREZERWOWANA', 'ODBYTA', 'ANULOWANA');

-- CreateEnum
CREATE TYPE "TypPowiadomienia" AS ENUM ('ANKIETA_PRZYPOMNIENIE', 'KONSULTACJA_POTWIERDZENIE', 'PRZERWA', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TypZdarzenia" AS ENUM ('LOGOWANIE_OK', 'LOGOWANIE_BLAD', 'KONTO_ZABLOKOWANE', 'REJESTRACJA', 'RODO_EKSPORT', 'RODO_USUNIECIE', 'DOSTEP_ODMOWA');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "imie" TEXT NOT NULL,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "nazwisko" TEXT NOT NULL,
ADD COLUMN     "rola" "Rola" NOT NULL DEFAULT 'EMPLOYEE',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Psycholog" (
    "id" TEXT NOT NULL,
    "imie" TEXT NOT NULL,
    "nazwisko" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "linkDoSpotkania" TEXT NOT NULL,
    "specjalizacja" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Psycholog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kalendarz" (
    "id" TEXT NOT NULL,
    "psychologId" TEXT NOT NULL,

    CONSTRAINT "Kalendarz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Termin" (
    "id" TEXT NOT NULL,
    "kalendarzId" TEXT NOT NULL,
    "poczatek" TIMESTAMP(3) NOT NULL,
    "koniec" TIMESTAMP(3) NOT NULL,
    "zajety" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Termin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wizyta" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "psychologId" TEXT NOT NULL,
    "terminId" TEXT NOT NULL,
    "status" "StatusWizyty" NOT NULL DEFAULT 'ZAREZERWOWANA',
    "linkDoSpotkania" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wizyta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ankieta" (
    "id" TEXT NOT NULL,
    "tytul" TEXT NOT NULL,
    "wersja" INTEGER NOT NULL DEFAULT 1,
    "aktywna" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ankieta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pytanie" (
    "id" TEXT NOT NULL,
    "ankietaId" TEXT NOT NULL,
    "tresc" TEXT NOT NULL,
    "kolejnosc" INTEGER NOT NULL,

    CONSTRAINT "Pytanie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WynikAnkiety" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ankietaId" TEXT NOT NULL,
    "sumaPunktow" INTEGER NOT NULL,
    "poziomStresu" "PoziomStresu" NOT NULL,
    "dataWypelnienia" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WynikAnkiety_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Odpowiedz" (
    "id" TEXT NOT NULL,
    "wynikAnkietyId" TEXT NOT NULL,
    "pytanieId" TEXT NOT NULL,
    "wartosc" INTEGER NOT NULL,

    CONSTRAINT "Odpowiedz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Modul" (
    "id" TEXT NOT NULL,
    "typ" "TypModulu" NOT NULL,
    "tytul" TEXT NOT NULL,
    "opis" TEXT NOT NULL,

    CONSTRAINT "Modul_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModulZasob" (
    "id" TEXT NOT NULL,
    "modulId" TEXT NOT NULL,
    "etykieta" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "pasmo" "PasmoCzasu" NOT NULL,

    CONSTRAINT "ModulZasob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Powiadomienie" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "typ" "TypPowiadomienia" NOT NULL,
    "tresc" TEXT NOT NULL,
    "przeczytane" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Powiadomienie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesjaUzytkownika" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "poczatek" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "koniec" TIMESTAMP(3),
    "wygasa" TIMESTAMP(3) NOT NULL,
    "ostatniaAktywnosc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ostatniaPrzerwa" TIMESTAMP(3),
    "ip" TEXT,

    CONSTRAINT "SesjaUzytkownika_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "typ" "TypZdarzenia" NOT NULL,
    "opis" TEXT NOT NULL,
    "login" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Psycholog_userId_key" ON "Psycholog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Kalendarz_psychologId_key" ON "Kalendarz"("psychologId");

-- CreateIndex
CREATE INDEX "Termin_kalendarzId_poczatek_idx" ON "Termin"("kalendarzId", "poczatek");

-- CreateIndex
CREATE UNIQUE INDEX "Wizyta_terminId_key" ON "Wizyta"("terminId");

-- CreateIndex
CREATE UNIQUE INDEX "Pytanie_ankietaId_kolejnosc_key" ON "Pytanie"("ankietaId", "kolejnosc");

-- CreateIndex
CREATE INDEX "WynikAnkiety_userId_dataWypelnienia_idx" ON "WynikAnkiety"("userId", "dataWypelnienia");

-- CreateIndex
CREATE UNIQUE INDEX "Odpowiedz_wynikAnkietyId_pytanieId_key" ON "Odpowiedz"("wynikAnkietyId", "pytanieId");

-- CreateIndex
CREATE UNIQUE INDEX "Modul_typ_key" ON "Modul"("typ");

-- CreateIndex
CREATE INDEX "Powiadomienie_userId_przeczytane_idx" ON "Powiadomienie"("userId", "przeczytane");

-- CreateIndex
CREATE UNIQUE INDEX "SesjaUzytkownika_token_key" ON "SesjaUzytkownika"("token");

-- CreateIndex
CREATE INDEX "SesjaUzytkownika_userId_idx" ON "SesjaUzytkownika"("userId");

-- CreateIndex
CREATE INDEX "SecurityEvent_typ_createdAt_idx" ON "SecurityEvent"("typ", "createdAt");

-- AddForeignKey
ALTER TABLE "Psycholog" ADD CONSTRAINT "Psycholog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Kalendarz" ADD CONSTRAINT "Kalendarz_psychologId_fkey" FOREIGN KEY ("psychologId") REFERENCES "Psycholog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Termin" ADD CONSTRAINT "Termin_kalendarzId_fkey" FOREIGN KEY ("kalendarzId") REFERENCES "Kalendarz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wizyta" ADD CONSTRAINT "Wizyta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wizyta" ADD CONSTRAINT "Wizyta_psychologId_fkey" FOREIGN KEY ("psychologId") REFERENCES "Psycholog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wizyta" ADD CONSTRAINT "Wizyta_terminId_fkey" FOREIGN KEY ("terminId") REFERENCES "Termin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pytanie" ADD CONSTRAINT "Pytanie_ankietaId_fkey" FOREIGN KEY ("ankietaId") REFERENCES "Ankieta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WynikAnkiety" ADD CONSTRAINT "WynikAnkiety_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WynikAnkiety" ADD CONSTRAINT "WynikAnkiety_ankietaId_fkey" FOREIGN KEY ("ankietaId") REFERENCES "Ankieta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odpowiedz" ADD CONSTRAINT "Odpowiedz_wynikAnkietyId_fkey" FOREIGN KEY ("wynikAnkietyId") REFERENCES "WynikAnkiety"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Odpowiedz" ADD CONSTRAINT "Odpowiedz_pytanieId_fkey" FOREIGN KEY ("pytanieId") REFERENCES "Pytanie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModulZasob" ADD CONSTRAINT "ModulZasob_modulId_fkey" FOREIGN KEY ("modulId") REFERENCES "Modul"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Powiadomienie" ADD CONSTRAINT "Powiadomienie_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesjaUzytkownika" ADD CONSTRAINT "SesjaUzytkownika_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
