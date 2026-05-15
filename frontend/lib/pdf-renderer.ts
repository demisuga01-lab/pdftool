"use client";

export type RenderedPdfPage = {
  dataUrl: string;
  height: number;
  pageNumber: number;
  width: number;
};

const pageCache = new Map<string, RenderedPdfPage>();

async function getPdfModule() {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  }

  return pdfjs;
}

async function toSource(pdfUrl: string | File): Promise<{ key: string; url: string; revoke?: () => void }> {
  if (typeof pdfUrl === "string") {
    return { key: pdfUrl, url: pdfUrl };
  }

  const url = URL.createObjectURL(pdfUrl);
  return {
    key: `${pdfUrl.name}:${pdfUrl.size}:${pdfUrl.lastModified}`,
    url,
    revoke: () => URL.revokeObjectURL(url),
  };
}

function getTargetWidth(containerWidth?: number): number {
  if (typeof window === "undefined") {
    return containerWidth ?? 320;
  }

  return Math.max(containerWidth ?? Math.min(window.innerWidth - 48, 360), 180);
}

export async function renderPage(
  pdfUrl: string | File,
  pageNumber: number,
  containerWidth?: number,
): Promise<string> {
  const pages = await renderPdfDocument(pdfUrl, containerWidth);
  return pages[pageNumber - 1]?.dataUrl ?? "";
}

export async function renderAllPages(
  pdfUrl: string | File,
  containerWidth?: number,
): Promise<string[]> {
  const renderedPages = await renderPdfDocument(pdfUrl, containerWidth);
  return renderedPages.map((page) => page.dataUrl);
}

export async function renderPdfDocument(
  pdfUrl: string | File,
  containerWidth?: number,
): Promise<RenderedPdfPage[]> {
  const pdfjs = await getPdfModule();
  const source = await toSource(pdfUrl);
  const loadingTask = pdfjs.getDocument(source.url);

  try {
    const pdf = await loadingTask.promise;
    const pages: RenderedPdfPage[] = [];
    const targetWidth = getTargetWidth(containerWidth);
    const devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const cacheKey = `${source.key}:${pageNumber}:${targetWidth}`;
      const cached = pageCache.get(cacheKey);

      if (cached) {
        pages.push(cached);
        continue;
      }

      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.max((targetWidth / viewport.width) * devicePixelRatio, 1.5);
      const scaledViewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${(targetWidth * viewport.height) / viewport.width}px`;
      const context = canvas.getContext("2d");

      if (!context) {
        continue;
      }

      await page.render({ canvas, canvasContext: context, viewport: scaledViewport } as never).promise;

      const rendered: RenderedPdfPage = {
        dataUrl: canvas.toDataURL("image/png"),
        height: scaledViewport.height,
        pageNumber,
        width: scaledViewport.width,
      };

      pageCache.set(cacheKey, rendered);
      pages.push(rendered);
    }

    return pages;
  } finally {
    source.revoke?.();
  }
}
