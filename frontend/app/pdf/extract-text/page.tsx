"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { SinglePdfWorkspacePage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type ExtractTextSettings = {
  encoding: "utf-8" | "ascii";
  extractFormValues: boolean;
  languageHint: "auto" | "english" | "hindi" | "arabic" | "chinese" | "french" | "german" | "spanish";
  mode: "plain" | "layout" | "html" | "json";
  outputFormat: "txt" | "html" | "json";
  pageRange: string;
  preserveLineBreaks: boolean;
  removeHeadersFooters: boolean;
  scope: "all" | "range";
};

const initialSettings: ExtractTextSettings = {
  encoding: "utf-8",
  extractFormValues: false,
  languageHint: "auto",
  mode: "plain",
  outputFormat: "txt",
  pageRange: "",
  preserveLineBreaks: true,
  removeHeadersFooters: false,
  scope: "all",
};

const sections: Array<ControlSection<ExtractTextSettings>> = [
  {
    key: "extraction-mode",
    label: "Extraction Mode",
    fields: [
      {
        key: "mode",
        label: "Mode",
        type: "radioCards",
        options: [
          { label: "Plain text", value: "plain" },
          { label: "Preserve layout", value: "layout" },
          { label: "HTML output", value: "html" },
          { label: "JSON output", value: "json" },
        ],
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
        ],
      },
      {
        key: "pageRange",
        label: "Page range",
        type: "text",
        placeholder: "1-3, 5, 7-9",
        show: (settings) => settings.scope === "range",
      },
    ],
  },
  {
    key: "options",
    label: "Options",
    fields: [
      { key: "preserveLineBreaks", label: "Preserve line breaks", type: "toggle" },
      { key: "removeHeadersFooters", label: "Remove headers and footers", type: "toggle" },
      { key: "extractFormValues", label: "Extract form field values", type: "toggle" },
      {
        key: "languageHint",
        label: "Language hint",
        type: "select",
        options: [
          { label: "Auto-detect", value: "auto" },
          { label: "English", value: "english" },
          { label: "Hindi", value: "hindi" },
          { label: "Arabic", value: "arabic" },
          { label: "Chinese", value: "chinese" },
          { label: "French", value: "french" },
          { label: "German", value: "german" },
          { label: "Spanish", value: "spanish" },
        ],
      },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      {
        key: "outputFormat",
        label: "Output format",
        type: "select",
        options: [
          { label: "TXT", value: "txt" },
          { label: "HTML", value: "html" },
          { label: "JSON", value: "json" },
        ],
      },
      {
        key: "encoding",
        label: "Encoding",
        type: "select",
        options: [
          { label: "UTF-8", value: "utf-8" },
          { label: "ASCII", value: "ascii" },
        ],
      },
    ],
  },
];

export default function PdfExtractTextPage() {
  return (
    <SinglePdfWorkspacePage<ExtractTextSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("layout", String(settings.mode === "layout"));
        formData.append("mode", settings.mode);
        formData.append("pages", settings.scope === "range" ? settings.pageRange : "all");
        formData.append("preserve_line_breaks", String(settings.preserveLineBreaks));
        formData.append("remove_headers_footers", String(settings.removeHeadersFooters));
        formData.append("extract_form_values", String(settings.extractFormValues));
        formData.append("language_hint", settings.languageHint);
        formData.append("output_format", settings.outputFormat);
        formData.append("encoding", settings.encoding);
        return formData;
      }}
      description="Inspect pages, choose an extraction profile, and export plain text, layout-aware text, HTML, or JSON."
      downloadFilename={(file, settings) => `${slugifyBaseName(file.name)}.${settings.outputFormat}`}
      emptyDescription="Upload a PDF to review its pages before extracting text."
      endpoint="pdf/extract-text"
      initialSettings={initialSettings}
      sections={sections}
      title="Extract Text"
    />
  );
}
