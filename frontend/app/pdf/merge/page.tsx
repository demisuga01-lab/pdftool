"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import {
  EmptyPdfWorkspaceState,
  PDFFileGrid,
  PDFWorkspace,
} from "@/components/workspace/PDFWorkspace";
import { estimateProcessingTime, formatBytes } from "@/lib/format";
import {
  getFileMetadata,
  getThumbnailUrl,
  uploadMultipleFilesToWorkspace,
  type UploadedFileMetadata,
  type UploadProgressHandler,
} from "@/lib/files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { uploadedFileDetails, useObjectState } from "@/lib/workspace-data";

type MergeSettings = {
  addBlankPage: boolean;
  addBookmarks: boolean;
  author: string;
  bookmarkNaming: "filename" | "custom";
  customBookmarkPrefix: string;
  outputFilename: string;
  pageNumbering: "none" | "restart" | "continuous";
  subject: string;
  title: string;
};

const sections: Array<ControlSection<MergeSettings>> = [
  {
    key: "output-settings",
    label: "Output Settings",
    fields: [
      { key: "addBookmarks", label: "Add bookmarks", type: "toggle" },
      {
        key: "bookmarkNaming",
        label: "Bookmark naming",
        type: "select",
        options: [
          { label: "Use filename", value: "filename" },
          { label: "Custom prefix", value: "custom" },
        ],
      },
      {
        key: "customBookmarkPrefix",
        label: "Custom prefix",
        type: "text",
        placeholder: "Document",
        show: (settings) => settings.bookmarkNaming === "custom",
      },
      { key: "addBlankPage", label: "Add blank page between documents", type: "toggle" },
      {
        key: "pageNumbering",
        label: "Page numbering",
        type: "select",
        options: [
          { label: "None", value: "none" },
          { label: "Restart per document", value: "restart" },
          { label: "Continuous", value: "continuous" },
        ],
      },
    ],
  },
  {
    key: "metadata",
    label: "Metadata",
    fields: [
      { key: "title", label: "Output title", type: "text", placeholder: "Merged PDF" },
      { key: "author", label: "Output author", type: "text", placeholder: "WellFriend" },
      { key: "subject", label: "Output subject", type: "text", placeholder: "Combined document" },
    ],
  },
  {
    key: "output",
    label: "Output",
    fields: [
      { key: "outputFilename", label: "Output filename", type: "text", placeholder: "merged.pdf" },
    ],
  },
];

export default function PdfMergePage() {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const uploadAbortRef = useRef<AbortController | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileMetas, setFileMetas] = useState<UploadedFileMetadata[]>([]);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "failure">("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadSpeedKBs, setUploadSpeedKBs] = useState(0);
  const [uploadRemainingSecs, setUploadRemainingSecs] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [uploadTotalBytes, setUploadTotalBytes] = useState(0);
  const { state: settings, update } = useObjectState<MergeSettings>({
    addBlankPage: false,
    addBookmarks: true,
    author: "",
    bookmarkNaming: "filename",
    customBookmarkPrefix: "",
    outputFilename: "merged.pdf",
    pageNumbering: "none",
    subject: "",
    title: "",
  });
  const totalBytes = useMemo(
    () => fileMetas.reduce((sum, file) => sum + file.size_bytes, 0) || files.reduce((sum, file) => sum + file.size, 0),
    [fileMetas, files],
  );
  const cards = useMemo(
    () =>
      fileMetas.map((file) => ({
        fileName: file.original_name,
        id: file.file_id,
        pageCount: Number(file.metadata?.page_count ?? file.pages ?? 0),
        sizeLabel: formatBytes(file.size_bytes),
        thumbnail: getThumbnailUrl(file.file_id),
      })),
    [fileMetas],
  );
  const job = useWorkspaceJob({
    filename: settings.outputFilename || "merged.pdf",
    prefix: "pdf",
  });
  const infoContent = useMemo(() => {
    const firstFile = fileMetas[0] ?? null;
    const details = uploadedFileDetails(firstFile);
    if (details.length === 0) {
      return null;
    }
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-500">Showing metadata for the first file in the current merge order.</p>
        {details.map((detail) => (
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0" key={detail.label}>
            <span className="text-slate-500">{detail.label}</span>
            <span className="max-w-[60%] text-right font-medium text-slate-900">{detail.value}</span>
          </div>
        ))}
      </div>
    );
  }, [fileMetas]);

  const syncFileQuery = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      if (ids.length > 0) {
        params.set("file_ids", ids.join(","));
      } else {
        params.delete("file_ids");
      }
      const query = params.toString();
      setQueryString(query);
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const handleUploadProgress: UploadProgressHandler = (progress) => {
    setUploadPercent(progress.percentage);
    setUploadSpeedKBs(progress.uploadSpeedKBs);
    setUploadRemainingSecs(progress.estimatedSecondsRemaining);
    setUploadedBytes(progress.uploadedBytes);
    setUploadTotalBytes(progress.totalBytes);
  };

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  const handleFilesSelected = useCallback(
    async (nextFiles: File[]) => {
      if (nextFiles.length === 0) {
        return;
      }

      uploadAbortRef.current?.abort();
      const controller = new AbortController();
      uploadAbortRef.current = controller;
      setFiles(nextFiles);
      setFileMetas([]);
      setUploadState("uploading");
      setUploadError(null);
      setUploadPercent(0);
      setUploadSpeedKBs(0);
      setUploadRemainingSecs(0);
      setUploadedBytes(0);
      setUploadTotalBytes(nextFiles.reduce((sum, file) => sum + file.size, 0));
      job.reset();

      try {
        const metadata = await uploadMultipleFilesToWorkspace(nextFiles, handleUploadProgress, controller.signal);
        setFileMetas(metadata);
        setUploadState("idle");
        syncFileQuery(metadata.map((file) => file.file_id));
      } catch (caughtError) {
        if (controller.signal.aborted) {
          return;
        }
        setUploadState("failure");
        setUploadError(caughtError instanceof Error ? caughtError.message : "Upload failed");
      }
    },
    [job, syncFileQuery],
  );

  const handleProcess = () => {
    if (fileMetas.length < 2) {
      return;
    }

    const formData = new FormData();
    fileMetas.forEach((file) => formData.append("file_ids", file.file_id));
    formData.append("add_bookmarks", String(settings.addBookmarks));
    formData.append("bookmark_naming", settings.bookmarkNaming);
    formData.append("custom_bookmark_prefix", settings.customBookmarkPrefix);
    formData.append("add_blank_page", String(settings.addBlankPage));
    formData.append("page_numbering", settings.pageNumbering);
    formData.append("metadata_title", settings.title);
    formData.append("metadata_author", settings.author);
    formData.append("metadata_subject", settings.subject);
    formData.append("output_filename", settings.outputFilename);
    job.process("pdf/merge", formData);
  };

  const handleReorder = (ids: string[]) => {
    const lookup = new Map(fileMetas.map((file) => [file.file_id, file]));
    const nextMetas = ids.map((id) => lookup.get(id)).filter(Boolean) as UploadedFileMetadata[];
    setFileMetas(nextMetas);
    syncFileQuery(nextMetas.map((file) => file.file_id));
  };

  useEffect(() => {
    const ids = (searchParams.get("file_ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (ids.length === 0 || fileMetas.length > 0) {
      return;
    }

    let cancelled = false;
    Promise.all(ids.map((id) => getFileMetadata(id)))
      .then((metadata) => {
        if (!cancelled) {
          setFileMetas(metadata);
          setUploadState("idle");
        }
      })
      .catch((caughtError: unknown) => {
        if (!cancelled) {
          setUploadState("failure");
          setUploadError(caughtError instanceof Error ? caughtError.message : "Uploaded files could not be loaded.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [fileMetas.length, searchParams]);

  return (
    <PDFWorkspace
      breadcrumbTitle="Merge PDFs"
      countLabel={files.length > 0 ? `${files.length} files` : undefined}
      description="Arrange PDF files in the order you want, fine-tune the merged document, and export a single package."
      downloadPanel={
        job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            estimatedTime={estimateProcessingTime(totalBytes, fileMetas.length)}
            jobId={job.jobId}
            onDownload={job.state === "success" ? job.download : undefined}
            onProcessAnother={() => {
              setFiles([]);
              setFileMetas([]);
              job.reset();
              syncFileQuery([]);
            }}
            onReedit={job.dismissPanel}
            state={job.state === "failure" ? "failure" : job.state === "success" ? "success" : job.state}
          />
        ) : null
      }
      emptyState={
        <EmptyPdfWorkspaceState
          description="Upload at least two PDFs to merge them in one ordered workspace."
          multiple
          onFilesSelected={(nextFiles) => {
            void handleFilesSelected(nextFiles);
          }}
        />
      }
      estimatedTime={estimateProcessingTime(totalBytes, fileMetas.length)}
      fileInfo={fileMetas.length > 0 ? formatBytes(totalBytes) : undefined}
      fileName={fileMetas.length > 0 ? `${fileMetas.length} files ready` : undefined}
      hasContent={fileMetas.length > 0}
      infoContent={infoContent}
      onDownload={job.state === "success" ? job.download : undefined}
      onProcess={handleProcess}
      onReset={() => {
        setFiles([]);
        setFileMetas([]);
        job.reset();
        syncFileQuery([]);
      }}
      processButtonDisabled={fileMetas.length < 2}
      processingLabel={
        uploadState === "uploading"
          ? "Uploading files"
          : uploadState === "failure"
            ? uploadError ?? "Upload failed"
            : job.processingLabel
      }
      renderCenter={
        <PDFFileGrid
          items={cards}
          onRemove={(id) =>
            setFileMetas((current) => {
              const next = current.filter((file) => file.file_id !== id);
              syncFileQuery(next.map((file) => file.file_id));
              return next;
            })
          }
          onReorder={(nextCards) => handleReorder(nextCards.map((card) => card.id))}
        />
      }
      rightPanel={
        <div className="space-y-6">
          <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 text-[13px] font-medium leading-6 text-slate-500">
            {uploadState === "failure"
              ? uploadError ?? "Upload failed."
              : job.state === "failure"
                ? job.error ?? "Merge failed."
              : "Drag files in the center canvas to define the final merge order."}
          </div>

          <div className="space-y-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
              File Order
            </p>
            <div className="space-y-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] p-3">
              {fileMetas.map((file, index) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-lg border border-white bg-white px-3 py-2 text-[13px]"
                  key={file.file_id}
                >
                  <span className="truncate text-slate-700">
                    {index + 1}. {file.original_name}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() =>
                        setFileMetas((current) => {
                          if (index === 0) return current;
                          const next = [...current];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          syncFileQuery(next.map((item) => item.file_id));
                          return next;
                        })
                      }
                      type="button"
                    >
                      Up
                    </button>
                    <button
                      className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 disabled:opacity-40"
                      disabled={index === fileMetas.length - 1}
                      onClick={() =>
                        setFileMetas((current) => {
                          if (index >= current.length - 1) return current;
                          const next = [...current];
                          [next[index], next[index + 1]] = [next[index + 1], next[index]];
                          syncFileQuery(next.map((item) => item.file_id));
                          return next;
                        })
                      }
                      type="button"
                    >
                      Down
                    </button>
                    <button
                      className="text-slate-400 transition hover:text-rose-500"
                      onClick={() =>
                        setFileMetas((current) => {
                          const next = current.filter((_, fileIndex) => fileIndex !== index);
                          syncFileQuery(next.map((item) => item.file_id));
                          return next;
                        })
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <WorkspaceControls sections={sections} state={settings} update={update} />
        </div>
      }
      showSelectionBar={false}
      showSizeToggle={false}
      uploadOverlay={
        files[0] && uploadState === "uploading" ? (
          <UploadProgress
            fileLabel="Uploading files"
            fileName={`${files.length} files`}
            fileSize={totalBytes}
            onCancel={() => uploadAbortRef.current?.abort()}
            percent={uploadPercent}
            remainingSecs={uploadRemainingSecs}
            speedKBs={uploadSpeedKBs}
            totalBytes={uploadTotalBytes}
            uploadedBytes={uploadedBytes}
          />
        ) : null
      }
    />
  );
}
