"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { SinglePdfWorkspacePage } from "@/components/workspace/WorkspacePageBuilders";
import { slugifyBaseName } from "@/lib/format";

type CompressSettings = {
  addSuffix: boolean;
  colorMode: "rgb" | "cmyk" | "gray";
  colorProfile: "srgb" | "adobe-rgb" | "cmyk-coated";
  compatibilityLevel: "1.4" | "1.5" | "1.6" | "1.7";
  compressionType: "jpeg" | "jpeg2000" | "zip" | "lzw";
  downsampleImages: boolean;
  flattenTransparency: boolean;
  imageDpi: number;
  imageQuality: number;
  linearize: boolean;
  outputFilename: string;
  quality: "screen" | "ebook" | "printer" | "prepress";
  removeAnnotations: boolean;
  removeBookmarks: boolean;
  removeMetadata: boolean;
  subsetFonts: boolean;
};

const initialSettings: CompressSettings = {
  addSuffix: true,
  colorMode: "rgb",
  colorProfile: "srgb",
  compatibilityLevel: "1.4",
  compressionType: "jpeg",
  downsampleImages: true,
  flattenTransparency: false,
  imageDpi: 150,
  imageQuality: 85,
  linearize: true,
  outputFilename: "",
  quality: "ebook",
  removeAnnotations: false,
  removeBookmarks: false,
  removeMetadata: false,
  subsetFonts: true,
};

const sections: Array<ControlSection<CompressSettings>> = [
  {
    key: "compression-level",
    label: "Compression Level",
    fields: [
      {
        key: "quality",
        label: "Compression level",
        type: "radioCards",
        options: [
          {
            description: "Smallest file, 72 DPI, for web viewing only",
            label: "Screen",
            value: "screen",
          },
          {
            description: "Balanced, 150 DPI, good for most uses",
            label: "Ebook",
            value: "ebook",
          },
          {
            description: "High quality, 300 DPI, for printing",
            label: "Printer",
            value: "printer",
          },
          {
            description: "Maximum quality, 300 DPI, professional print",
            label: "Prepress",
            value: "prepress",
          },
        ],
      },
    ],
  },
  {
    key: "color-settings",
    label: "Color Settings",
    fields: [
      {
        key: "colorMode",
        label: "Color mode",
        type: "select",
        options: [
          { label: "RGB", value: "rgb" },
          { label: "CMYK", value: "cmyk" },
          { label: "Grayscale", value: "gray" },
        ],
      },
      {
        key: "colorProfile",
        label: "Color profile",
        type: "select",
        options: [
          { label: "sRGB", value: "srgb" },
          { label: "Adobe RGB", value: "adobe-rgb" },
          { label: "CMYK Coated", value: "cmyk-coated" },
        ],
      },
    ],
  },
  {
    key: "image-settings",
    label: "Image Settings",
    fields: [
      {
        key: "downsampleImages",
        label: "Downsample images",
        type: "toggle",
      },
      {
        key: "imageDpi",
        label: "Image resolution",
        type: "slider",
        min: 72,
        max: 300,
        valueSuffix: " DPI",
      },
      {
        key: "imageQuality",
        label: "Image quality",
        type: "slider",
        min: 1,
        max: 100,
      },
      {
        key: "compressionType",
        label: "Compression type",
        type: "select",
        options: [
          { label: "JPEG", value: "jpeg" },
          { label: "JPEG 2000", value: "jpeg2000" },
          { label: "ZIP", value: "zip" },
          { label: "LZW", value: "lzw" },
        ],
      },
    ],
  },
  {
    key: "advanced",
    label: "Advanced",
    fields: [
      {
        key: "compatibilityLevel",
        label: "PDF compatibility version",
        type: "select",
        options: [
          { label: "PDF 1.4", value: "1.4" },
          { label: "PDF 1.5", value: "1.5" },
          { label: "PDF 1.6", value: "1.6" },
          { label: "PDF 1.7", value: "1.7" },
        ],
      },
      { key: "flattenTransparency", label: "Flatten all transparency", type: "toggle" },
      { key: "removeMetadata", label: "Remove metadata", type: "toggle" },
      { key: "removeAnnotations", label: "Remove annotations", type: "toggle" },
      { key: "removeBookmarks", label: "Remove bookmarks", type: "toggle" },
      { key: "linearize", label: "Linearize for web", type: "toggle" },
      { key: "subsetFonts", label: "Subset fonts", type: "toggle" },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      {
        key: "outputFilename",
        label: "Output filename",
        type: "text",
        placeholder: "compressed-document.pdf",
      },
      {
        key: "addSuffix",
        label: "Add suffix -compressed",
        type: "toggle",
      },
    ],
  },
];

export default function PdfCompressPage() {
  return (
    <SinglePdfWorkspacePage<CompressSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("quality", settings.quality);
        formData.append("color_mode", settings.colorMode);
        formData.append("color_profile", settings.colorProfile);
        formData.append("downsample_images", String(settings.downsampleImages));
        formData.append("image_dpi", String(settings.imageDpi));
        formData.append("image_quality", String(settings.imageQuality));
        formData.append("compression_type", settings.compressionType);
        formData.append("compatibility_level", settings.compatibilityLevel);
        formData.append("flatten_transparency", String(settings.flattenTransparency));
        formData.append("remove_metadata", String(settings.removeMetadata));
        formData.append("remove_annotations", String(settings.removeAnnotations));
        formData.append("remove_bookmarks", String(settings.removeBookmarks));
        formData.append("linearize", String(settings.linearize));
        formData.append("subset_fonts", String(settings.subsetFonts));
        formData.append("output_filename", settings.outputFilename);
        return formData;
      }}
      description="Tune compression, cleanup, and output behavior from one workspace before sending the PDF to the backend."
      downloadFilename={(file, settings) => {
        const base = slugifyBaseName(file.name);
        if (settings.outputFilename.trim()) {
          return settings.outputFilename.trim().endsWith(".pdf")
            ? settings.outputFilename.trim()
            : `${settings.outputFilename.trim()}.pdf`;
        }
        return `${base}${settings.addSuffix ? "-compressed" : ""}.pdf`;
      }}
      emptyDescription="Upload a PDF to inspect pages, choose a compression profile, and export a smaller file."
      endpoint="pdf/compress"
      initialSettings={initialSettings}
      presets={[
        { label: "Web Ready", values: { quality: "screen", removeMetadata: true, colorMode: "rgb" } },
        { label: "Email", values: { quality: "ebook", flattenTransparency: true } },
        { label: "Archive", values: { quality: "prepress", colorMode: "cmyk", removeMetadata: false } },
        { label: "Max Compression", values: { quality: "screen", colorMode: "gray", removeMetadata: true } },
      ]}
      sections={sections}
      title="Compress PDF"
    />
  );
}
