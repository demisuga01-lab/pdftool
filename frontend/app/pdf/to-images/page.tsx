"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { SinglePdfWorkspacePage } from "@/components/workspace/WorkspacePageBuilders";
import { selectedPagesLabel } from "@/lib/workspace-data";

type ToImagesSettings = {
  dpi: number;
  downloadZip: boolean;
  filenamePattern: "page-{n}" | "{original}-{n}" | "{n}";
  format: "png" | "jpeg" | "webp" | "tiff";
  jpegQuality: number;
  pageRange: string;
  pngCompressionLevel: number;
  scope: "all" | "range";
  selectedOnly: boolean;
  transparent: boolean;
  zeroPadding: boolean;
};

const initialSettings: ToImagesSettings = {
  dpi: 150,
  downloadZip: true,
  filenamePattern: "page-{n}",
  format: "png",
  jpegQuality: 85,
  pageRange: "",
  pngCompressionLevel: 6,
  scope: "all",
  selectedOnly: false,
  transparent: false,
  zeroPadding: true,
};

const sections: Array<ControlSection<ToImagesSettings>> = [
  {
    key: "output-format",
    label: "Output Format",
    fields: [
      {
        key: "format",
        label: "Format",
        type: "radioCards",
        options: [
          { label: "PNG", description: "Lossless, supports transparency", value: "png" },
          { label: "JPEG", description: "Smaller files, no transparency", value: "jpeg" },
          { label: "WebP", description: "Modern format, excellent compression", value: "webp" },
          { label: "TIFF", description: "Professional, uncompressed", value: "tiff" },
        ],
      },
    ],
  },
  {
    key: "resolution",
    label: "Resolution",
    fields: [
      {
        key: "dpi",
        label: "DPI",
        type: "slider",
        min: 72,
        max: 600,
        valueSuffix: " DPI",
      },
      {
        key: "jpegQuality",
        label: "Quality",
        type: "slider",
        min: 1,
        max: 100,
        show: (settings) => settings.format === "jpeg" || settings.format === "webp",
      },
    ],
  },
  {
    key: "png-options",
    label: "PNG Options",
    fields: [
      {
        key: "transparent",
        label: "Transparent background",
        type: "toggle",
        show: (settings) => settings.format === "png",
      },
      {
        key: "pngCompressionLevel",
        label: "PNG compression level",
        type: "slider",
        min: 0,
        max: 9,
        show: (settings) => settings.format === "png",
      },
    ],
  },
  {
    key: "pages",
    label: "Pages",
    fields: [
      {
        key: "scope",
        label: "Page scope",
        type: "buttonGroup",
        options: [
          { label: "All pages", value: "all" },
          { label: "Range", value: "range" },
          { label: "Selected", value: "all" },
        ],
      },
      {
        key: "pageRange",
        label: "Page range",
        type: "text",
        placeholder: "1-3, 5, 7-9",
        show: (settings) => settings.scope === "range",
      },
      {
        key: "selectedOnly",
        label: "Selected pages only",
        type: "toggle",
      },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      {
        key: "filenamePattern",
        label: "Filename pattern",
        type: "select",
        options: [
          { label: "page-{n}", value: "page-{n}" },
          { label: "{original}-{n}", value: "{original}-{n}" },
          { label: "{n}", value: "{n}" },
        ],
      },
      { key: "zeroPadding", label: "Zero padding", type: "toggle" },
      { key: "downloadZip", label: "Download as ZIP", type: "toggle" },
    ],
  },
];

export default function PdfToImagesPage() {
  return (
    <SinglePdfWorkspacePage<ToImagesSettings>
      buildFormData={({ file, items, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dpi", String(settings.dpi));
        formData.append("format", settings.format);
        formData.append("jpeg_quality", String(settings.jpegQuality));
        formData.append("transparent", String(settings.transparent));
        formData.append("page_range", settings.scope === "range" ? settings.pageRange : "all");
        formData.append("selected_pages", settings.selectedOnly ? selectedPagesLabel(items) : "all");
        formData.append("filename_pattern", settings.filenamePattern);
        formData.append("zero_padding", String(settings.zeroPadding));
        formData.append("download_zip", String(settings.downloadZip));
        return formData;
      }}
      description="Render page thumbnails in the browser, choose export settings, then generate an image set from the PDF."
      downloadFilename={(file, settings) =>
        `${file.name.replace(/\.pdf$/i, "")}-${settings.format}${settings.downloadZip ? ".zip" : ""}`
      }
      emptyDescription="Upload a PDF to convert every page or a selected subset into images."
      endpoint="pdf/to-images"
      initialSettings={initialSettings}
      presets={[
        { label: "Quick Preview", values: { dpi: 72, format: "jpeg", jpegQuality: 70 } },
        { label: "Standard", values: { dpi: 150, format: "png" } },
        { label: "Print Quality", values: { dpi: 300, format: "png", transparent: true } },
        { label: "Ultra HD", values: { dpi: 600, format: "png" } },
      ]}
      sections={sections}
      title="PDF to Images"
    />
  );
}
