"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { registerAction } from "@/server/actions/auth.actions";
import type { ActionError } from "@/lib/action-result";
import { registerFormSchema, type RegisterFormValues } from "@/lib/validation/auth";

const FIELDS = [
  { name: "imie", label: "Imię", type: "text", autoComplete: "given-name" },
  { name: "nazwisko", label: "Nazwisko", type: "text", autoComplete: "family-name" },
  { name: "login", label: "Nazwa (login)", type: "text", autoComplete: "username" },
  { name: "email", label: "E-mail", type: "email", autoComplete: "email" },
  { name: "haslo", label: "Hasło", type: "password", autoComplete: "new-password" },
] as const;

export function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerFormSchema) });
  const [serverError, setServerError] = useState<ActionError | null>(null);
  const [pending, startTransition] = useTransition();

  function onValid(values: RegisterFormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = await registerAction(values);
      if (!res.ok) setServerError(res.error);
      // on success the action redirects to /login
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onValid)}
      noValidate
      className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm"
    >
      {serverError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {serverError.message}
        </p>
      )}
      <div className="flex flex-col gap-4">
        {FIELDS.map((f) => (
          <div key={f.name}>
            <label className="mb-1 block text-sm font-medium" htmlFor={f.name}>
              {f.label}
            </label>
            <input
              id={f.name}
              type={f.type}
              autoComplete={f.autoComplete}
              aria-invalid={Boolean(errors[f.name])}
              {...register(f.name)}
              className="w-full rounded-full border border-neutral-300 px-5 py-3"
            />
            {errors[f.name] && (
              <p className="mt-1 text-xs text-red-600">{errors[f.name]?.message}</p>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Hasło: min. 12 znaków, w tym wielka i mała litera, cyfra oraz znak specjalny.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Tworzenie konta…" : "Zarejestruj się"}
      </button>

      <p className="mt-5 text-center text-sm text-neutral-500">
        Masz już konto?{" "}
        <Link href="/login" className="underline">
          Zaloguj się
        </Link>
      </p>
    </form>
  );
}
