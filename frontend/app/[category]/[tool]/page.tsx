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
      <div className="space-y-6">
        <section className="tool-panel">
          <div className="space-y-3">
            <p className="tool-eyebrow">{currentTool.name}</p>
            <h1 className="tool-title">{currentTool.name}</h1>
            <p className="tool-description">{currentTool.description}</p>
          </div>
        </section>

        <section className="tool-panel space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-[#059669]">
            <Hammer className="h-4 w-4" />
            <span>Interactive form coming next</span>
          </div>
          <p className="text-sm leading-6 text-slate-500">
            The shared frontend shell is ready. This route already has the polished layout, upload surface,
            status handling, and navigation. The next pass can wire the exact controls for this tool.
          </p>
          <Link className="secondary-button gap-2 self-start" href="/">
            Back to homepage
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </ToolLayout>
  );
}
