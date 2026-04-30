"use client";

import { useEffect, type ReactNode } from "react";

import { WorkspacePreview } from "@/components/workspace/WorkspacePreview";
import { WorkspaceToolbar } from "@/components/workspace/WorkspaceToolbar";
import { useDragPan, useWorkspaceZoom, type WorkspaceContentSize } from "@/lib/use-workspace-zoom";

export function WorkspaceEditorCanvas({
  children,
  contentSize,
  footer,
  ignorePanSelectors,
  toolbar,
}: {
  children: (args: { effectiveZoom: number; mode: "fit" | "manual" }) => ReactNode;
  contentSize?: WorkspaceContentSize | null;
  footer?: ReactNode;
  ignorePanSelectors?: string;
  toolbar?: ReactNode;
}) {
  const zoom = useWorkspaceZoom({ contentSize });
  const dragPan = useDragPan(zoom.viewportRef, {
    enabled: !zoom.fitMode && zoom.effectiveZoom > 100,
    ignoreSelectors: ignorePanSelectors,
  });

  useEffect(() => {
    const node = zoom.viewportRef.current;
    if (!node) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom.zoomByWheel(event.deltaY);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  return (
    <WorkspacePreview>
      <WorkspaceToolbar fit={zoom.fit} label={zoom.label} reset={zoom.reset} zoomIn={zoom.zoomIn} zoomOut={zoom.zoomOut}>
        {toolbar}
      </WorkspaceToolbar>
      <div
        className="h-[min(62dvh,560px)] overflow-auto overscroll-contain bg-zinc-50 p-3 dark:bg-neutral-950 sm:h-[min(72dvh,760px)] sm:p-5"
        ref={zoom.viewportRef}
        style={{
          cursor: dragPan.panCursor,
          touchAction: !zoom.fitMode && zoom.effectiveZoom > 100 ? "none" : "manipulation",
        }}
      >
        <div className="flex min-h-full min-w-full items-center justify-center">{children({ effectiveZoom: zoom.effectiveZoom, mode: zoom.mode })}</div>
      </div>
      {footer ? <div className="border-t border-zinc-200 px-4 py-3 dark:border-white/10">{footer}</div> : null}
    </WorkspacePreview>
  );
}
