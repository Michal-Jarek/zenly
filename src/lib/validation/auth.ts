import { z } from "zod";

// Client-side form schemas (instant validation). The server actions remain the source of truth:
// the password policy mirrors the domain `validatePasswordStrength` (RB-01).

export const loginFormSchema = z.object({
  login: z.string().min(1, "Podaj login."),
  haslo: z.string().min(1, "Podaj hasło."),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  imie: z.string().min(1, "Podaj imię."),
  nazwisko: z.string().min(1, "Podaj nazwisko."),
  login: z.string().min(3, "Login musi mieć min. 3 znaki."),
  email: z.string().email("Nieprawidłowy adres e-mail."),
  haslo: z
    .string()
    .min(12, "Hasło musi mieć min. 12 znaków.")
    .regex(/[a-z]/, "Hasło musi zawierać małą literę.")
    .regex(/[A-Z]/, "Hasło musi zawierać wielką literę.")
    .regex(/[0-9]/, "Hasło musi zawierać cyfrę.")
    .regex(/[^A-Za-z0-9]/, "Hasło musi zawierać znak specjalny."),
});
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
