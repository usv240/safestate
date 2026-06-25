"use client";

import { useEffect, useState } from "react";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/client/api";
import { Button } from "@/components/ui";

interface Step {
  step_order: number;
  anchor: string | null;
  title: string;
  body_md: string;
}

/** First-run guided tour. Steps are fetched from the backend (tutorial_steps),
 *  shown once per surface (localStorage). */
export function GuidedTour({ surface }: { surface: string }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(`tour:${surface}`) === "1";
    } catch {
      /* ignore */
    }
    if (seen) return;
    apiGet<{ tutorial: Step[] }>(`/api/content/${surface}`)
      .then((d) => {
        if (d.tutorial?.length) {
          setSteps(d.tutorial);
          setOpen(true);
        }
      })
      .catch(() => {});
  }, [surface]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(`tour:${surface}`, "1");
    } catch {
      /* ignore */
    }
  }

  if (!open || steps.length === 0) return null;
  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[20rem] rounded-xl2 border border-border bg-surface p-5 shadow-lift animate-fade-up">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
          <Sparkles className="h-3.5 w-3.5" /> Quick tour
        </span>
        <button onClick={dismiss} aria-label="Close tour" className="text-muted hover:text-fg">
          <X className="h-4 w-4" />
        </button>
      </div>
      <h3 className="mt-2.5 font-semibold text-fg">{s.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{s.body_md}</p>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {steps.map((_, k) => (
            <span key={k} className={`h-1.5 w-1.5 rounded-full ${k === i ? "bg-brand-600" : "bg-border"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setI(i - 1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {last ? (
            <Button size="sm" onClick={dismiss}>
              Got it
            </Button>
          ) : (
            <Button size="sm" onClick={() => setI(i + 1)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
