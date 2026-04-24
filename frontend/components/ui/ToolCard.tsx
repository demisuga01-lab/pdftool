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
      className="group flex h-full flex-col border-2 border-slate-950 bg-white p-6 transition duration-200 hover:bg-slate-950 dark:border-slate-100 dark:bg-slate-950 dark:hover:bg-slate-100"
      href={tool.href}
    >
      <div className="mb-5 flex h-12 w-12 items-center justify-center border-2 border-current text-[#2563EB] transition group-hover:border-white dark:group-hover:border-slate-950">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-950 transition group-hover:text-white dark:text-white dark:group-hover:text-slate-950">
          {tool.name}
        </h3>
        <p className="text-sm leading-6 text-slate-700 transition group-hover:text-slate-300 dark:text-slate-300 dark:group-hover:text-slate-700">
          {tool.description}
        </p>
      </div>
      <div className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
        Open tool
      </div>
    </Link>
  );
}
