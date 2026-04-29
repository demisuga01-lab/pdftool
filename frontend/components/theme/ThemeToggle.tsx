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
  { description: "Always use the light interface.", icon: Sun, label: "Light", value: "light" },
  { description: "Always use the dark interface.", icon: Moon, label: "Dark", value: "dark" },
  { description: "Follow your device appearance.", icon: Monitor, label: "System", value: "system" },
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white dark:focus-visible:ring-blue-400/40"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <ThemeIcon theme={theme} />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900 dark:shadow-black/30">
          <div className="space-y-1">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const selected = theme === option.value;

              return (
                <button
                  aria-pressed={selected}
                  className={[
                    "flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:focus-visible:ring-blue-400/40",
                    selected
                      ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-500/10 dark:text-blue-300"
                      : "border-transparent text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5",
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
                        : "border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">{option.label}</span>
                      {selected ? <span className="text-xs font-semibold">Selected</span> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{option.description}</span>
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
