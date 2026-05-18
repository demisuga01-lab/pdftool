"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { UnsupportedOptionNote } from "@/components/workspace/UnsupportedOptionNote";
import { SingleImageWorkspacePage, PreviewStage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type RemoveBackgroundSettings = Record<string, never>;

const sections: Array<ControlSection<RemoveBackgroundSettings>> = [
  {
    key: "processing-mode",
    label: "Processing",
    render: () => (
      <div className="space-y-3">
        <UnsupportedOptionNote>
          Uses OpenCV foreground extraction and exports a PNG with transparency. Fine edges may need review.
        </UnsupportedOptionNote>
        <UnsupportedOptionNote>
          Advanced refinement and background replacement options are planned.
        </UnsupportedOptionNote>
      </div>
    ),
  },
];

export default function ImageRemoveBackgroundPage() {
  return (
    <SingleImageWorkspacePage<RemoveBackgroundSettings>
      buildFormData={({ file }) => {
        const formData = new FormData();
        formData.append("file", file);
        return formData;
      }}
      description="Use OpenCV foreground extraction to export a PNG cutout with transparency."
      downloadFilename={(file) => `${slugifyBaseName(file.name)}-cutout.png`}
      emptyDescription="Upload an image to remove its background and preview the result."
      endpoint="image/remove-background"
      initialSettings={{}}
      renderCenter={({ file, preview }) => (
        <PreviewStage className="mx-auto max-w-5xl">
          <div className="grid gap-4 p-6 lg:grid-cols-2">
            {["Original", "Background removed"].map((label, index) => (
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-zinc-900" key={label}>
                <p className="mb-3 text-[13px] text-slate-500 dark:text-zinc-400">{label}</p>
                <div className={["flex min-h-[360px] items-center justify-center rounded-xl border border-zinc-200 p-4 dark:border-white/10", index === 1 ? "preview-checkerboard" : "bg-zinc-50 dark:bg-zinc-950"].join(" ")}>
                  {preview ? (
                    <img
                      alt={file.name}
                      className="max-h-[320px] max-w-full rounded-xl object-contain"
                      src={preview.dataUrl}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </PreviewStage>
      )}
      sections={sections}
      title="Remove Background"
    />
  );
}
