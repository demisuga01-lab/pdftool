"use client";

import { PageGridWorkspace, type PageGridItem } from "@/components/workspace/PageGridWorkspace";
import type { ControlSection } from "@/components/workspace/Controls";
import type { PdfPageCard } from "@/components/workspace/PDFWorkspace";
import { SinglePdfWorkspacePage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type SplitOutputMode =
  | "split_all"
  | "extract_selected"
  | "split_selected"
  | "custom_ranges"
  | "reorder_export";

type SplitSettings = {
  namingPattern: "{original}-page-{range}" | "{original}-part-{n}" | "page-{n}";
  outputFilename: string;
  outputMode: SplitOutputMode;
  ranges: string;
};

const initialSettings: SplitSettings = {
  namingPattern: "{original}-page-{range}",
  outputFilename: "",
  outputMode: "extract_selected",
  ranges: "",
};

const outputModeLabels: Record<SplitOutputMode, string> = {
  split_all: "Split all active pages",
  extract_selected: "Extract selected pages",
  split_selected: "Split selected pages",
  custom_ranges: "Custom ranges",
  reorder_export: "Reorder and export",
};

type PdfWorkspacePageItem = PdfPageCard | PageGridItem;

function toPageGridItems(items: PdfPageCard[]): PageGridItem[] {
  return items.map((item, index) => {
    const originalPageNumber = item.originalPageNumber ?? item.pageNumber;
    const thumbnailUrl = item.thumbnailUrl ?? item.thumbnail;
    return {
      currentIndex: item.currentIndex ?? index,
      id: item.id || `page-${originalPageNumber}`,
      loadState: item.loadState ?? "idle",
      originalPageNumber,
      pageNumber: item.pageNumber,
      previewUrl: item.previewUrl,
      removed: Boolean(item.removed),
      rotation: item.rotation as PageGridItem["rotation"],
      selected: Boolean(item.selected),
      thumbnail: item.thumbnail,
      thumbnailUrl,
    };
  });
}

function activeItems(items: PdfWorkspacePageItem[]) {
  return items.filter((item) => !item.removed);
}

function selectedActiveItems(items: PdfWorkspacePageItem[]) {
  return items.filter((item) => item.selected && !item.removed);
}

function pageNumbers(items: PdfWorkspacePageItem[]) {
  return items.map((item) => item.originalPageNumber ?? item.pageNumber);
}

function parseCustomRanges(value: string, pageCount = 0) {
  const tokens = value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return { ok: false as const, preview: "Enter ranges like 1,3-5,8." };
  }

  for (const token of tokens) {
    if (!/^\d+(?:-\d+)?$/.test(token)) {
      return { ok: false as const, preview: "Use ranges like 1,3-5,8." };
    }
    const [startText, endText = startText] = token.split("-");
    const start = Number(startText);
    const end = Number(endText);
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < 1) {
      return { ok: false as const, preview: "Ranges cannot include page 0 or negative pages." };
    }
    if (end < start) {
      return { ok: false as const, preview: "Ranges must start before they end." };
    }
    if (pageCount > 0 && end > pageCount) {
      return { ok: false as const, preview: `Ranges must be between 1 and ${pageCount}.` };
    }
  }

  return {
    ok: true as const,
    preview: tokens.length === 1 ? "Creates one range PDF." : `Creates ${tokens.length} range PDFs in a ZIP.`,
    tokenCount: tokens.length,
  };
}

function expectedOutputType(settings: SplitSettings, items: PdfWorkspacePageItem[], pageCount: number) {
  if (settings.outputMode === "extract_selected" || settings.outputMode === "reorder_export") {
    return "one PDF";
  }
  if (settings.outputMode === "custom_ranges") {
    const parsed = parseCustomRanges(settings.ranges, pageCount);
    return parsed.ok && parsed.tokenCount === 1 ? "one PDF" : "range-based ZIP";
  }
  return "ZIP";
}

function splitSummary(settings: SplitSettings, items: PdfWorkspacePageItem[], pageCount: number) {
  const active = activeItems(items);
  const selected = selectedActiveItems(items);
  const removedCount = items.length - active.length;

  if (active.length === 0) {
    return "Restore at least one page to create a new output file.";
  }

  if (settings.outputMode === "split_all") {
    const pageLabel = `${active.length} active ${active.length === 1 ? "page" : "pages"}`;
    return `${pageLabel} will be split into ${active.length} PDFs inside a ZIP.`;
  }

  if (settings.outputMode === "extract_selected") {
    return selected.length > 0
      ? `${selected.length} selected pages will be exported as one PDF.`
      : "Select pages to continue.";
  }

  if (settings.outputMode === "split_selected") {
    return selected.length > 0
      ? `${selected.length} selected pages will become ${selected.length} PDFs inside a ZIP.`
      : "Select pages to continue.";
  }

  if (settings.outputMode === "reorder_export") {
    return `${active.length} active pages will be exported as one PDF in the visual order.`;
  }

  const parsed = parseCustomRanges(settings.ranges, pageCount);
  return `${parsed.preview} Ranges use original page numbers.${removedCount > 0 ? " Removed pages do not change range numbering." : ""}`;
}

function processDisabled(file: File | null, items: PdfWorkspacePageItem[], settings: SplitSettings, pageCount = 0) {
  if (!file || items.length === 0) {
    return true;
  }
  const active = activeItems(items);
  const selected = selectedActiveItems(items);
  if (active.length === 0) {
    return true;
  }
  if (settings.outputMode === "extract_selected" || settings.outputMode === "split_selected") {
    return selected.length === 0;
  }
  if (settings.outputMode === "custom_ranges") {
    return !parseCustomRanges(settings.ranges, pageCount || items.length).ok;
  }
  return false;
}

function splitSections({
  activeCount,
  pageCount,
  selectedCount,
}: {
  activeCount: number;
  pageCount: number;
  selectedCount: number;
}): Array<ControlSection<SplitSettings>> {
  const noActivePages = activeCount === 0;
  const noSelectedPages = selectedCount === 0;

  return [
    {
      key: "output-mode",
      label: "Output Mode",
      fields: [
        {
          key: "outputMode",
          label: "Choose exactly what to create",
          type: "radioCards",
          options: [
            {
              disabled: noActivePages,
              label: "Split all active pages",
              value: "split_all",
              description: "Create one PDF per active page. Removed pages are excluded. Downloads as a ZIP.",
            },
            {
              disabled: noSelectedPages,
              label: "Extract selected pages",
              value: "extract_selected",
              description: noSelectedPages
                ? "Select pages to create one PDF."
                : "Create one PDF from the selected pages.",
            },
            {
              disabled: noSelectedPages,
              label: "Split selected pages",
              value: "split_selected",
              description: noSelectedPages
                ? "Select pages to create separate PDFs."
                : "Create one PDF for each selected page. Downloads as a ZIP.",
            },
            {
              disabled: noActivePages,
              label: "Custom ranges",
              value: "custom_ranges",
              description: "Use ranges like 1,3-5,8.",
            },
            {
              disabled: noActivePages,
              label: "Reorder and export",
              value: "reorder_export",
              description: "Move pages, remove unwanted pages, and export one PDF.",
            },
          ],
        },
      ],
    },
    {
      key: "ranges",
      label: "Custom Ranges",
      render: (settings) =>
        settings.outputMode === "custom_ranges" ? (
          <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            {parseCustomRanges(settings.ranges, pageCount).preview}
          </p>
        ) : null,
      fields: [
        {
          key: "ranges",
          label: "Ranges",
          placeholder: "1,3-5,8",
          show: (settings) => settings.outputMode === "custom_ranges",
          type: "text",
        },
      ],
    },
    {
      key: "naming",
      label: "Naming",
      fields: [
        {
          key: "namingPattern",
          label: "Split file naming",
          options: [
            { label: "{original}-page-{range}", value: "{original}-page-{range}" },
            { label: "{original}-part-{n}", value: "{original}-part-{n}" },
            { label: "page-{n}", value: "page-{n}" },
          ],
          show: (settings) =>
            settings.outputMode === "split_all" ||
            settings.outputMode === "split_selected" ||
            settings.outputMode === "custom_ranges",
          type: "select",
        },
        {
          key: "outputFilename",
          label: "Output filename",
          placeholder: "Optional, for example selected-pages.pdf or split-pages.zip",
          type: "text",
        },
      ],
    },
  ];
}

function SplitWorkspace({
  items,
  pageCount,
  setItems,
  settings,
}: {
  items: PdfPageCard[];
  pageCount: number;
  setItems: (items: PdfPageCard[]) => void;
  settings: SplitSettings;
}) {
  const gridItems = toPageGridItems(items);
  const dragEnabled = settings.outputMode !== "custom_ranges";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <PageGridWorkspace
        dragDisabledReason="Custom ranges use original page numbers."
        dragEnabled={dragEnabled}
        items={gridItems}
        onItemsChange={(nextItems) => setItems(nextItems)}
        previewLabels={{
          currentPositionLabel: (_item, position) => `Position ${position} of ${gridItems.length}`,
          pageLabel: (item) => `Page ${item.originalPageNumber}`,
        }}
        summary={
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-sm leading-6 text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 sm:px-4">
            {splitSummary(settings, gridItems, pageCount)}
            {dragEnabled ? (
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Drag pages or use the arrow buttons to set visual order. Selected exports use this order.
              </p>
            ) : null}
          </div>
        }
      />
    </div>
  );
}

function SplitSettingsSummary({
  items,
  pageCount,
  settings,
}: {
  items: PdfWorkspacePageItem[];
  pageCount: number;
  settings: SplitSettings;
}) {
  const active = activeItems(items);
  const selected = selectedActiveItems(items);
  const removedCount = items.length - active.length;
  const outputType = expectedOutputType(settings, items, pageCount);

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-950 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
        Output Summary
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-white p-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Total pages</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{pageCount || items.length}</p>
        </div>
        <div className="rounded-lg bg-white p-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Selected</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{selected.length}</p>
        </div>
        <div className="rounded-lg bg-white p-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Removed</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{removedCount}</p>
        </div>
        <div className="rounded-lg bg-white p-3 dark:bg-zinc-900">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Output</p>
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{outputType}</p>
        </div>
      </div>
      <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
        {splitSummary(settings, items, pageCount)}
      </p>
    </div>
  );
}

export default function PdfSplitPage() {
  return (
    <SinglePdfWorkspacePage<SplitSettings>
      buildFormData={({ file, items, settings }) => {
        const formData = new FormData();
        const active = activeItems(items);
        const selected = selectedActiveItems(items);
        const activePages = pageNumbers(active);
        const selectedPages = pageNumbers(selected);

        formData.append("file", file);
        formData.append("mode", settings.outputMode);
        formData.append("naming_pattern", settings.namingPattern);
        formData.append("output_filename", settings.outputFilename);

        if (settings.outputMode === "split_all") {
          formData.append("pages", JSON.stringify(activePages));
        } else if (settings.outputMode === "extract_selected" || settings.outputMode === "split_selected") {
          formData.append("pages", JSON.stringify(selectedPages));
        } else if (settings.outputMode === "reorder_export") {
          formData.append("page_order", JSON.stringify(activePages));
        } else {
          formData.append("ranges", settings.ranges.trim());
          formData.append("pages", settings.ranges.trim());
          formData.append("output_format", "ranges");
        }

        return formData;
      }}
      description="Choose exactly which pages to keep, split, or export."
      downloadFilename={(file, settings) => {
        const stem = slugifyBaseName(file.name);
        if (settings.outputMode === "extract_selected") {
          return `${stem}-selected.pdf`;
        }
        if (settings.outputMode === "reorder_export") {
          return `${stem}-organized.pdf`;
        }
        return `${stem}-split.zip`;
      }}
      downloadPanelProps={({ result }) => {
        const details = result?.result && typeof result.result === "object" ? result.result as Record<string, unknown> : {};
        const outputType = typeof details.output_type === "string" ? details.output_type : undefined;
        const fileCount = typeof details.file_count === "number" ? details.file_count : undefined;
        if (outputType === "pdf") {
          return {
            downloadLabel: "Download PDF",
            helperText: "A new PDF was created from the pages you chose.",
            readyTitle: "One PDF ready",
          };
        }
        if (outputType === "zip") {
          return {
            downloadLabel: "Download ZIP",
            helperText: fileCount ? `ZIP ready with ${fileCount} files. Downloads are temporary.` : "ZIP ready. Downloads are temporary.",
            readyTitle: fileCount ? `ZIP ready with ${fileCount} files` : "ZIP ready",
          };
        }
        return {};
      }}
      emptyDescription="Upload a PDF to choose pages visually before creating a new PDF or ZIP."
      endpoint="pdf/split"
      initialSettings={initialSettings}
      layoutKind="editor"
      processButtonLabel="Create output"
      processDisabled={({ file, items, pageCount, settings }) => processDisabled(file, items, settings, pageCount)}
      recentJobMetadata={({ items, pageCount, settings }) => {
        const outputType = expectedOutputType(settings, items, pageCount);
        const selectedCount =
          settings.outputMode === "extract_selected" || settings.outputMode === "split_selected"
            ? selectedActiveItems(items).length
            : activeItems(items).length;
        return {
          activePageCount: activeItems(items).length,
          outputMode: settings.outputMode,
          outputType: outputType.includes("ZIP") ? "zip" : "pdf",
          selectedPageCount: selectedCount,
        };
      }}
      renderCenter={({ items, pageCount, setItems, settings }) => (
        <SplitWorkspace
          items={items}
          pageCount={pageCount}
          setItems={setItems}
          settings={settings}
        />
      )}
      reportFields={({ items, pageCount, settings }) => [
        { label: "Split mode", value: outputModeLabels[settings.outputMode] },
        {
          label: "Selected page count",
          value:
            settings.outputMode === "extract_selected" || settings.outputMode === "split_selected"
              ? selectedActiveItems(items).length
              : activeItems(items).length,
        },
        { label: "Removed page count", value: items.length - activeItems(items).length },
        { label: "Total page count", value: pageCount || items.length },
      ]}
      rightPanelFooter={({ items, pageCount, settings }) => (
        <SplitSettingsSummary items={items} pageCount={pageCount} settings={settings} />
      )}
      sections={({ items, pageCount }) =>
        splitSections({
          activeCount: activeItems(items).length,
          pageCount,
          selectedCount: selectedActiveItems(items).length,
        })
      }
      showSelectionBar={false}
      title="Split PDF"
    />
  );
}
