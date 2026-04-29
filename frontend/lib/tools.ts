export type ToolCategory = "pdf" | "image" | "shared";

export type ToolDefinition = {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: ToolCategory;
  href: string;
  color: string;
};

export const tools: ToolDefinition[] = [
  {
    id: "merge",
    name: "Merge PDFs",
    description: "Combine multiple PDF files into a single organized document.",
    icon: "Files",
    category: "pdf",
    href: "/pdf/merge",
    color: "cyan",
  },
  {
    id: "split",
    name: "Split PDF",
    description: "Extract selected pages or break a large PDF into smaller parts.",
    icon: "Scissors",
    category: "pdf",
    href: "/pdf/split",
    color: "indigo",
  },
  {
    id: "rotate",
    name: "Rotate PDF",
    description: "Fix page orientation in seconds before downloading the final file.",
    icon: "RotateCw",
    category: "pdf",
    href: "/pdf/rotate",
    color: "violet",
  },
  {
    id: "pdf-watermark",
    name: "Watermark PDF",
    description: "Place text or logo watermarks across PDF pages.",
    icon: "Stamp",
    category: "pdf",
    href: "/pdf/watermark",
    color: "amber",
  },
  {
    id: "images-to-pdf",
    name: "Images to PDF",
    description: "Create a clean, shareable PDF from one or more images.",
    icon: "FileImage",
    category: "pdf",
    href: "/pdf/images-to-pdf",
    color: "rose",
  },
  {
    id: "protect",
    name: "Protect PDF",
    description: "Add password protection for secure document sharing.",
    icon: "Lock",
    category: "pdf",
    href: "/pdf/protect",
    color: "fuchsia",
  },
  {
    id: "decrypt",
    name: "Decrypt PDF",
    description: "Remove PDF password protection when you have access.",
    icon: "Unlock",
    category: "pdf",
    href: "/pdf/decrypt",
    color: "teal",
  },
  {
    id: "resize",
    name: "Resize Image",
    description: "Resize for web, documents, and batch workflows with clean output.",
    icon: "Expand",
    category: "image",
    href: "/image/resize",
    color: "emerald",
  },
  {
    id: "crop",
    name: "Crop Image",
    description: "Trim to the exact area you need with pixel-level control.",
    icon: "Crop",
    category: "image",
    href: "/image/crop",
    color: "rose",
  },
  {
    id: "rotate",
    name: "Rotate Image",
    description: "Rotate photos and artwork with quick angle adjustments.",
    icon: "RotateCw",
    category: "image",
    href: "/image/rotate",
    color: "violet",
  },
  {
    id: "watermark",
    name: "Watermark",
    description: "Apply branded text watermarks before publishing or sharing.",
    icon: "Stamp",
    category: "image",
    href: "/image/watermark",
    color: "amber",
  },
  {
    id: "remove-background",
    name: "Remove Background",
    description: "Cut out the subject and export with transparency.",
    icon: "Eraser",
    category: "image",
    href: "/image/remove-background",
    color: "fuchsia",
  },
  {
    id: "convert",
    name: "Convert",
    description: "Convert PDFs, Office files, spreadsheets, text, HTML, CSV, and images from one shared workspace.",
    icon: "RefreshCw",
    category: "shared",
    href: "/convert",
    color: "sky",
  },
  {
    id: "compress",
    name: "Compress",
    description: "Compress PDFs, images, Office files, text files, and archives.",
    icon: "FileArchive",
    category: "shared",
    href: "/compress",
    color: "cyan",
  },
  {
    id: "ocr",
    name: "OCR",
    description: "Extract text from PDFs and images",
    icon: "ScanSearch",
    category: "shared",
    href: "/tools/ocr",
    color: "teal",
  },
  {
    id: "batch-resize",
    name: "Batch Resize",
    description: "Resize many images at once by uploading a single zip archive.",
    icon: "Layers",
    category: "image",
    href: "/image/batch-resize",
    color: "indigo",
  },
  {
    id: "info",
    name: "Image Info",
    description: "Inspect dimensions, bands, format, and file size instantly.",
    icon: "Info",
    category: "image",
    href: "/image/info",
    color: "slate",
  },
];

export const pdfTools = tools.filter((tool) => tool.category === "pdf");
export const imageTools = tools.filter((tool) => tool.category === "image");
export const sharedTools = tools.filter((tool) => tool.category === "shared");
