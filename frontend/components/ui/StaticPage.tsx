import type { ReactNode } from "react";

type StaticPageProps = {
  children: ReactNode;
  description?: string;
  eyebrow?: string;
  title: string;
  width?: "narrow" | "wide";
};

export function StaticPage({
  children,
  description,
  eyebrow,
  title,
  width = "narrow",
}: StaticPageProps) {
  return (
    <main className="bg-white dark:bg-zinc-950">
      <div
        className={[
          "mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16",
          width === "wide" ? "max-w-7xl" : "max-w-[760px]",
        ].join(" ")}
      >
        <div className="space-y-4">
          {eyebrow ? <p className="tool-eyebrow">{eyebrow}</p> : null}
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-4xl">{title}</h1>
            {description ? (
              <p className="max-w-2xl text-base leading-8 text-slate-500 dark:text-zinc-300">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="mt-10">{children}</div>
      </div>
    </main>
  );
}

type DocumentSectionProps = {
  children: ReactNode;
  title: string;
};

export function DocumentSection({ children, title }: DocumentSectionProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="space-y-4 text-[15px] leading-8 text-slate-600 dark:text-zinc-300">{children}</div>
    </section>
  );
}
