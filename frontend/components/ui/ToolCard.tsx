import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Crop,
  Eraser,
  Expand,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Files,
  Images,
  Info,
  Layers,
  Lock,
  RefreshCw,
  RotateCw,
  ScanSearch,
  Scissors,
  Stamp,
  Unlock,
} from "lucide-react";

import type { ToolDefinition } from "@/lib/tools";

const iconMap: Record<string, LucideIcon> = {
  Crop,
  Eraser,
  Expand,
  FileArchive,
  FileImage,
  FileSpreadsheet,
  FileText,
  Files,
  Images,
  Info,
  Layers,
  Lock,
  RefreshCw,
  RotateCw,
  ScanSearch,
  Scissors,
  Stamp,
  Unlock,
};

export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const Icon = iconMap[tool.icon] ?? FileText;

  return (
    <Link
      className="group flex h-full min-h-[132px] flex-col rounded-[26px] border border-zinc-200/80 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_18px_42px_rgba(15,23,42,0.08)] active:bg-zinc-50 dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-[0_20px_48px_rgba(0,0,0,0.22)] dark:focus-visible:ring-emerald-400/40 dark:hover:border-emerald-400/40 dark:active:bg-white/[0.04] sm:min-h-[136px]"
      href={tool.href}
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-[#059669] transition duration-200 group-hover:scale-[1.03] group-hover:border-emerald-300 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:group-hover:bg-emerald-500/15">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 space-y-1">
        <h3 className="text-[15px] font-semibold text-zinc-900 dark:text-zinc-100">{tool.name}</h3>
        <p className="line-clamp-3 text-[13px] font-medium leading-6 text-zinc-500 dark:text-zinc-400">{tool.description}</p>
      </div>
    </Link>
  );
}
