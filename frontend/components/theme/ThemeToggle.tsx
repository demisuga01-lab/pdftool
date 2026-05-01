"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useTheme, type ThemeMode } from "@/components/theme/ThemeProvider";

const themeOptions: Array<{
  description: string;
  icon: typeof Sun;
  label: string;
  value: ThemeMode;
}> = [
  { description: "Follow your device appearance. Default for new visitors.", icon: Monitor, label: "System", value: "system" },
  { description: "Always use the light interface.", icon: Sun, label: "Light", value: "light" },
  { description: "Always use the dark interface.", icon: Moon, label: "Dark", value: "dark" },
];

function ThemeIcon({ theme }: { theme: ThemeMode }) {
  if (theme === "light") {
    return <Sun className="h-4 w-4" />;
  }
  if (theme === "dark") {
    return <Moon className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={`Theme: ${theme === "system" ? `System (${resolvedTheme})` : theme}`}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200/70 bg-white/82 text-slate-600 shadow-[0_10px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:border-white/10 dark:bg-zinc-900/78 dark:text-zinc-300 dark:hover:bg-white/5 dark:hover:text-white dark:focus-visible:ring-emerald-400/35"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <ThemeIcon theme={theme} />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-56 rounded-2xl border border-zinc-200/70 bg-white/88 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/84 dark:shadow-[0_28px_70px_rgba(0,0,0,0.34)]">
          <div className="space-y-1">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = theme === option.value;

              return (
                <button
                  aria-pressed={selected}
                  className={[
                    "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 dark:focus-visible:ring-emerald-400/35",
                    selected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "border-transparent text-slate-700 hover:bg-slate-50 dark:text-zinc-200 dark:hover:bg-white/5",
                  ].join(" ")}
                  key={option.value}
                  onClick={() => {
                    setTheme(option.value);
                    setOpen(false);
                  }}
                  type="button"
                >
                  <span
                    className={[
                      "inline-flex h-9 w-9 items-center justify-center rounded-lg border",
                      selected
                        ? "border-current/20 bg-current/10"
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-950",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{option.label}</span>
                      {selected ? <span className="text-xs font-semibold">Selected</span> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-zinc-400">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
