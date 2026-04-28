import type {
  ToolPreset,
  ToolSettingsMap,
  ToolId,
} from "@/lib/settings";

export const builtInPresets: {
  [Key in ToolId]: Array<ToolPreset<ToolSettingsMap[Key]>>;
} = {
  "pdf-compress": [
    {
      id: "web-ready",
      name: "Web Ready",
      description: "Small, lightweight PDFs tuned for browsers.",
      values: {
        quality: "screen",
        removeMetadata: true,
        colorMode: "rgb",
      },
    },
    {
      id: "email-attachment",
      name: "Email Attachment",
      description: "Balanced size and compatibility for sending.",
      values: {
        quality: "ebook",
        flattenTransparency: true,
      },
    },
    {
      id: "archive-quality",
      name: "Archive Quality",
      description: "Preserve quality and print fidelity.",
      values: {
        quality: "prepress",
        colorMode: "cmyk",
        removeMetadata: false,
        flattenTransparency: false,
      },
    },
    {
      id: "maximum-compression",
      name: "Maximum Compression",
      description: "Push size down aggressively.",
      values: {
        quality: "screen",
        colorMode: "gray",
        removeMetadata: true,
      },
    },
  ],
  "pdf-split": [],
  "pdf-to-images": [
    {
      id: "quick-preview",
      name: "Quick Preview",
      values: {
        dpi: 72,
        format: "jpeg",
        jpegQuality: 70,
      },
    },
    {
      id: "standard",
      name: "Standard",
      values: {
        dpi: 150,
        format: "png",
      },
    },
    {
      id: "print-quality",
      name: "Print Quality",
      values: {
        dpi: 300,
        format: "png",
        transparent: true,
      },
    },
    {
      id: "ultra-hd",
      name: "Ultra HD",
      values: {
        dpi: 600,
        format: "png",
      },
    },
  ],
  "pdf-merge": [],
  "pdf-rotate": [],
  "pdf-extract-text": [],
  "pdf-images-to-pdf": [],
  "pdf-office-to-pdf": [],
  "pdf-protect": [],
  "pdf-decrypt": [],
  "image-convert": [
    {
      id: "web-optimized",
      name: "Web Optimized",
      values: {
        format: "webp",
        quality: 82,
        preserveMetadata: false,
        colorSpace: "srgb",
      },
    },
    {
      id: "social-media",
      name: "Social Media",
      values: {
        format: "jpg",
        quality: 90,
        colorSpace: "srgb",
      },
    },
    {
      id: "print-ready",
      name: "Print Ready",
      values: {
        format: "tiff",
        preserveMetadata: true,
        colorSpace: "cmyk",
      },
    },
    {
      id: "thumbnail",
      name: "Thumbnail",
      values: {
        format: "jpg",
        quality: 75,
      },
    },
  ],
  "image-resize": [
    {
      id: "social-media-square",
      name: "Social Media Square",
      values: {
        width: 1080,
        height: 1080,
        fit: "cover",
        kernel: "lanczos3",
      },
    },
    {
      id: "twitter-header",
      name: "Twitter Header",
      values: {
        width: 1500,
        height: 500,
        fit: "cover",
      },
    },
    {
      id: "full-hd",
      name: "Full HD",
      values: {
        width: 1920,
        height: 1080,
        fit: "contain",
      },
    },
    {
      id: "thumbnail",
      name: "Thumbnail",
      values: {
        width: 300,
        height: 300,
        fit: "cover",
      },
    },
  ],
  "image-compress": [
    {
      id: "aggressive",
      name: "Aggressive",
      values: {
        quality: 60,
        stripMetadata: true,
        progressive: true,
      },
    },
    {
      id: "balanced",
      name: "Balanced",
      values: {
        quality: 82,
        progressive: true,
      },
    },
    {
      id: "lossless",
      name: "Lossless",
      values: {
        format: "png",
        quality: 100,
      },
    },
    {
      id: "web-fast",
      name: "Web Fast",
      values: {
        format: "webp",
        quality: 75,
        stripMetadata: true,
      },
    },
  ],
  "image-crop": [],
  "image-rotate": [],
  "image-watermark": [],
  "image-remove-background": [],
  "image-ocr": [],
  "image-batch-resize": [],
  "image-info": [],
};
