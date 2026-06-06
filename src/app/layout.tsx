import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Zenly",
  description: "Aplikacja do interwencji psychologicznych przeciw stresowi w pracy",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-neutral-100 text-neutral-900 antialiased font-sans">{children}</body>
    </html>
  );
}
