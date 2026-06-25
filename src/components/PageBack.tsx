"use client";

import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui";

/** A Back affordance shown on every page except the home page. Goes to the
 *  previous page when there's history, otherwise falls back to home. */
export function PageBack() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/") return null;

  function back() {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <Container className="pt-6">
      <button
        type="button"
        onClick={back}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg2 transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
    </Container>
  );
}
