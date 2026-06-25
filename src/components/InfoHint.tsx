import { Info } from "lucide-react";
import { cn } from "@/components/ui";

/**
 * A tiny "i" with a hover tooltip explaining what a button or section does.
 * Pure CSS (no fetch, no state) so it can go next to anything, everywhere.
 * For richer, backend-driven help popovers see InfoButton.
 */
export function InfoHint({ text, className }: { text: string; className?: string }) {
  return (
    <span className={cn("group/hint relative inline-flex align-middle", className)}>
      <Info className="h-3.5 w-3.5 cursor-help text-muted/70 transition-colors hover:text-fg2" aria-hidden />
      <span className="sr-only">{text}</span>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-fg2 opacity-0 shadow-lift transition-opacity duration-150 group-hover/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
