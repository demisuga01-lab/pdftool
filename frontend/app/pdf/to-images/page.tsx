"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { UnsupportedOptionNote } from "@/components/workspace/UnsupportedOptionNote";
import { SinglePdfWorkspacePage } from "@/components/workspace/WorkspacePageBuilders";

type ToImagesSettings = {
  dpi: number;
  format: "png" | "jpeg" | "webp";
  jpegQuality: number;
  transparent: boolean;
};

const initialSettings: ToImagesSettings = {
  dpi: 150,
  format: "png",
  jpegQuality: 85,
  transparent: false,
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
    ],
  },
  {
    key: "pages",
    label: "Pages",
    render: () => (
      <UnsupportedOptionNote>
        Multi-page exports are packaged as ZIP. Page selection and custom naming are planned.
      </UnsupportedOptionNote>
    ),
  },
];

export default function PdfToImagesPage() {
  return (
    <SinglePdfWorkspacePage<ToImagesSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("dpi", String(settings.dpi));
        formData.append("format", settings.format);
        formData.append("jpeg_quality", String(settings.jpegQuality));
        formData.append("transparent", String(settings.transparent));
        return formData;
      }}
      description="Render page thumbnails in the browser, choose export settings, then generate an image set from the PDF."
      downloadFilename={(file, settings) =>
        `${file.name.replace(/\.pdf$/i, "")}-${settings.format}.zip`
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
