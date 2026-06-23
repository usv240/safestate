"use client";

import { useState } from "react";

interface Topic {
  title: string;
  body_md: string;
  learn_more_url: string | null;
}

/** The ubiquitous "ⓘ" control. Help text is fetched from the backend
 *  (help_topics) — never hardcoded in the component. */
export function InfoButton({ topicId }: { topicId: string }) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState<Topic | null>(null);

  async function toggle() {
    if (!open && !topic) {
      try {
        const r = await fetch(`/api/help/${encodeURIComponent(topicId)}`, {
          cache: "no-store",
        });
        if (r.ok) setTopic(await r.json());
      } catch {
        /* ignore */
      }
    }
    setOpen((v) => !v);
  }

  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        onClick={toggle}
        aria-label="More information"
        aria-expanded={open}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 text-[10px] font-semibold leading-none text-slate-500 hover:border-slate-600 hover:text-slate-800"
      >
        i
      </button>
      {open && topic && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal shadow-lg"
        >
          <span className="block font-semibold text-slate-900">{topic.title}</span>
          <span className="mt-1 block whitespace-pre-line text-slate-600">
            {topic.body_md}
          </span>
          {topic.learn_more_url && (
            <a
              href={topic.learn_more_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-emerald-700 hover:underline"
            >
              Learn more →
            </a>
          )}
        </span>
      )}
    </span>
  );
}
