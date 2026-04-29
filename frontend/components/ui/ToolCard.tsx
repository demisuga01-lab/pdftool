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
      className="group flex h-full min-h-[124px] flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#34D399] hover:shadow-sm dark:border-white/10 dark:bg-zinc-900 dark:hover:border-emerald-400/60"
      href={tool.href}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#ECFDF5] text-[#059669] transition duration-200 group-hover:scale-[1.04] group-hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-300 dark:group-hover:bg-emerald-500/15">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="space-y-1">
        <h3 className="text-[14px] font-semibold text-zinc-900 dark:text-zinc-100">{tool.name}</h3>
        <p className="truncate text-[12px] font-medium text-slate-500 dark:text-zinc-400">{tool.description}</p>
      </div>
    </Link>
  );
}
