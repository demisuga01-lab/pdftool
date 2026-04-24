import { notFound } from "next/navigation";
import { ArrowRight, Hammer } from "lucide-react";
import Link from "next/link";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { tools } from "@/lib/tools";

type ToolPageProps = {
  params: Promise<{
    category: string;
    tool: string;
  }>;
};

export default async function ToolPage({ params }: ToolPageProps) {
  const { category, tool } = await params;
  const currentTool = tools.find((item) => item.category === category && item.id === tool);

  if (!currentTool) {
    notFound();
  }

  return (
    <ToolLayout>
      <div className="space-y-8">
        <div className="rounded-3xl border border-slate-200 bg-white/85 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-sm font-medium text-sky-700 dark:text-sky-300">
            <Hammer className="h-4 w-4" />
            Tool page scaffolded
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 dark:text-white">
              {currentTool.name}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-400">
              {currentTool.description}
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white/85 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900/85">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Ready for the interactive form</h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              The shared frontend structure is in place: API helpers, upload UI, job polling UI, home cards,
              grouped navigation, and the responsive tool layout. The next pass can wire each page to its exact
              backend payload and controls.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white"
              href="/"
            >
              Back to homepage
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
