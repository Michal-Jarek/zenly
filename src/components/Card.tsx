import type { ReactNode } from "react";

/** White rounded surface used across the app (matches the mockup cards). */
export function Card({
  children,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  return (
    <As className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>{children}</As>
  );
}
