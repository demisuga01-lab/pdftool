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
      className="group flex h-full min-h-[124px] flex-col rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-[#60A5FA] hover:shadow-sm dark:border-white/10 dark:bg-slate-900 dark:hover:border-blue-400/60"
      href={tool.href}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#2563EB] transition duration-200 group-hover:scale-[1.04] group-hover:bg-[#DBEAFE] dark:bg-blue-500/10 dark:text-blue-300 dark:group-hover:bg-blue-500/15">
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="space-y-1">
        <h3 className="text-[14px] font-semibold text-[#111827] dark:text-slate-100">{tool.name}</h3>
        <p className="truncate text-[12px] font-medium text-slate-500 dark:text-slate-400">{tool.description}</p>
      </div>
    </Link>
  );
}
