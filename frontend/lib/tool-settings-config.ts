import type { SettingSection } from "@/components/ui/ToolSettings";
import type {
  ImageBatchResizeSettings,
  ImageCompressSettings,
  ImageConvertSettings,
  ImageCropSettings,
  ImageOCRSettings,
  ImageResizeSettings,
  ImageRotateSettings,
  ImageWatermarkSettings,
  PDFCompressSettings,
  PDFExtractTextSettings,
  PDFMergeSettings,
  PDFRotateSettings,
  PDFSplitSettings,
  PDFToImagesSettings,
} from "@/lib/settings";

export const pdfCompressSections: Array<SettingSection<PDFCompressSettings>> = [
  {
    title: "Output profile",
    fields: [
      {
        key: "quality",
        label: "Quality",
        type: "select",
        options: [
          { label: "Screen", value: "screen" },
          { label: "eBook", value: "ebook" },
          { label: "Printer", value: "printer" },
          { label: "Prepress", value: "prepress" },
        ],
      },
      {
        key: "compatibilityLevel",
        label: "Compatibility level",
        type: "select",
        options: [
          { label: "PDF 1.4", value: "1.4" },
          { label: "PDF 1.5", value: "1.5" },
          { label: "PDF 1.7", value: "1.7" },
        ],
      },
    ],
  },
  {
    title: "Color and cleanup",
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
        key: "removeMetadata",
        label: "Remove metadata",
        type: "toggle",
      },
      {
        key: "flattenTransparency",
        label: "Flatten transparency",
        type: "toggle",
      },
    ],
  },
];

export const pdfToImagesSections: Array<SettingSection<PDFToImagesSettings>> = [
  {
    title: "Rendering",
    fields: [
      {
        key: "dpi",
        label: "DPI",
        type: "select",
        options: [
          { label: "72 DPI", value: 72 },
          { label: "150 DPI", value: 150 },
          { label: "300 DPI", value: 300 },
          { label: "600 DPI", value: 600 },
        ],
      },
      {
        key: "format",
        label: "Output format",
        type: "select",
        options: [
          { label: "PNG", value: "png" },
          { label: "JPEG", value: "jpeg" },
          { label: "WebP", value: "webp" },
        ],
      },
      {
        key: "jpegQuality",
        label: "JPEG quality",
        type: "range",
        min: 1,
        max: 100,
      },
      {
        key: "transparent",
        label: "Transparent background",
        type: "toggle",
      },
    ],
  },
];

export const pdfMergeSections: Array<SettingSection<PDFMergeSettings>> = [
  {
    title: "Document output",
    fields: [
      {
        key: "addBookmarks",
        label: "Preserve first file bookmarks",
        type: "toggle",
      },
      {
        key: "metadata_title",
        label: "Document title",
        type: "text",
        placeholder: "Merged PDF",
      },
    ],
  },
];

export const pdfSplitSections: Array<SettingSection<PDFSplitSettings>> = [
  {
    title: "File naming",
    fields: [
      {
        key: "namingPattern",
        label: "Naming pattern",
        type: "select",
        options: [
          { label: "page-{n}", value: "page-{n}" },
          { label: "output-{n}", value: "output-{n}" },
          { label: "{original}-{n}", value: "{original}-{n}" },
        ],
      },
      {
        key: "outputFormat",
        label: "Output mode",
        type: "select",
        options: [
          { label: "Ranges", value: "ranges" },
          { label: "Individual pages", value: "individual" },
        ],
      },
    ],
  },
];

export const pdfRotateSections: Array<SettingSection<PDFRotateSettings>> = [
  {
    title: "Rotation",
    fields: [
      {
        key: "angle",
        label: "Angle",
        type: "select",
        options: [
          { label: "90 deg", value: 90 },
          { label: "180 deg", value: 180 },
          { label: "270 deg", value: 270 },
        ],
      },
      {
        key: "pages",
        label: "Pages",
        type: "text",
        placeholder: "all or 1,3,5",
      },
    ],
  },
];

export const pdfExtractTextSections: Array<SettingSection<PDFExtractTextSettings>> = [
  {
    title: "Extraction",
    fields: [
      {
        key: "layout",
        label: "Preserve layout spacing",
        type: "toggle",
      },
    ],
  },
];

export const imageConvertSections: Array<SettingSection<ImageConvertSettings>> = [
  {
    title: "Format",
    fields: [
      {
        key: "format",
        label: "Output format",
        type: "select",
        options: [
          { label: "JPG", value: "jpg" },
          { label: "PNG", value: "png" },
          { label: "WebP", value: "webp" },
          { label: "AVIF", value: "avif" },
          { label: "TIFF", value: "tiff" },
        ],
      },
      {
        key: "quality",
        label: "Quality",
        type: "range",
        min: 1,
        max: 100,
      },
      {
        key: "preserveMetadata",
        label: "Preserve metadata",
        type: "toggle",
      },
      {
        key: "colorSpace",
        label: "Color space",
        type: "select",
        options: [
          { label: "sRGB", value: "srgb" },
          { label: "CMYK", value: "cmyk" },
          { label: "Grayscale", value: "gray" },
        ],
      },
    ],
  },
];

export const imageResizeSections: Array<SettingSection<ImageResizeSettings>> = [
  {
    title: "Dimensions",
    fields: [
      {
        key: "width",
        label: "Width",
        type: "number",
        min: 1,
      },
      {
        key: "height",
        label: "Height",
        type: "number",
        min: 1,
      },
    ],
  },
  {
    title: "Resampling",
    fields: [
      {
        key: "fit",
        label: "Fit mode",
        type: "select",
        options: [
          { label: "Cover", value: "cover" },
          { label: "Contain", value: "contain" },
          { label: "Fill", value: "fill" },
          { label: "Inside", value: "inside" },
          { label: "Outside", value: "outside" },
        ],
      },
      {
        key: "kernel",
        label: "Kernel",
        type: "select",
        options: [
          { label: "Nearest", value: "nearest" },
          { label: "Cubic", value: "cubic" },
          { label: "Lanczos2", value: "lanczos2" },
          { label: "Lanczos3", value: "lanczos3" },
        ],
      },
      {
        key: "withoutEnlargement",
        label: "Prevent enlargement",
        type: "toggle",
      },
      {
        key: "quality",
        label: "Output quality",
        type: "range",
        min: 1,
        max: 100,
      },
    ],
  },
];

export const imageCompressSections: Array<SettingSection<ImageCompressSettings>> = [
  {
    title: "Compression",
    fields: [
      {
        key: "quality",
        label: "Quality",
        type: "range",
        min: 1,
        max: 100,
      },
      {
        key: "format",
        label: "Output format",
        type: "select",
        options: [
          { label: "Auto", value: "auto" },
          { label: "JPG", value: "jpg" },
          { label: "PNG", value: "png" },
          { label: "WebP", value: "webp" },
        ],
      },
      {
        key: "progressive",
        label: "Progressive encoding",
        type: "toggle",
      },
      {
        key: "stripMetadata",
        label: "Strip metadata",
        type: "toggle",
      },
    ],
  },
];

export const imageCropSections: Array<SettingSection<ImageCropSettings>> = [
  {
    title: "Crop area",
    fields: [
      { key: "x", label: "X", type: "number", min: 0 },
      { key: "y", label: "Y", type: "number", min: 0 },
      { key: "width", label: "Width", type: "number", min: 1 },
      { key: "height", label: "Height", type: "number", min: 1 },
    ],
  },
];

export const imageRotateSections: Array<SettingSection<ImageRotateSettings>> = [
  {
    title: "Rotation",
    fields: [
      {
        key: "angle",
        label: "Angle",
        type: "select",
        options: [
          { label: "90 deg", value: 90 },
          { label: "180 deg", value: 180 },
          { label: "270 deg", value: 270 },
        ],
      },
    ],
  },
];

export const imageWatermarkSections: Array<SettingSection<ImageWatermarkSettings>> = [
  {
    title: "Watermark",
    fields: [
      {
        key: "text",
        label: "Text",
        type: "text",
        placeholder: "PDFTools",
      },
      {
        key: "opacity",
        label: "Opacity",
        type: "range",
        min: 0,
        max: 100,
      },
      {
        key: "position",
        label: "Position",
        type: "select",
        options: [
          { label: "Top left", value: "top-left" },
          { label: "Top", value: "top" },
          { label: "Top right", value: "top-right" },
          { label: "Left", value: "left" },
          { label: "Center", value: "center" },
          { label: "Right", value: "right" },
          { label: "Bottom left", value: "bottom-left" },
          { label: "Bottom", value: "bottom" },
          { label: "Bottom right", value: "bottom-right" },
        ],
      },
    ],
  },
];

export const imageOCRSections: Array<SettingSection<ImageOCRSettings>> = [
  {
    title: "Recognition",
    fields: [
      {
        key: "language",
        label: "Language",
        type: "select",
        options: [
          { label: "English", value: "eng" },
          { label: "Auto-detect", value: "eng+osd" },
        ],
      },
    ],
  },
];

export const imageBatchResizeSections: Array<SettingSection<ImageBatchResizeSettings>> = [
  {
    title: "Batch dimensions",
    fields: [
      { key: "width", label: "Width", type: "number", min: 1 },
      { key: "height", label: "Height", type: "number", min: 1 },
    ],
  },
];
