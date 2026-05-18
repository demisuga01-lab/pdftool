"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { UnsupportedOptionNote } from "@/components/workspace/UnsupportedOptionNote";
import { SinglePdfWorkspacePage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type ExtractTextSettings = {
  layout: boolean;
  outputFormat: "txt" | "html" | "json";
};

const initialSettings: ExtractTextSettings = {
  layout: true,
  outputFormat: "txt",
};

const sections: Array<ControlSection<ExtractTextSettings>> = [
  {
    key: "supported-extraction",
    label: "Extraction",
    fields: [
      {
        key: "layout",
        label: "Preserve layout spacing",
        type: "toggle",
      },
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
    ],
  },
  {
    key: "planned-cleanup",
    label: "Advanced Cleanup",
    render: () => (
      <UnsupportedOptionNote>
        Advanced cleanup options are planned. Current extraction uses the selected output format/layout supported by the backend.
      </UnsupportedOptionNote>
    ),
  },
];

export default function PdfExtractTextPage() {
  return (
    <SinglePdfWorkspacePage<ExtractTextSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("layout", String(settings.layout));
        formData.append("output_format", settings.outputFormat);
        return formData;
      }}
      description="Extract text using the backend-supported layout and output format options."
      downloadFilename={(file, settings) => `${slugifyBaseName(file.name)}.${settings.outputFormat}`}
      emptyDescription="Upload a PDF to review its pages before extracting text."
      endpoint="pdf/extract-text"
      initialSettings={initialSettings}
      sections={sections}
      title="Extract Text"
    />
  );
}
