import { z } from "zod";

// Profile edit (RODO rectification). Client-side form schema; the server action re-parses it and
// the `email @unique` constraint (+ lowercase normalization in the service) is the real guarantee.

export const updateProfileFormSchema = z.object({
  imie: z.string().min(1, "Podaj imię."),
  nazwisko: z.string().min(1, "Podaj nazwisko."),
  email: z.string().email("Nieprawidłowy adres e-mail."),
});
export type UpdateProfileFormValues = z.infer<typeof updateProfileFormSchema>;
