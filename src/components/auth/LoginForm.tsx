"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { loginAction } from "@/server/actions/auth.actions";
import type { ActionError } from "@/lib/action-result";
import { loginFormSchema, type LoginFormValues } from "@/lib/validation/auth";

export function LoginForm({ from }: { from?: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });
  const [serverError, setServerError] = useState<ActionError | null>(null);
  const [pending, startTransition] = useTransition();

  function onValid(values: LoginFormValues) {
    setServerError(null);
    startTransition(async () => {
      const res = await loginAction({ ...values, from });
      if (!res.ok) setServerError(res.error);
      // on success the action redirects (to `from` when safe, else /dashboard)
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
        <div>
          <label className="sr-only" htmlFor="login">
            Nazwa
          </label>
          <input
            id="login"
            autoComplete="username"
            placeholder="Nazwa"
            aria-invalid={Boolean(errors.login)}
            {...register("login")}
            className="w-full rounded-full border border-neutral-300 px-5 py-3"
          />
          {errors.login && (
            <p className="mt-1 text-xs text-red-600">{errors.login.message}</p>
          )}
        </div>
        <div>
          <label className="sr-only" htmlFor="haslo">
            Hasło
          </label>
          <input
            id="haslo"
            type="password"
            autoComplete="current-password"
            placeholder="Hasło"
            aria-invalid={Boolean(errors.haslo)}
            {...register("haslo")}
            className="w-full rounded-full border border-neutral-300 px-5 py-3"
          />
          {errors.haslo && (
            <p className="mt-1 text-xs text-red-600">{errors.haslo.message}</p>
          )}
          <div className="mt-2 text-right">
            <Link href="#" className="text-sm text-neutral-500 underline">
              Nie pamiętasz hasła?
            </Link>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Logowanie…" : "Zaloguj się"}
      </button>

      <p className="mt-5 text-center text-sm text-neutral-500">
        Nie masz konta?{" "}
        <Link href="/rejestracja" className="underline">
          Zarejestruj się
        </Link>
      </p>
    </form>
  );
}
