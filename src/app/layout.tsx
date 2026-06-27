import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { PageBack } from "@/components/PageBack";
import { Footer } from "@/components/Footer";

const description =
  "Transaction-time safety authorization for secondhand products. SafeState makes product recalls executable, blocking recalled items at resale, on Amazon Aurora DSQL.";

export const metadata: Metadata = {
  metadataBase: new URL("https://safestate.vercel.app"),
  title: {
    default: "SafeState, recalls, made executable",
    template: "%s · SafeState",
  },
  description,
  applicationName: "SafeState",
  openGraph: {
    title: "SafeState, recalls, made executable",
    description,
    url: "https://safestate.vercel.app",
    siteName: "SafeState",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SafeState, recalls, made executable",
    description,
  },
};

// Light by default; only switch to dark if the user explicitly chose it.
// Runs before paint to avoid a flash.
const themeScript = `(function(){try{if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Nav />
        <PageBack />
        <div className="flex-1">{children}</div>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
