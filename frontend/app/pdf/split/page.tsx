"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { SinglePdfWorkspacePage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type SplitMethod = "ranges" | "every" | "parts" | "size" | "bookmarks";

type SplitSettings = {
  customPrefix: string;
  equalParts: number;
  maxSizeMb: number;
  namingPattern: "{original}-part-{n}" | "{original}-pages-{range}" | "part-{n}";
  pageRanges: string;
  splitMethod: SplitMethod;
  zipAll: boolean;
};

const initialSettings: SplitSettings = {
  customPrefix: "",
  equalParts: 2,
  maxSizeMb: 5,
  namingPattern: "{original}-part-{n}",
  pageRanges: "1-3, 5, 7-9",
  splitMethod: "ranges",
  zipAll: true,
};

function parsePageRanges(value: string) {
  const segments = value
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return { ok: false as const, preview: "Enter page ranges to continue." };
  }

  for (const segment of segments) {
    if (!/^\d+(-\d+)?$/.test(segment)) {
      return { ok: false as const, preview: "Use a format like 1-3, 5, 7-9." };
    }
  }

  const labels = segments.map((segment) =>
    segment.includes("-") ? `pages ${segment}` : `page ${segment}`,
  );

  return {
    ok: true as const,
    preview: `Will create ${segments.length} files: ${labels.join(", ")}`,
  };
}

function buildPartRanges(pageCount: number, parts: number) {
  const safeParts = Math.max(1, parts);
  const size = Math.ceil(pageCount / safeParts);
  const ranges: string[] = [];

  for (let start = 1; start <= pageCount; start += size) {
    const end = Math.min(pageCount, start + size - 1);
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
  }

  return ranges.join(", ");
}

function buildSizeRanges(pageCount: number, fileSize: number, maxSizeMb: number) {
  const bytesPerPage = fileSize / Math.max(1, pageCount);
  const targetBytes = Math.max(1, maxSizeMb) * 1024 * 1024;
  const pagesPerChunk = Math.max(1, Math.floor(targetBytes / Math.max(1, bytesPerPage)));
  const ranges: string[] = [];

  for (let start = 1; start <= pageCount; start += pagesPerChunk) {
    const end = Math.min(pageCount, start + pagesPerChunk - 1);
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
  }

  return ranges.join(", ");
}

const sections: Array<ControlSection<SplitSettings>> = [
  {
    key: "split-method",
    label: "Split Method",
    fields: [
      {
        key: "splitMethod",
        label: "Split method",
        type: "radioCards",
        options: [
          { label: "By page ranges", value: "ranges" },
          { label: "Extract every page", value: "every" },
          { label: "Split into equal parts", value: "parts" },
          { label: "Split by file size", value: "size" },
          { label: "Split by bookmarks", value: "bookmarks" },
        ],
      },
    ],
  },
  {
    key: "page-ranges",
    label: "Page Ranges",
    render: (settings) =>
      settings.splitMethod === "ranges" ? (
        <p className="text-sm text-slate-500">{parsePageRanges(settings.pageRanges).preview}</p>
      ) : settings.splitMethod === "bookmarks" ? (
        <p className="text-sm text-amber-600">
          Bookmark-based splitting is disabled until bookmark parsing is exposed by the backend.
        </p>
      ) : null,
    fields: [
      {
        key: "pageRanges",
        label: "Ranges",
        type: "text",
        placeholder: "1-3, 5, 7-9",
        show: (settings) => settings.splitMethod === "ranges",
      },
    ],
  },
  {
    key: "equal-parts",
    label: "Equal Parts",
    fields: [
      {
        key: "equalParts",
        label: "How many parts",
        type: "number",
        min: 2,
        show: (settings) => settings.splitMethod === "parts",
      },
      {
        key: "maxSizeMb",
        label: "Max MB per part",
        type: "number",
        min: 1,
        show: (settings) => settings.splitMethod === "size",
      },
    ],
  },
  {
    key: "naming",
    label: "Naming",
    fields: [
      {
        key: "namingPattern",
        label: "Naming pattern",
        type: "select",
        options: [
          { label: "{original}-part-{n}", value: "{original}-part-{n}" },
          { label: "{original}-pages-{range}", value: "{original}-pages-{range}" },
          { label: "part-{n}", value: "part-{n}" },
        ],
      },
      {
        key: "customPrefix",
        label: "Custom prefix",
        type: "text",
        placeholder: "chapter",
      },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      {
        key: "zipAll",
        label: "Zip all outputs",
        type: "toggle",
      },
    ],
  },
];

export default function PdfSplitPage() {
  return (
    <SinglePdfWorkspacePage<SplitSettings>
      buildFormData={({ file, items, settings }) => {
        const pageCount = items.length;
        let pages = settings.pageRanges;
        let outputFormat: "individual" | "ranges" = "ranges";

        if (settings.splitMethod === "every") {
          pages = "all";
          outputFormat = "individual";
        } else if (settings.splitMethod === "parts") {
          pages = buildPartRanges(pageCount, settings.equalParts);
        } else if (settings.splitMethod === "size") {
          pages = buildSizeRanges(pageCount, file.size, settings.maxSizeMb);
        }

        const namingPattern = settings.customPrefix.trim()
          ? `${settings.customPrefix.trim()}-{n}`
          : settings.namingPattern;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("pages", pages);
        formData.append("naming_pattern", namingPattern);
        formData.append("output_format", outputFormat);
        formData.append("split_method", settings.splitMethod);
        formData.append("zip_all", String(settings.zipAll));
        return formData;
      }}
      description="Preview the document, choose how to divide it, and send a single split plan to the backend."
      downloadFilename={(file) => `${slugifyBaseName(file.name)}-split.zip`}
      emptyDescription="Upload a PDF to split it by ranges, pages, equal parts, or size-driven chunks."
      endpoint="pdf/split"
      initialSettings={initialSettings}
      layoutKind="editor"
      processDisabled={({ file, items, settings }) => {
        if (!file || items.length === 0) {
          return true;
        }

        if (settings.splitMethod === "ranges") {
          return !parsePageRanges(settings.pageRanges).ok;
        }

        if (settings.splitMethod === "bookmarks") {
          return true;
        }

        return false;
      }}
      sections={sections}
      title="Split PDF"
    />
  );
}
