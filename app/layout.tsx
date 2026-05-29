import type { Metadata } from "next";
import "./globals.css";
import "./gumroad-dark.css";

export const metadata: Metadata = {
  title: "Throughline — ask your team's shared memory",
  description:
    "Your agents do the work; Throughline remembers it. Ask the workspace anything in plain English and get a sourced answer. Powered by XTrace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
