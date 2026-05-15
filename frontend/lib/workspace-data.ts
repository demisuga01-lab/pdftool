"use client";

import { useEffect, useMemo, useState } from "react";

import type { ImageGridItem } from "@/components/workspace/ImageWorkspace";
import type { PdfFileCard, PdfPageCard } from "@/components/workspace/PDFWorkspace";
import { formatBytes, formatDimensions, formatFileType, joinMeta } from "@/lib/format";
import { getPdfInfo, getPdfPagePreviewUrl, getThumbnailUrl, type UploadedFileMetadata } from "@/lib/files";
import { loadImagePreview, loadImagePreviews, type ImagePreview } from "@/lib/image-preview";
import { renderPdfDocument } from "@/lib/pdf-renderer";

export function useObjectState<T extends Record<string, unknown>>(initialState: T) {
  const [state, setState] = useState<T>(initialState);

  const update = <K extends keyof T>(key: K, value: T[K]) => {
    setState((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const merge = (updates: Partial<T>) => {
    setState((current) => ({
      ...current,
      ...updates,
    }));
  };

  return { merge, setState, state, update };
}

export function usePdfPageItems(file: File | string | null) {
  const [items, setItems] = useState<PdfPageCard[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!file) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    renderPdfDocument(file, 300)
      .then((pages) => {
        if (cancelled) {
          return;
        }

        setItems(
          pages.map((page) => ({
            id: `page-${page.pageNumber}`,
            pageNumber: page.pageNumber,
            selected: false,
            thumbnail: page.dataUrl,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  const pageCount = items.length;
  const selectedCount = items.filter((item) => item.selected).length;

  return {
    items,
    loading,
    pageCount,
    selectedCount,
    setItems,
  };
}

export function useUploadedPdfPageItems(fileId: string | null, initialPageCount = 0) {
  const [items, setItems] = useState<PdfPageCard[]>([]);
  const [pageCount, setPageCount] = useState(initialPageCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!fileId) {
      setItems([]);
      setPageCount(0);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    getPdfInfo(fileId)
      .then((info) => {
        if (cancelled) {
          return;
        }
        const count = info.page_count || info.pages || initialPageCount || 1;
        setPageCount(count);
        setItems(
          Array.from({ length: count }, (_, index) => {
            const pageNumber = index + 1;
            return {
              id: `${fileId}-page-${pageNumber}`,
              pageNumber,
              selected: false,
              thumbnail: getPdfPagePreviewUrl(fileId, pageNumber, 45),
            };
          }),
        );
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "Preview failed, but processing may still work.");
          const count = initialPageCount || 1;
          setPageCount(count);
          setItems(
            Array.from({ length: count }, (_, index) => {
              const pageNumber = index + 1;
              return {
                id: `${fileId}-page-${pageNumber}`,
                pageNumber,
                selected: false,
                thumbnail: getThumbnailUrl(fileId),
              };
            }),
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileId, initialPageCount]);

  const selectedCount = items.filter((item) => item.selected).length;

  return {
    error,
    items,
    loading,
    pageCount,
    selectedCount,
    setItems,
  };
}

export function uploadedFileSummary(file: UploadedFileMetadata | null, extra?: string): string | undefined {
  if (!file) {
    return extra;
  }

  const metadata = file.metadata ?? {};
  const dimensions =
    typeof metadata.width === "number" && typeof metadata.height === "number"
      ? formatDimensions(metadata.width, metadata.height)
      : undefined;
  const pages =
    typeof metadata.page_count === "number"
      ? `${metadata.page_count} pages`
      : typeof file.pages === "number" && file.pages > 0
        ? `${file.pages} pages`
        : undefined;

  return joinMeta([
    dimensions ?? pages,
    formatBytes(file.size_bytes),
    formatFileType(String(metadata.format ?? file.extension), file.extension),
    extra,
  ]);
}

export function uploadedFileDetails(file: UploadedFileMetadata | null): Array<{ label: string; value: string }> {
  if (!file) {
    return [];
  }

  const metadata = file.metadata ?? {};
  const details: Array<{ label: string; value: string }> = [
    { label: "Original name", value: file.original_name },
    { label: "File ID", value: file.file_id },
    { label: "Type", value: formatFileType(String(metadata.format ?? file.extension), file.extension) },
    { label: "MIME type", value: file.mime_type || "application/octet-stream" },
    { label: "Size", value: formatBytes(file.size_bytes) },
  ];

  if (typeof metadata.page_count === "number") {
    details.push({ label: "Pages", value: String(metadata.page_count) });
  }
  if (typeof metadata.width === "number" && typeof metadata.height === "number") {
    details.push({ label: "Dimensions", value: formatDimensions(metadata.width, metadata.height) });
  }
  if (typeof metadata.bands === "number") {
    details.push({ label: "Bands", value: String(metadata.bands) });
  }
  if (typeof metadata.encrypted === "boolean") {
    details.push({ label: "Encrypted", value: metadata.encrypted ? "Yes" : "No" });
  }
  if (typeof metadata.needs_password === "boolean") {
    details.push({ label: "Needs password", value: metadata.needs_password ? "Yes" : "No" });
  }
  return details;
}

export function usePdfFileCards(files: File[]) {
  const [cards, setCards] = useState<PdfFileCard[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (files.length === 0) {
      setCards([]);
      return;
    }

    Promise.all(
      files.map(async (file, index) => {
        const pages = await renderPdfDocument(file, 180);
        return {
          fileName: file.name,
          id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
          pageCount: pages.length,
          sizeLabel: formatBytes(file.size),
          thumbnail: pages[0]?.dataUrl,
        } satisfies PdfFileCard;
      }),
    )
      .then((nextCards) => {
        if (!cancelled) {
          setCards(nextCards);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCards([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [files]);

  return cards;
}

export function useImagePreviewItems(files: File[]) {
  const [previews, setPreviews] = useState<ImagePreview[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (files.length === 0) {
      setPreviews([]);
      return;
    }

    loadImagePreviews(files)
      .then((nextPreviews) => {
        if (!cancelled) {
          setPreviews(nextPreviews);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreviews([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [files]);

  return previews;
}

export function useSingleImagePreview(file: File | null) {
  const [preview, setPreview] = useState<ImagePreview | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!file) {
      setPreview(null);
      return;
    }

    loadImagePreview(file)
      .then((nextPreview) => {
        if (!cancelled) {
          setPreview(nextPreview);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPreview(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [file]);

  return preview;
}

export function toImageGridItems(previews: ImagePreview[]): ImageGridItem[] {
  return previews.map((preview, index) => ({
    dimensionsLabel: formatDimensions(preview.width, preview.height),
    fileName: preview.file.name,
    id: `${preview.file.name}-${preview.file.size}-${preview.file.lastModified}-${index}`,
    preview: preview.dataUrl,
    sizeLabel: formatBytes(preview.size),
  }));
}

export function selectedPagesLabel(items: PdfPageCard[]): string {
  const selected = items.filter((item) => item.selected).map((item) => item.pageNumber);
  return selected.length > 0 ? selected.join(",") : "all";
}

export function fileSummary(file: File | null, extra?: string): string | undefined {
  if (!file) {
    return extra;
  }

  return joinMeta([formatBytes(file.size), extra]);
}

export function imageSummary(preview: ImagePreview | null): string | undefined {
  if (!preview) {
    return undefined;
  }

  return joinMeta([
    formatDimensions(preview.width, preview.height),
    formatBytes(preview.size),
    formatFileType(preview.format, preview.file.name.split(".").pop() ?? "image"),
  ]);
}

export function usePageSelection(items: PdfPageCard[], setItems: (items: PdfPageCard[]) => void) {
  const allSelected = useMemo(
    () => items.length > 0 && items.every((item) => item.selected),
    [items],
  );

  const selectAll = () => {
    setItems(items.map((item) => ({ ...item, selected: true })));
  };

  const deselectAll = () => {
    setItems(items.map((item) => ({ ...item, selected: false })));
  };

  const toggleItem = (id: string) => {
    setItems(items.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  return {
    allSelected,
    deselectAll,
    selectAll,
    toggleItem,
  };
}
