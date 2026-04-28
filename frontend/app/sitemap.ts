import type { MetadataRoute } from "next";

const baseUrl = "https://tools.wellfriend.online";

const routes = [
  "",
  "/about",
  "/contact",
  "/pricing",
  "/privacy",
  "/terms",
  "/pdf/compress",
  "/pdf/merge",
  "/pdf/split",
  "/pdf/rotate",
  "/pdf/extract-text",
  "/pdf/to-images",
  "/pdf/images-to-pdf",
  "/pdf/office-to-pdf",
  "/pdf/protect",
  "/pdf/decrypt",
  "/image/convert",
  "/image/resize",
  "/image/compress",
  "/image/crop",
  "/image/rotate",
  "/image/watermark",
  "/image/remove-background",
  "/image/ocr",
  "/image/batch-resize",
  "/image/info",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date("2026-04-25"),
  }));
}
