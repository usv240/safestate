import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "SafeState — recalls, made executable",
  description:
    "Transaction-time safety authorization for secondhand products, built on Amazon Aurora DSQL.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900">
        <Nav />
        {children}
      </body>
    </html>
  );
}
