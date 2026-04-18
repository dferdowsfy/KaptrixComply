"use client";

import { useEffect, useState } from "react";

type Step = {
  kicker: string;
  title: string;
  description: string;
  href: string;
  accent: string;
};

type Props = {
  steps: Step[];
};

export function PlatformShowcase({ steps }: Props) {
  const [active, setActive] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const current = steps[active];

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setTimeout(
      () => setActive((prev) => (prev + 1) % steps.length),
      5500,
    );
    return () => window.clearTimeout(id);
  }, [active, autoplay, steps.length]);

  return (
    <div className="mt-14">
      {/* Stepper */}
      <ol className="grid gap-3 sm:grid-cols-3">
        {steps.map((step, idx) => {
          const isActive = idx === active;
          return (
            <li key={step.kicker}>
              <button
                type="button"
                onClick={() => {
                  setActive(idx);
                  setAutoplay(false);
                }}
                aria-current={isActive ? "step" : undefined}
                className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                    : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                }`}
              >
                <div
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${step.accent}`}
                />
                <p
                  className={`text-[11px] font-semibold uppercase tracking-[0.3em] ${
                    isActive ? "text-indigo-200" : "text-slate-400"
                  }`}
                >
                  {step.kicker}
                </p>
                <p
                  className={`mt-1 text-base font-semibold ${
                    isActive ? "text-white" : "text-slate-800"
                  }`}
                >
                  {step.title}
                </p>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Single centered iframe stage */}
      <div className="relative mt-8 overflow-hidden rounded-[2rem] border border-slate-800/20 bg-slate-950 p-4 shadow-2xl sm:p-6">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${current.accent} transition-all duration-700`}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-20 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl"
        />

        {/* Caption */}
        <div
          key={current.kicker}
          className="relative mb-5 rounded-xl border border-white/10 bg-white/[0.05] px-5 py-4 text-white showcase-fade"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-indigo-200">
            {current.kicker}
          </p>
          <p className="mt-1 text-xl font-semibold">{current.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-300">
            {current.description}
          </p>
        </div>

        {/* Iframe — single, centered, large */}
        <div className="relative mx-auto aspect-[16/10] w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-900">
          <iframe
            key={current.href}
            title={current.title}
            src={current.href}
            className="absolute inset-0 h-full w-full border-0 showcase-fade"
            loading="lazy"
          />
        </div>

        {/* Controls */}
        <div className="relative mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {steps.map((_, idx) => (
              <span
                key={idx}
                aria-hidden
                className={`h-1.5 rounded-full transition-all ${
                  idx === active
                    ? "w-10 bg-indigo-400"
                    : "w-4 bg-white/20"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActive((prev) => (prev - 1 + steps.length) % steps.length);
                setAutoplay(false);
              }}
              className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
            >
              ← Previous
            </button>
            <button
              type="button"
              onClick={() => {
                setActive((prev) => (prev + 1) % steps.length);
                setAutoplay(false);
              }}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
