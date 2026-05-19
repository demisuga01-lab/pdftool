import { Shield } from "lucide-react";

export function VirusScanBadge() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
      <Shield className="h-3 w-3 shrink-0" />
      <span>Files are scanned for threats before processing.</span>
    </div>
  );
}
