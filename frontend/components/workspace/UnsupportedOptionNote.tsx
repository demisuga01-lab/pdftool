"use client";

export function UnsupportedOptionNote({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] font-medium leading-6 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
      {children}
    </div>
  );
}
