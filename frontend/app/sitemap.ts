import type { MetadataRoute } from "next";

import { getAllDocs } from "@/lib/docs";

const baseUrl = "https://tools.wellfriend.online";

const publicRoutes = [
  "/",
  "/about",
  "/contact",
  "/pricing",
  "/privacy",
  "/terms",
  "/settings",
  "/compress",
  "/convert",
  "/tools/ocr",
  "/pdf/merge",
  "/pdf/split",
  "/pdf/rotate",
  "/pdf/watermark",
  "/pdf/extract-text",
  "/pdf/to-images",
  "/pdf/images-to-pdf",
  "/pdf/office-to-pdf",
  "/pdf/protect",
  "/pdf/decrypt",
  "/image/resize",
  "/image/convert",
  "/image/crop",
  "/image/rotate",
  "/image/watermark",
  "/image/remove-background",
  "/image/batch-resize",
  "/image/info",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const docs = await getAllDocs();
  const docRoutes = docs
    .filter((doc) => !doc.noindex)
    .map((doc) => doc.href);

  const routes = [...new Set([...publicRoutes, ...docRoutes])];

  return routes.map((route) => ({
    url: `${baseUrl}${route === "/" ? "" : route}`,
    lastModified: new Date(),
  }));
}
