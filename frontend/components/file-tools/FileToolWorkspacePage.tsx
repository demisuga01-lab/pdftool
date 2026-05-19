"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileArchive, FileText, Hash, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

import { DownloadPanel } from "@/components/ui/DownloadPanel";
import { UploadProgress } from "@/components/ui/UploadProgress";
import { VirusScanBadge } from "@/components/ui/VirusScanBadge";
import { EmptyWorkspaceState } from "@/components/workspace/ImageWorkspace";
import { WorkspaceControls, type ControlSection } from "@/components/workspace/Controls";
import { FileWorkspaceGrid } from "@/components/workspace/FileWorkspaceGrid";
import { CompactWorkspaceShell, PreviewCard } from "@/components/workspace/WorkspaceShells";
import { UnifiedWorkspace } from "@/components/workspace/UnifiedWorkspace";
import { PUBLIC_FILE_HANDLING_STATEMENT } from "@/lib/copy";
import { estimateProcessingTime, formatBytes } from "@/lib/format";
import { useWorkspaceFiles, workspaceFileIds, type WorkspaceFileRecord } from "@/lib/use-workspace-files";
import { useWorkspaceJob } from "@/lib/workspace-job";
import { uploadedFileDetails, uploadedFileSummary, useObjectState } from "@/lib/workspace-data";

type SettingsState = Record<string, unknown>;

export type FileToolId =
  | "hash"
  | "checksum-verify"
  | "hash-batch"
  | "file-type"
  | "virus-scan"
  | "extension-check"
  | "metadata-view"
  | "metadata-clean"
  | "archive-create"
  | "archive-extract"
  | "archive-inspect"
  | "archive-safety"
  | "batch-rename"
  | "filename-sanitize"
  | "duplicate-find"
  | "file-compare"
  | "file-split"
  | "file-join"
  | "office-metadata-clean"
  | "office-media-extract"
  | "macro-check"
  | "filename-check"
  | "inventory-report"
  | "text-encoding-convert";

type UploadMode = "single" | "multi" | "compare" | "filename";
type ResultMode = "download" | "inline" | "inline-json-download";

type FileToolConfig = {
  accept?: string;
  description: string;
  initialSettings: SettingsState;
  layout: "compact" | "grid";
  minFiles?: number;
  note?: string;
  processLabel?: string;
  resultMode: ResultMode;
  sections: Array<ControlSection<SettingsState>>;
  title: string;
  toolId: FileToolId;
  uploadDescription: string;
  uploadMode: UploadMode;
};

const ANY_FILE_ACCEPT = "";
const ARCHIVE_ACCEPT = ".zip,.7z,.tar,.rar,.gz,.bz2,.xz";
const OFFICE_ACCEPT = ".docx,.xlsx,.pptx";
const OFFICE_MACRO_ACCEPT = ".docx,.xlsx,.pptx,.xlsm,.docm,.pptm";
const TEXT_ACCEPT = ".txt,.csv,.html,.xml,.json,.js,.ts,.css,.md,.log,text/*";
const FILE_TOOLS_MAX_FILE_SIZE_MB = 100;

const HASH_ALGORITHMS = [
  { label: "MD5", value: "md5" },
  { label: "SHA1", value: "sha1" },
  { label: "SHA256", value: "sha256" },
  { label: "SHA512", value: "sha512" },
  { label: "BLAKE2b", value: "blake2b" },
  { label: "CRC32", value: "crc32" },
];

const OFFICE_FIELDS = [
  "Author",
  "Company",
  "Last modified by",
  "Created date",
  "Modified date",
  "Revision number",
  "Description",
  "Keywords",
  "Subject",
  "Title",
  "Manager",
  "Category",
];

function selectedList(settings: SettingsState, key: string, fallback: string[]) {
  const value = settings[key];
  return Array.isArray(value) ? value.map(String) : fallback;
}

function AlgorithmChecklist({
  allOptions = HASH_ALGORITHMS,
  settings,
  settingKey,
  update,
}: {
  allOptions?: Array<{ label: string; value: string }>;
  settings: SettingsState;
  settingKey: string;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  const active = selectedList(settings, settingKey, allOptions.map((option) => option.value));

  return (
    <div className="grid gap-2">
      {allOptions.map((option) => {
        const checked = active.includes(option.value);
        return (
          <label
            className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            key={option.value}
          >
            <span>{option.label}</span>
            <input
              checked={checked}
              className="h-4 w-4 accent-emerald-700"
              onChange={() => {
                const next = checked
                  ? active.filter((item) => item !== option.value)
                  : [...active, option.value];
                update(settingKey, next.length > 0 ? next : [option.value]);
              }}
              type="checkbox"
            />
          </label>
        );
      })}
    </div>
  );
}

function FieldChecklist({
  fields,
  settings,
  settingKey,
  update,
}: {
  fields: string[];
  settings: SettingsState;
  settingKey: string;
  update: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}) {
  const active = selectedList(settings, settingKey, fields.map((field) => field.toLowerCase().replaceAll(" ", "_")));

  return (
    <div className="grid gap-2">
      {fields.map((field) => {
        const value = field.toLowerCase().replaceAll(" ", "_");
        const checked = active.includes(value);
        return (
          <label
            className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
            key={value}
          >
            <span>{field}</span>
            <input
              checked={checked}
              className="h-4 w-4 accent-emerald-700"
              onChange={() => {
                const next = checked ? active.filter((item) => item !== value) : [...active, value];
                update(settingKey, next);
              }}
              type="checkbox"
            />
          </label>
        );
      })}
    </div>
  );
}

function noSettingsSection(): Array<ControlSection<SettingsState>> {
  return [
    {
      key: "settings",
      label: "Settings",
      render: () => (
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          No additional settings are needed for this tool.
        </p>
      ),
    },
  ];
}

const fileToolConfigs: Record<FileToolId, FileToolConfig> = {
  hash: {
    toolId: "hash",
    title: "Hash Checker",
    description: "Generate cryptographic hashes for any file.",
    uploadDescription: "Upload one file to generate selected hashes.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    initialSettings: { algorithms: HASH_ALGORITHMS.map((item) => item.value) },
    note: "Use SHA256 or SHA512 for security purposes. MD5 and SHA1 are provided for compatibility only.",
    sections: [
      {
        key: "algorithms",
        label: "Algorithms",
        render: (settings, update) => <AlgorithmChecklist settings={settings} settingKey="algorithms" update={update} />,
      },
    ],
  },
  "checksum-verify": {
    toolId: "checksum-verify",
    title: "Checksum Verifier",
    description: "Verify a file matches an expected hash.",
    uploadDescription: "Upload one file and enter the expected hash.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    initialSettings: { algorithm: "sha256", expectedHash: "" },
    sections: [
      {
        key: "verification",
        label: "Verification",
        fields: [
          {
            key: "algorithm",
            label: "Algorithm",
            type: "select",
            options: HASH_ALGORITHMS.map((item) => ({ label: item.label, value: item.value })),
          },
          { key: "expectedHash", label: "Expected hash", type: "text", placeholder: "Paste expected hash" },
        ],
      },
    ],
  },
  "hash-batch": {
    toolId: "hash-batch",
    title: "Batch Hash Generator",
    description: "Generate hashes for multiple files at once.",
    uploadDescription: "Upload files to generate a downloadable hash report.",
    layout: "grid",
    uploadMode: "multi",
    resultMode: "download",
    initialSettings: { algorithms: ["md5", "sha1", "sha256", "sha512", "blake2b"], outputFormat: "json" },
    sections: [
      {
        key: "algorithms",
        label: "Algorithms",
        render: (settings, update) => (
          <AlgorithmChecklist
            allOptions={HASH_ALGORITHMS.filter((item) => item.value !== "crc32")}
            settings={settings}
            settingKey="algorithms"
            update={update}
          />
        ),
      },
      {
        key: "output",
        label: "Output",
        fields: [
          {
            key: "outputFormat",
            label: "Output format",
            type: "select",
            options: [
              { label: "JSON", value: "json" },
              { label: "CSV", value: "csv" },
            ],
          },
        ],
      },
    ],
  },
  "file-type": {
    toolId: "file-type",
    title: "File Type Detector",
    description: "Detect real file type from content, not just the extension.",
    uploadDescription: "Upload one file to detect its content type.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    initialSettings: {},
    sections: noSettingsSection(),
  },
  "virus-scan": {
    toolId: "virus-scan",
    title: "Virus Scanner",
    description: "Scan any file for known threats using ClamAV signature detection.",
    uploadDescription: "Upload any file to scan it with ClamAV signature detection.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    initialSettings: {},
    processLabel: "Scan File",
    note: "Detects known threats based on signatures. Does not detect zero-day or unknown threats.",
    sections: noSettingsSection(),
  },
  "extension-check": {
    toolId: "extension-check",
    title: "Extension Mismatch Checker",
    description: "Check if file extensions match their actual content type.",
    uploadDescription: "Upload multiple files or a ZIP archive to check for mismatches.",
    layout: "compact",
    uploadMode: "multi",
    resultMode: "download",
    initialSettings: {},
    sections: noSettingsSection(),
  },
  "metadata-view": {
    toolId: "metadata-view",
    title: "File Metadata Viewer",
    description: "Inspect embedded metadata in any file.",
    uploadDescription: "Upload one file to inspect embedded metadata.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    initialSettings: {},
    sections: noSettingsSection(),
  },
  "metadata-clean": {
    toolId: "metadata-clean",
    title: "Metadata Cleaner",
    description: "Strip embedded metadata from files before sharing.",
    uploadDescription: "Upload one file to remove selected metadata.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "download",
    initialSettings: { scope: "all", fields: ["author", "created", "modified", "gps", "camera", "software"] },
    note: "Removes metadata. Does not alter file content.",
    sections: [
      {
        key: "scope",
        label: "Scope",
        fields: [
          {
            key: "scope",
            label: "Scope",
            type: "select",
            options: [
              { label: "All metadata", value: "all" },
              { label: "Select fields", value: "select" },
            ],
          },
        ],
      },
      {
        key: "fields",
        label: "Fields",
        render: (settings, update) =>
          settings.scope === "select" ? (
            <FieldChecklist
              fields={["author", "created", "modified", "GPS", "camera", "software"]}
              settings={settings}
              settingKey="fields"
              update={update}
            />
          ) : null,
      },
    ],
  },
  "archive-create": {
    toolId: "archive-create",
    title: "Create Archive",
    description: "Package multiple files into a ZIP, 7Z, or TAR archive.",
    uploadDescription: "Upload files to package into an archive.",
    layout: "grid",
    uploadMode: "multi",
    resultMode: "download",
    initialSettings: { format: "zip", outputFilename: "" },
    sections: [
      {
        key: "archive",
        label: "Archive",
        fields: [
          {
            key: "format",
            label: "Format",
            type: "select",
            options: [
              { label: "ZIP", value: "zip" },
              { label: "7Z", value: "7z" },
              { label: "TAR", value: "tar" },
              { label: "TAR.GZ", value: "tar.gz" },
              { label: "TAR.BZ2", value: "tar.bz2" },
              { label: "TAR.XZ", value: "tar.xz" },
            ],
          },
          { key: "outputFilename", label: "Output filename", type: "text", placeholder: "archive.zip" },
        ],
      },
    ],
  },
  "archive-extract": {
    toolId: "archive-extract",
    title: "Extract Archive",
    description: "Extract files from ZIP, 7Z, TAR, RAR, and other archives.",
    uploadDescription: "Upload an archive to extract its contents.",
    layout: "grid",
    uploadMode: "single",
    resultMode: "download",
    accept: ARCHIVE_ACCEPT,
    initialSettings: { password: "" },
    note: "Archive contents are extracted temporarily and packaged for download.",
    sections: [
      {
        key: "password",
        label: "Password",
        fields: [{ key: "password", label: "Password", type: "password", placeholder: "Optional" }],
      },
    ],
  },
  "archive-inspect": {
    toolId: "archive-inspect",
    title: "Archive Inspector",
    description: "Preview archive contents without extracting.",
    uploadDescription: "Upload one archive to preview its file listing.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    accept: ARCHIVE_ACCEPT,
    initialSettings: {},
    sections: noSettingsSection(),
  },
  "archive-safety": {
    toolId: "archive-safety",
    title: "Archive Safety Check",
    description: "Scan an archive for suspicious paths, dangerous extensions, and zip bomb risk.",
    uploadDescription: "Upload one archive to check structural safety risks.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    accept: ARCHIVE_ACCEPT,
    initialSettings: {},
    note: "This checks for structural risks only. It is not antivirus scanning.",
    sections: noSettingsSection(),
  },
  "batch-rename": {
    toolId: "batch-rename",
    title: "Batch Rename",
    description: "Rename multiple files using a pattern.",
    uploadDescription: "Upload files to rename and download as a ZIP.",
    layout: "grid",
    uploadMode: "multi",
    resultMode: "download",
    initialSettings: { pattern: "{name}-{n}.{ext}", startNumber: 1, padding: 2, prefixText: "", suffixText: "", find: "", replace: "", caseMode: "none" },
    sections: [
      {
        key: "rename",
        label: "Rename Pattern",
        fields: [
          {
            key: "pattern",
            label: "Pattern",
            type: "text",
            placeholder: "{name} original name, {ext} extension, {n} number, {date} today's date",
          },
          { key: "startNumber", label: "Start number", type: "number", min: 1 },
          { key: "padding", label: "Padding", type: "number", min: 0 },
          { key: "prefixText", label: "Prefix", type: "text", placeholder: "Optional" },
          { key: "suffixText", label: "Suffix", type: "text", placeholder: "Optional" },
          { key: "find", label: "Find", type: "text", placeholder: "Optional" },
          { key: "replace", label: "Replace", type: "text", placeholder: "Optional" },
          {
            key: "caseMode",
            label: "Case",
            type: "select",
            options: [
              { label: "None", value: "none" },
              { label: "Uppercase", value: "upper" },
              { label: "Lowercase", value: "lower" },
              { label: "Title Case", value: "title" },
            ],
          },
        ],
      },
    ],
  },
  "filename-sanitize": {
    toolId: "filename-sanitize",
    title: "Filename Sanitizer",
    description: "Clean up filenames for safe cross-platform use.",
    uploadDescription: "Upload files to sanitize their filenames.",
    layout: "compact",
    uploadMode: "multi",
    resultMode: "download",
    initialSettings: { removeSpecialChars: true, replaceSpaces: "underscore", lowercase: false, removeUnicode: false, maxLength: 255 },
    sections: [
      {
        key: "sanitize",
        label: "Sanitize",
        fields: [
          { key: "removeSpecialChars", label: "Remove special characters", type: "toggle" },
          {
            key: "replaceSpaces",
            label: "Replace spaces",
            type: "select",
            options: [
              { label: "None", value: "none" },
              { label: "Underscore", value: "underscore" },
              { label: "Dash", value: "dash" },
            ],
          },
          { key: "lowercase", label: "Lowercase", type: "toggle" },
          { key: "removeUnicode", label: "Remove unicode", type: "toggle" },
          { key: "maxLength", label: "Max length", type: "number", min: 1 },
        ],
      },
    ],
  },
  "duplicate-find": {
    toolId: "duplicate-find",
    title: "Duplicate Finder",
    description: "Find duplicate files by content hash or similar filename.",
    uploadDescription: "Upload multiple files or a ZIP archive to find duplicates.",
    layout: "compact",
    uploadMode: "multi",
    resultMode: "inline-json-download",
    initialSettings: { method: "hash" },
    sections: [
      {
        key: "method",
        label: "Method",
        fields: [
          {
            key: "method",
            label: "Method",
            type: "select",
            options: [
              { label: "Exact match (hash)", value: "hash" },
              { label: "Similar filename", value: "filename" },
            ],
          },
        ],
      },
    ],
  },
  "file-compare": {
    toolId: "file-compare",
    title: "File Compare",
    description: "Compare two files to check if they are identical or see differences.",
    uploadDescription: "Upload File A and File B to compare them.",
    layout: "compact",
    uploadMode: "compare",
    resultMode: "inline",
    initialSettings: { mode: "binary" },
    sections: [
      {
        key: "mode",
        label: "Mode",
        fields: [
          {
            key: "mode",
            label: "Mode",
            type: "select",
            options: [
              { label: "Binary (identical check)", value: "binary" },
              { label: "Text (line diff)", value: "text" },
            ],
          },
        ],
      },
    ],
  },
  "file-split": {
    toolId: "file-split",
    title: "Split File",
    description: "Split any file into equal parts for easier transfer or storage.",
    uploadDescription: "Upload one file to split it into downloadable parts.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "download",
    initialSettings: { mode: "by_size", chunkSizeMb: 10, chunkCount: 2, outputPrefix: "" },
    note: "Download all parts to reassemble the file.",
    sections: [
      {
        key: "split",
        label: "Split",
        fields: [
          {
            key: "mode",
            label: "Mode",
            type: "select",
            options: [
              { label: "By size", value: "by_size" },
              { label: "By count", value: "by_count" },
            ],
          },
          { key: "chunkSizeMb", label: "Chunk size (MB)", type: "number", min: 1, show: (settings) => settings.mode === "by_size" },
          { key: "chunkCount", label: "Number of parts", type: "number", min: 2, show: (settings) => settings.mode === "by_count" },
          { key: "outputPrefix", label: "Output prefix", type: "text", placeholder: "Optional" },
        ],
      },
    ],
  },
  "file-join": {
    toolId: "file-join",
    title: "Join File Parts",
    description: "Reassemble a file from its split parts.",
    uploadDescription: "Upload all parts together. Parts are joined in filename order.",
    layout: "compact",
    uploadMode: "multi",
    minFiles: 2,
    resultMode: "download",
    initialSettings: { outputFilename: "" },
    note: "Upload all parts together. Parts are joined in filename order.",
    sections: [
      {
        key: "join",
        label: "Join",
        fields: [{ key: "outputFilename", label: "Output filename", type: "text", placeholder: "Optional" }],
      },
    ],
  },
  "office-metadata-clean": {
    toolId: "office-metadata-clean",
    title: "Office Metadata Cleaner",
    description: "Remove author, company, and revision history from Word, Excel, and PowerPoint files.",
    uploadDescription: "Upload a DOCX, XLSX, or PPTX file to clean metadata.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "download",
    accept: OFFICE_ACCEPT,
    initialSettings: { fieldsMode: "all", officeFields: OFFICE_FIELDS.map((field) => field.toLowerCase().replaceAll(" ", "_")) },
    sections: [
      {
        key: "fields",
        label: "Fields",
        fields: [
          {
            key: "fieldsMode",
            label: "Fields",
            type: "select",
            options: [
              { label: "All", value: "all" },
              { label: "Select", value: "select" },
            ],
          },
        ],
        render: (settings, update) =>
          settings.fieldsMode === "select" ? (
            <FieldChecklist fields={OFFICE_FIELDS} settings={settings} settingKey="officeFields" update={update} />
          ) : null,
      },
    ],
  },
  "office-media-extract": {
    toolId: "office-media-extract",
    title: "Office Media Extractor",
    description: "Extract embedded images and media from Office documents.",
    uploadDescription: "Upload a DOCX, XLSX, or PPTX file to extract embedded media.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "download",
    accept: OFFICE_ACCEPT,
    initialSettings: {},
    sections: noSettingsSection(),
  },
  "macro-check": {
    toolId: "macro-check",
    title: "Macro Checker",
    description: "Check if an Office file contains macros.",
    uploadDescription: "Upload an Office file to detect macro presence.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "inline",
    accept: OFFICE_MACRO_ACCEPT,
    initialSettings: {},
    note: "This detects structural patterns only. It is not antivirus scanning.",
    sections: noSettingsSection(),
  },
  "filename-check": {
    toolId: "filename-check",
    title: "Filename Safety Checker",
    description: "Check filenames for dangerous patterns, double extensions, and reserved names.",
    uploadDescription: "Upload a file or enter a filename to check.",
    layout: "compact",
    uploadMode: "filename",
    resultMode: "inline",
    initialSettings: { filename: "" },
    sections: [
      {
        key: "filename",
        label: "Filename",
        fields: [{ key: "filename", label: "Plain text filename", type: "text", placeholder: "report.pdf.exe" }],
      },
    ],
  },
  "inventory-report": {
    toolId: "inventory-report",
    title: "File Inventory Report",
    description: "Generate a report of files with type, size, hash, and metadata.",
    uploadDescription: "Upload files or a ZIP archive to generate an inventory report.",
    layout: "grid",
    uploadMode: "multi",
    resultMode: "download",
    initialSettings: { outputFormat: "json", includeHashes: false, includeMime: true },
    sections: [
      {
        key: "report",
        label: "Report",
        fields: [
          {
            key: "outputFormat",
            label: "Output format",
            type: "select",
            options: [
              { label: "JSON", value: "json" },
              { label: "CSV", value: "csv" },
            ],
          },
          { key: "includeHashes", label: "Include SHA256 hash", type: "toggle", helpText: "Slower for large batches." },
          { key: "includeMime", label: "Include MIME type", type: "toggle" },
        ],
      },
    ],
  },
  "text-encoding-convert": {
    toolId: "text-encoding-convert",
    title: "Text Encoding Converter",
    description: "Convert text file encoding and fix line endings.",
    uploadDescription: "Upload a text file to convert encoding and line endings.",
    layout: "compact",
    uploadMode: "single",
    resultMode: "download",
    accept: TEXT_ACCEPT,
    initialSettings: { fromEncoding: "auto-detect", toEncoding: "UTF-8", lineEndings: "preserve", removeBom: false, addBom: false },
    sections: [
      {
        key: "encoding",
        label: "Encoding",
        fields: [
          {
            key: "fromEncoding",
            label: "From encoding",
            type: "select",
            options: ["Auto-detect", "UTF-8", "UTF-16", "Latin-1", "Windows-1252", "ASCII"].map((value) => ({
              label: value,
              value: value === "Auto-detect" ? "auto-detect" : value,
            })),
          },
          {
            key: "toEncoding",
            label: "To encoding",
            type: "select",
            options: ["UTF-8", "UTF-16", "Latin-1", "Windows-1252", "ASCII"].map((value) => ({ label: value, value })),
          },
          {
            key: "lineEndings",
            label: "Line endings",
            type: "select",
            options: [
              { label: "Preserve", value: "preserve" },
              { label: "LF (Unix)", value: "lf" },
              { label: "CRLF (Windows)", value: "crlf" },
              { label: "CR (Mac)", value: "cr" },
            ],
          },
          { key: "removeBom", label: "Remove BOM", type: "toggle" },
          { key: "addBom", label: "Add BOM", type: "toggle" },
        ],
      },
    ],
  },
};

function statusCopy(config: FileToolConfig, uploadFailure: string | null, jobFailure: string | null, state: string, fileCount: number) {
  if (uploadFailure) {
    return uploadFailure;
  }
  if (jobFailure) {
    return jobFailure;
  }
  if (state === "success") {
    return config.resultMode === "download" ? "Result is ready to download." : "Result is ready below.";
  }
  if (state === "queued") {
    return "Queued and waiting for a worker.";
  }
  if (state === "processing" || state === "uploading") {
    return "Processing in progress.";
  }
  if (fileCount > 0) {
    return "Review settings, then run the tool.";
  }
  return config.uploadDescription;
}

function downloadPanelState(state: "idle" | "uploading" | "queued" | "processing" | "success" | "failure") {
  if (state === "success" || state === "failure" || state === "queued" || state === "processing") {
    return state;
  }
  return "processing";
}

function StatusBox({
  children,
  tone,
}: {
  children: string;
  tone: "default" | "success" | "error";
}) {
  return (
    <div
      className={[
        "rounded-2xl border px-4 py-3 text-[13px] font-medium leading-6 shadow-sm",
        tone === "error"
          ? "border-rose-200 bg-white text-rose-700 dark:border-rose-900 dark:bg-zinc-900 dark:text-rose-200"
          : tone === "success"
            ? "border-emerald-200 bg-white text-emerald-700 dark:border-emerald-900 dark:bg-zinc-900 dark:text-emerald-200"
            : "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function NoteBox({ children }: { children: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm leading-6 text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      {children}
    </div>
  );
}

function TemporaryResultNotice() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium leading-5 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
      <p>{PUBLIC_FILE_HANDLING_STATEMENT}</p>
      <p>Results may be cleaned up after the retention window.</p>
    </div>
  );
}

function fileInfoContent(file: WorkspaceFileRecord | null) {
  const details = uploadedFileDetails(file);
  if (details.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {details.map((detail) => (
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0 dark:border-zinc-800" key={detail.label}>
          <span className="text-zinc-500 dark:text-zinc-400">{detail.label}</span>
          <span className="max-w-[60%] text-right font-medium text-zinc-900 dark:text-zinc-100">{detail.value}</span>
        </div>
      ))}
    </div>
  );
}

function fileRows(files: WorkspaceFileRecord[]) {
  return files.map((file) => ({
    id: file.file_id,
    meta: [file.extension ? file.extension.toUpperCase() : undefined, formatBytes(file.size_bytes)].filter(Boolean).join(" / "),
    thumbnailUrl: file.thumbnail_url || undefined,
    title: file.display_name,
  }));
}

function FileListPreview({
  files,
  onAdd,
  onMove,
  onRemove,
  onReorder,
  title = "Input files",
}: {
  files: WorkspaceFileRecord[];
  onAdd?: () => void;
  onMove: (fileId: string, direction: -1 | 1) => void;
  onRemove: (fileId: string) => void;
  onReorder: (fileIds: string[]) => void;
  title?: string;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{files.length} {files.length === 1 ? "file" : "files"} ready.</p>
        </div>
        {onAdd ? (
          <button className="secondary-button min-h-10 px-3 text-sm" onClick={onAdd} type="button">
            Add files
          </button>
        ) : null}
      </div>
      <FileWorkspaceGrid
        items={fileRows(files)}
        onMove={onMove}
        onRemove={onRemove}
        onReorder={onReorder}
      />
    </section>
  );
}

function SingleFilePreview({ file }: { file: WorkspaceFileRecord }) {
  const isArchive = ["zip", "7z", "rar", "tar", "gz", "bz2", "xz"].includes(file.extension.toLowerCase());
  const Icon = isArchive ? FileArchive : FileText;

  return (
    <PreviewCard
      badges={[file.extension ? file.extension.toUpperCase() : undefined, formatBytes(file.size_bytes)].filter(Boolean) as string[]}
      description="Compact preview for this file job."
      icon={<Icon className="h-10 w-10" />}
      title={file.display_name}
    >
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-emerald-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-emerald-300">
          <Icon className="h-7 w-7" />
        </span>
        <p className="max-w-md text-sm font-medium leading-6 text-zinc-500 dark:text-zinc-400">
          {file.mime_type || "application/octet-stream"}
        </p>
      </div>
    </PreviewCard>
  );
}

function ValueTable({ rows }: { rows: Array<[string, unknown]> }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {rows.map(([label, value]) => (
          <div className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[180px_minmax(0,1fr)]" key={label}>
            <span className="font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
            <span className="break-words font-medium text-zinc-900 dark:text-zinc-100">
              {formatResultValue(value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResultShell({
  actions,
  children,
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">Result</p>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
        </div>
        {actions}
      </div>
      {children}
      <TemporaryResultNotice />
    </section>
  );
}

function formatResultValue(value: unknown): string {
  if (value == null || value === "") {
    return "--";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "--";
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((item) => formatResultValue(item)).join(", ") : "--";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function downloadJsonReport(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function GenericResult({ data }: { data: Record<string, unknown> }) {
  return <ValueTable rows={Object.entries(data)} />;
}

function InlineResult({
  data,
  resultMode,
  toolId,
}: {
  data: unknown;
  resultMode: ResultMode;
  toolId: FileToolId;
}) {
  if (!data || typeof data !== "object") {
    return null;
  }

  const result = data as Record<string, unknown>;
  const jsonAction =
    resultMode === "inline-json-download" ? (
      <button
        className="secondary-button min-h-10 px-3 text-sm"
        onClick={() => downloadJsonReport(`${toolId}-report.json`, result)}
        type="button"
      >
        Download JSON
      </button>
    ) : null;

  if (toolId === "hash") {
    const hashes = result.hashes && typeof result.hashes === "object" ? result.hashes as Record<string, unknown> : {};
    return (
      <ResultShell title="Generated hashes">
        <ValueTable rows={Object.entries(hashes).map(([key, value]) => [key.toUpperCase(), value])} />
      </ResultShell>
    );
  }

  if (toolId === "checksum-verify") {
    const match = Boolean(result.match);
    return (
      <ResultShell title={match ? "Checksum matches" : "Checksum does not match"}>
        <div className={[
          "rounded-2xl border px-4 py-3 text-sm font-semibold",
          match
            ? "border-emerald-200 bg-zinc-50 text-emerald-700 dark:border-emerald-900 dark:bg-zinc-950 dark:text-emerald-200"
            : "border-rose-200 bg-zinc-50 text-rose-700 dark:border-rose-900 dark:bg-zinc-950 dark:text-rose-200",
        ].join(" ")}>
          {match ? "The actual hash matches the expected hash." : "The actual hash differs from the expected hash."}
        </div>
        <ValueTable rows={[
          ["Algorithm", result.algorithm],
          ["Expected", result.expected],
          ["Actual", result.actual],
        ]} />
      </ResultShell>
    );
  }

  if (toolId === "file-type") {
    return (
      <ResultShell title="Detected file type">
        <ValueTable rows={[
          ["Detected MIME", result.detected_mime],
          ["Expected MIME", result.expected_mime],
          ["Extension", result.extension],
          ["Mismatch", result.mismatch],
          ["Warning", result.description],
        ]} />
      </ResultShell>
    );
  }

  if (toolId === "virus-scan") {
    const scanner = String(result.scanner ?? "");
    const unavailable = scanner === "unavailable";
    const clean = Boolean(result.clean);
    const filename = typeof result.filename === "string" ? result.filename : "Uploaded file";
    const size = typeof result.size_bytes === "number" ? formatBytes(result.size_bytes) : formatResultValue(result.size_bytes);

    if (unavailable) {
      return (
        <ResultShell title="Virus scanning is currently unavailable.">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <div className="flex items-start gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-zinc-500 dark:text-zinc-400" />
              <div>
                <p className="font-semibold">The file was not scanned.</p>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Try again later.</p>
              </div>
            </div>
          </div>
          <ValueTable rows={[
            ["Filename", filename],
            ["File size", size],
          ]} />
          <NoteBox>This scan uses ClamAV signature detection and identifies known threats. It does not detect zero-day exploits or unknown malware. Do not rely on this scan as your only security measure.</NoteBox>
        </ResultShell>
      );
    }

    return (
      <ResultShell title={clean ? "No threats detected" : "Threat detected"}>
        <div
          className={[
            "rounded-2xl border p-4",
            clean
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/20"
              : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            {clean ? (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
            ) : (
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
            )}
            <div>
              <p className={["font-semibold", clean ? "text-emerald-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"].join(" ")}>
                {clean ? "No threats detected" : "Threat detected"}
              </p>
              <p className={["mt-1 text-sm", clean ? "text-emerald-700 dark:text-emerald-200" : "text-red-700 dark:text-red-200"].join(" ")}>
                {clean ? "Scanned with ClamAV" : "This file was flagged by virus scanning. Do not open this file."}
              </p>
            </div>
          </div>
        </div>
        <ValueTable rows={[
          ["Filename", filename],
          ["File size", size],
          ["Scanner", clean ? "Scanned with ClamAV" : "ClamAV"],
        ]} />
        <NoteBox>This scan uses ClamAV signature detection and identifies known threats. It does not detect zero-day exploits or unknown malware. Do not rely on this scan as your only security measure.</NoteBox>
      </ResultShell>
    );
  }

  if (toolId === "metadata-view") {
    const metadata = result.metadata && typeof result.metadata === "object" ? result.metadata as Record<string, unknown> : result;
    return (
      <ResultShell title="Metadata">
        <ValueTable rows={Object.entries(metadata)} />
      </ResultShell>
    );
  }

  if (toolId === "archive-inspect") {
    const entries = Array.isArray(result.entries) ? result.entries as Array<Record<string, unknown>> : [];
    return (
      <ResultShell title="Archive contents">
        <ValueTable rows={[
          ["Format", result.format],
          ["Files", result.total_files],
          ["Total size", typeof result.total_size_bytes === "number" ? formatBytes(result.total_size_bytes) : result.total_size_bytes],
          ["Compressed size", typeof result.compressed_size_bytes === "number" ? formatBytes(result.compressed_size_bytes) : result.compressed_size_bytes],
        ]} />
        <div className="overflow-auto rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table className="min-w-full divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            <thead className="bg-zinc-50 dark:bg-zinc-950">
              <tr>
                {["Filename", "Size", "Compressed size", "Modified"].map((heading) => (
                  <th className="px-3 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-300" key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {entries.map((entry, index) => (
                <tr key={`${entry.name}-${index}`}>
                  <td className="max-w-[360px] truncate px-3 py-2 font-mono text-zinc-900 dark:text-zinc-100">{formatResultValue(entry.name)}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{typeof entry.size === "number" ? formatBytes(entry.size) : formatResultValue(entry.size)}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{typeof entry.compressed === "number" ? formatBytes(entry.compressed) : formatResultValue(entry.compressed)}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-300">{formatResultValue(entry.modified)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ResultShell>
    );
  }

  if (toolId === "archive-safety") {
    const warnings = Array.isArray(result.warnings) ? result.warnings as Array<Record<string, unknown>> : [];
    return (
      <ResultShell title={result.safe ? "Archive appears structurally safe" : "Archive needs review"}>
        <ValueTable rows={[
          ["Safe", result.safe],
          ["Member count", result.member_count],
          ["Estimated extracted size", typeof result.estimated_extracted_bytes === "number" ? formatBytes(result.estimated_extracted_bytes) : result.estimated_extracted_bytes],
          ["Compression ratio", result.compression_ratio],
        ]} />
        <WarningList warnings={warnings} emptyText="No structural warnings were reported." />
      </ResultShell>
    );
  }

  if (toolId === "duplicate-find") {
    const groups = Array.isArray(result.duplicate_groups) ? result.duplicate_groups as Array<Record<string, unknown>> : [];
    return (
      <ResultShell actions={jsonAction} title="Duplicate groups">
        <ValueTable rows={[
          ["Total files", result.total_files],
          ["Duplicate groups", groups.length],
          ["Estimated duplicate bytes", typeof result.wasted_bytes === "number" ? formatBytes(result.wasted_bytes) : result.wasted_bytes],
        ]} />
        <div className="grid gap-3">
          {groups.length > 0 ? groups.map((group, index) => (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950" key={String(group.hash ?? index)}>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Group {index + 1}</p>
              <p className="mt-1 break-all font-mono text-xs text-zinc-500 dark:text-zinc-400">{formatResultValue(group.hash)}</p>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{formatResultValue(group.files)}</p>
            </div>
          )) : (
            <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">No duplicates were found.</p>
          )}
        </div>
      </ResultShell>
    );
  }

  if (toolId === "file-compare") {
    return (
      <ResultShell title={result.identical ? "Files are identical" : "Files differ"}>
        <ValueTable rows={[
          ["Mode", result.mode],
          ["Identical", result.identical],
          ["File A size", typeof result.size_a === "number" ? formatBytes(result.size_a) : result.size_a],
          ["File B size", typeof result.size_b === "number" ? formatBytes(result.size_b) : result.size_b],
          ["Diff lines", result.diff_lines],
        ]} />
        {typeof result.diff_preview === "string" && result.diff_preview ? (
          <pre className="max-h-[520px] overflow-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs leading-5 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            {result.diff_preview}
          </pre>
        ) : null}
        {result.truncated ? <NoteBox>Diff preview was cut after the first 500 lines.</NoteBox> : null}
      </ResultShell>
    );
  }

  if (toolId === "macro-check") {
    const macrosFound = Boolean(result.macros_found);
    return (
      <ResultShell title={macrosFound ? "Macros found" : "No macros found"}>
        {macrosFound ? (
          <div className="rounded-2xl border border-amber-200 bg-zinc-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-800 dark:border-amber-900 dark:bg-zinc-950 dark:text-amber-200">
            This file contains macros. Review carefully before opening in Office applications.
          </div>
        ) : null}
        <ValueTable rows={[
          ["Macros found", result.macros_found],
          ["Type", result.macro_type],
          ["Locations", result.locations],
        ]} />
      </ResultShell>
    );
  }

  if (toolId === "filename-check") {
    const warnings = Array.isArray(result.warnings) ? result.warnings as Array<Record<string, unknown>> : [];
    return (
      <ResultShell title={result.safe ? "Filename appears safe" : "Filename needs review"}>
        <ValueTable rows={[
          ["Filename", result.filename],
          ["Safe", result.safe],
        ]} />
        <WarningList warnings={warnings} emptyText="No filename warnings were reported." />
      </ResultShell>
    );
  }

  return (
    <ResultShell actions={jsonAction} title="Tool result">
      <GenericResult data={result} />
    </ResultShell>
  );
}

function WarningList({
  emptyText,
  warnings,
}: {
  emptyText: string;
  warnings: Array<Record<string, unknown>>;
}) {
  if (warnings.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {warnings.map((warning, index) => (
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950" key={`${warning.type}-${index}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{formatResultValue(warning.type)}</p>
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              {formatResultValue(warning.severity ?? "warning")}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{formatResultValue(warning.detail)}</p>
        </div>
      ))}
    </div>
  );
}

function appendSettings(formData: FormData, config: FileToolConfig, settings: SettingsState) {
  switch (config.toolId) {
    case "hash":
    case "hash-batch":
      formData.append("algorithms", JSON.stringify(selectedList(settings, "algorithms", ["sha256"])));
      if (config.toolId === "hash-batch") {
        formData.append("output_format", String(settings.outputFormat || "json"));
      }
      return;
    case "checksum-verify":
      formData.append("algorithm", String(settings.algorithm || "sha256"));
      formData.append("expected_hash", String(settings.expectedHash || ""));
      return;
    case "metadata-clean":
      formData.append(
        "fields_to_remove",
        settings.scope === "select" ? JSON.stringify(selectedList(settings, "fields", [])) : "all",
      );
      return;
    case "archive-create":
      formData.append("format", String(settings.format || "zip"));
      formData.append("output_filename", String(settings.outputFilename || ""));
      return;
    case "archive-extract":
      formData.append("password", String(settings.password || ""));
      return;
    case "batch-rename":
      formData.append("pattern", String(settings.pattern || "{name}-{n}.{ext}"));
      formData.append("start_number", String(settings.startNumber || 1));
      formData.append("padding", String(settings.padding || 2));
      formData.append("prefix", String(settings.prefixText || ""));
      formData.append("suffix", String(settings.suffixText || ""));
      formData.append("find", String(settings.find || ""));
      formData.append("replace", String(settings.replace || ""));
      formData.append("case", String(settings.caseMode || "none"));
      return;
    case "filename-sanitize":
      formData.append("remove_special_chars", String(Boolean(settings.removeSpecialChars)));
      formData.append("replace_spaces", String(settings.replaceSpaces || "underscore"));
      formData.append("lowercase", String(Boolean(settings.lowercase)));
      formData.append("remove_unicode", String(Boolean(settings.removeUnicode)));
      formData.append("max_length", String(settings.maxLength || 255));
      return;
    case "duplicate-find":
      formData.append("method", String(settings.method || "hash"));
      return;
    case "file-compare":
      formData.append("mode", String(settings.mode || "binary"));
      return;
    case "file-split":
      formData.append("mode", String(settings.mode || "by_size"));
      formData.append("chunk_size_bytes", String(Math.max(1, Number(settings.chunkSizeMb || 1)) * 1024 * 1024));
      formData.append("chunk_count", String(settings.chunkCount || 2));
      formData.append("output_prefix", String(settings.outputPrefix || ""));
      return;
    case "file-join":
      formData.append("output_filename", String(settings.outputFilename || ""));
      return;
    case "office-metadata-clean":
      formData.append(
        "fields",
        settings.fieldsMode === "select" ? JSON.stringify(selectedList(settings, "officeFields", [])) : "all",
      );
      return;
    case "filename-check":
      formData.append("filename", String(settings.filename || ""));
      return;
    case "inventory-report":
      formData.append("output_format", String(settings.outputFormat || "json"));
      formData.append("include_hashes", String(Boolean(settings.includeHashes)));
      formData.append("include_mime", String(settings.includeMime !== false));
      return;
    case "text-encoding-convert":
      formData.append("from_encoding", String(settings.fromEncoding || "auto-detect"));
      formData.append("to_encoding", String(settings.toEncoding || "UTF-8"));
      formData.append("line_endings", String(settings.lineEndings || "preserve"));
      formData.append("remove_bom", String(Boolean(settings.removeBom)));
      formData.append("add_bom", String(Boolean(settings.addBom)));
      return;
    default:
      return;
  }
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Manifest file could not be read."));
    reader.readAsText(file);
  });
}

function outputFilename(config: FileToolConfig, settings: SettingsState) {
  if (config.toolId === "archive-create" && typeof settings.outputFilename === "string" && settings.outputFilename.trim()) {
    return settings.outputFilename.trim();
  }
  const extension = config.toolId === "inventory-report" || config.toolId === "hash-batch"
    ? String(settings.outputFormat || "json")
    : "zip";
  return `${config.toolId}.${extension}`;
}

function useFileQuerySync(files: ReturnType<typeof useWorkspaceFiles>, multiple: boolean) {
  const pathname = usePathname();
  const router = useRouter();
  const [queryString, setQueryString] = useState("");
  const searchParams = useMemo(() => new URLSearchParams(queryString), [queryString]);
  const fileIds = useMemo(() => workspaceFileIds(files.files), [files.files]);

  useEffect(() => {
    setQueryString(window.location.search.replace(/^\?/, ""));
  }, [pathname]);

  useEffect(() => {
    const ids = (searchParams.get(multiple ? "file_ids" : "file_id") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    if (ids.length === 0 || files.files.length > 0) {
      return;
    }
    void files.hydrateFromIds(multiple ? ids : ids.slice(0, 1));
  }, [files, files.files.length, multiple, searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("file_id");
    params.delete("file_ids");
    if (fileIds.length > 0) {
      params.set(multiple ? "file_ids" : "file_id", multiple ? fileIds.join(",") : fileIds[0]);
    }
    const nextQuery = params.toString();
    setQueryString(nextQuery);
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [fileIds, multiple, pathname, router, searchParams]);
}

function CompareUploadPanel({
  fileA,
  fileB,
  onSelectA,
  onSelectB,
}: {
  fileA: WorkspaceFileRecord | undefined;
  fileB: WorkspaceFileRecord | undefined;
  onSelectA: (files: File[]) => void;
  onSelectB: (files: File[]) => void;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {[
        { file: fileA, label: "File A", onSelect: onSelectA },
        { file: fileB, label: "File B", onSelect: onSelectB },
      ].map((slot) => (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900" key={slot.label}>
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{slot.label}</p>
          {slot.file ? (
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="truncate font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{slot.file.display_name}</p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{formatBytes(slot.file.size_bytes)}</p>
            </div>
          ) : (
            <div className="mt-3">
              <EmptyWorkspaceState
                accept={ANY_FILE_ACCEPT}
                description={`Upload ${slot.label}.`}
                onFilesSelected={slot.onSelect}
              />
            </div>
          )}
        </div>
      ))}
    </section>
  );
}

function StandardFileToolPage({ config }: { config: FileToolConfig }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const manifestInputRef = useRef<HTMLInputElement | null>(null);
  const multiple = config.uploadMode === "multi";
  const files = useWorkspaceFiles({
    accept: config.accept ?? ANY_FILE_ACCEPT,
    maxSizeMB: FILE_TOOLS_MAX_FILE_SIZE_MB,
    multiple,
    uploadScope: "file-tools",
  });
  useFileQuerySync(files, multiple);
  const { state: settings, update } = useObjectState(config.initialSettings);
  const [manifestFile, setManifestFile] = useState<File | null>(null);
  const totalBytes = useMemo(() => files.files.reduce((sum, file) => sum + file.size_bytes, 0), [files.files]);
  const firstFile = files.files[0] ?? null;
  const fileCount = files.files.length;
  const job = useWorkspaceJob({
    approximateFileSize: totalBytes > 0 ? formatBytes(totalBytes) : undefined,
    fileType: fileCount > 1 ? "multiple files" : firstFile?.extension,
    filename: outputFilename(config, settings),
    inputFileName: fileCount > 1 ? `${fileCount} files` : firstFile?.display_name,
    prefix: "file-tools",
    toolName: config.title,
  });

  const processDisabled =
    config.toolId === "checksum-verify"
      ? fileCount === 0 || !String(settings.expectedHash || "").trim()
      : fileCount < (config.minFiles ?? 1) || job.state === "uploading" || job.state === "queued" || job.state === "processing";

  const handleProcess = useCallback(async () => {
    if (processDisabled) {
      return;
    }
    const formData = new FormData();
    if (multiple) {
      files.files.forEach((file) => formData.append("file_ids", file.file_id));
    } else if (firstFile) {
      formData.append("file_id", firstFile.file_id);
    }
    appendSettings(formData, config, settings);
    if (config.toolId === "file-join" && manifestFile) {
      formData.append("manifest", await readTextFile(manifestFile));
    }
    void job.process(`file-tools/${config.toolId}`, formData, { timeoutKind: "heavy" });
  }, [config, files.files, firstFile, job, manifestFile, multiple, processDisabled, settings]);

  const resultData = job.state === "success" ? job.result?.result : null;
  const shouldShowDownloadPanel =
    config.resultMode === "download"
      ? fileCount > 0 && job.state !== "idle" && job.state !== "uploading" && !job.panelDismissed
      : fileCount > 0 && job.state !== "idle" && job.state !== "uploading" && job.state !== "success" && !job.panelDismissed;
  const downloadPanel = shouldShowDownloadPanel ? (
    <DownloadPanel
      error={job.error}
      errorDetails={job.errorDetails ?? null}
      estimatedTime={estimateProcessingTime(totalBytes, Math.max(fileCount, 1))}
      approxFileSize={totalBytes > 0 ? formatBytes(totalBytes) : undefined}
      fileName={fileCount > 1 ? `${fileCount} files` : firstFile?.display_name}
      fileType={fileCount > 1 ? "multiple files" : firstFile?.extension}
      jobId={job.jobId}
      notice={job.notice}
      onDownload={config.resultMode === "download" && job.state === "success" ? job.download : undefined}
      onProcessAnother={() => {
        files.resetFiles();
        setManifestFile(null);
        job.reset();
      }}
      onReedit={job.dismissPanel}
      rateLimitScope={job.rateLimitScope}
      state={downloadPanelState(job.state)}
      statusText={job.processingLabel ?? undefined}
      toolName={config.title}
    />
  ) : null;

  const settingsPanel = (
    <div className="space-y-6">
      <StatusBox
        tone={files.uploadState === "failure" || job.state === "failure" ? "error" : job.state === "success" ? "success" : "default"}
      >
        {statusCopy(config, files.uploadError, job.error, files.uploadState === "failure" ? "failure" : job.state, fileCount)}
      </StatusBox>
      <WorkspaceControls sections={config.sections} state={settings} update={update} />
      {config.toolId === "file-join" ? (
        <div className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Manifest</p>
          <input
            className="hidden"
            onChange={(event) => setManifestFile(event.target.files?.[0] ?? null)}
            ref={manifestInputRef}
            type="file"
          />
          <button className="secondary-button min-h-10 w-full px-3 text-sm" onClick={() => manifestInputRef.current?.click()} type="button">
            {manifestFile ? manifestFile.name : "Upload optional manifest"}
          </button>
        </div>
      ) : null}
      {config.note ? <NoteBox>{config.note}</NoteBox> : null}
    </div>
  );

  const preview = fileCount === 0 ? null : multiple ? (
    <FileListPreview
      files={files.files}
      onAdd={() => inputRef.current?.click()}
      onMove={files.moveFile}
      onRemove={(fileId) => {
        files.removeFile(fileId);
        job.reset();
      }}
      onReorder={files.reorderFiles}
    />
  ) : firstFile ? (
    <SingleFilePreview file={firstFile} />
  ) : null;

  const resultPanel =
    config.resultMode !== "download" && resultData ? (
      <InlineResult data={resultData} resultMode={config.resultMode} toolId={config.toolId} />
    ) : null;

  const emptyState = (
    <div className="space-y-3">
      <EmptyWorkspaceState
        accept={config.accept ?? ANY_FILE_ACCEPT}
        description={`${config.uploadDescription} Files up to ${FILE_TOOLS_MAX_FILE_SIZE_MB} MB are supported.`}
        multiple={multiple}
        onFilesSelected={(nextFiles) => {
          void files.addFiles(nextFiles, multiple ? "append" : "replace");
          job.reset();
        }}
      />
      <VirusScanBadge />
    </div>
  );

  const uploadOverlay =
    files.uploadState === "uploading" && files.pendingFiles.length > 0 ? (
      <UploadProgress
        fileLabel="Uploading files"
        fileName={files.pendingFiles.length > 1 ? `${files.pendingFiles.length} files` : files.pendingFiles[0].name}
        fileSize={files.pendingFiles.reduce((sum, file) => sum + file.size, 0)}
        onCancel={files.cancelUpload}
        percent={files.uploadPercent}
        remainingSecs={files.uploadRemainingSecs}
        speedKBs={files.uploadSpeedKBs}
        totalBytes={files.uploadTotalBytes}
        uploadedBytes={files.uploadedBytes}
      />
    ) : null;

  return (
    <>
      <input
        accept={config.accept ?? ANY_FILE_ACCEPT}
        className="hidden"
        multiple={multiple}
        onChange={(event) => {
          void files.addFiles(Array.from(event.target.files ?? []), multiple ? "append" : "replace");
          job.reset();
        }}
        ref={inputRef}
        type="file"
      />
      {config.layout === "grid" ? (
        <UnifiedWorkspace
          countLabel={fileCount > 0 ? `${fileCount} ${fileCount === 1 ? "file" : "files"}` : undefined}
          description={config.description}
          downloadPanel={downloadPanel}
          editor={preview}
          emptyState={emptyState}
          estimatedTime={fileCount > 0 ? estimateProcessingTime(totalBytes, fileCount) : undefined}
          fileInfo={fileCount > 0 ? formatBytes(totalBytes) : undefined}
          fileName={fileCount > 0 ? `${fileCount} files ready` : undefined}
          hasContent={fileCount > 0}
          infoContent={fileInfoContent(firstFile)}
          kind="grid"
          onDownload={config.resultMode === "download" && job.state === "success" ? job.download : undefined}
          onFilesDropped={(nextFiles) => {
            void files.addFiles(nextFiles, multiple ? "append" : "replace");
            job.reset();
          }}
          onProcess={() => {
            void handleProcess();
          }}
          onReset={() => {
            files.resetFiles();
            setManifestFile(null);
            job.reset();
          }}
          processButtonDisabled={processDisabled}
          processButtonLabel={config.processLabel ?? config.title}
          processingLabel={files.uploadState === "uploading" ? "Uploading files" : files.uploadState === "failure" ? files.uploadError : job.processingLabel}
          resultPanel={resultPanel}
          settingsPanel={settingsPanel}
          title={config.title}
          uploadOverlay={uploadOverlay}
        />
      ) : (
        <CompactWorkspaceShell
          countLabel={fileCount > 0 ? `${fileCount} ${fileCount === 1 ? "file" : "files"}` : undefined}
          description={config.description}
          downloadPanel={downloadPanel}
          emptyState={emptyState}
          estimatedTime={fileCount > 0 ? estimateProcessingTime(totalBytes, fileCount) : undefined}
          fileInfo={firstFile ? uploadedFileSummary(firstFile) : fileCount > 0 ? formatBytes(totalBytes) : undefined}
          fileName={fileCount > 1 ? `${fileCount} files ready` : firstFile?.display_name}
          hasContent={fileCount > 0}
          infoContent={fileInfoContent(firstFile)}
          onDownload={config.resultMode === "download" && job.state === "success" ? job.download : undefined}
          onFilesDropped={(nextFiles) => {
            void files.addFiles(nextFiles, multiple ? "append" : "replace");
            job.reset();
          }}
          onProcess={() => {
            void handleProcess();
          }}
          onReset={() => {
            files.resetFiles();
            setManifestFile(null);
            job.reset();
          }}
          preview={preview}
          processButtonDisabled={processDisabled}
          processButtonLabel={config.processLabel ?? config.title}
          processingLabel={files.uploadState === "uploading" ? "Uploading files" : files.uploadState === "failure" ? files.uploadError : job.processingLabel}
          resultPanel={resultPanel}
          settingsPanel={settingsPanel}
          title={config.title}
          uploadOverlay={uploadOverlay}
        />
      )}
    </>
  );
}

function CompareFileToolPage({ config }: { config: FileToolConfig }) {
  const filesA = useWorkspaceFiles({
    accept: config.accept ?? ANY_FILE_ACCEPT,
    maxSizeMB: FILE_TOOLS_MAX_FILE_SIZE_MB,
    multiple: false,
    uploadScope: "file-tools",
  });
  const filesB = useWorkspaceFiles({
    accept: config.accept ?? ANY_FILE_ACCEPT,
    maxSizeMB: FILE_TOOLS_MAX_FILE_SIZE_MB,
    multiple: false,
    uploadScope: "file-tools",
  });
  const { state: settings, update } = useObjectState(config.initialSettings);
  const fileA = filesA.files[0];
  const fileB = filesB.files[0];
  const totalBytes = (fileA?.size_bytes ?? 0) + (fileB?.size_bytes ?? 0);
  const job = useWorkspaceJob({
    approximateFileSize: totalBytes > 0 ? formatBytes(totalBytes) : undefined,
    fileType: "two files",
    filename: "file-compare.json",
    inputFileName: fileA && fileB ? `${fileA.display_name} and ${fileB.display_name}` : undefined,
    prefix: "file-tools",
    toolName: config.title,
  });
  const disabled = !fileA || !fileB || job.state === "uploading" || job.state === "queued" || job.state === "processing";

  const handleProcess = () => {
    if (!fileA || !fileB || disabled) {
      return;
    }
    const formData = new FormData();
    formData.append("file_id_a", fileA.file_id);
    formData.append("file_id_b", fileB.file_id);
    appendSettings(formData, config, settings);
    void job.process(`file-tools/${config.toolId}`, formData);
  };

  const uploadOverlay =
    filesA.uploadState === "uploading" || filesB.uploadState === "uploading" ? (
      <UploadProgress
        fileLabel="Uploading file"
        fileName={(filesA.pendingFiles[0] ?? filesB.pendingFiles[0])?.name ?? "File"}
        fileSize={(filesA.pendingFiles[0] ?? filesB.pendingFiles[0])?.size ?? 0}
        percent={Math.max(filesA.uploadPercent, filesB.uploadPercent)}
        speedKBs={Math.max(filesA.uploadSpeedKBs, filesB.uploadSpeedKBs)}
      />
    ) : null;

  const resultPanel = job.state === "success" && job.result?.result ? (
    <InlineResult data={job.result.result} resultMode={config.resultMode} toolId={config.toolId} />
  ) : null;

  return (
    <CompactWorkspaceShell
      countLabel={[fileA, fileB].filter(Boolean).length === 2 ? "2 files" : undefined}
      description={config.description}
      downloadPanel={
        job.state !== "idle" && job.state !== "uploading" && job.state !== "success" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            errorDetails={job.errorDetails ?? null}
            estimatedTime={estimateProcessingTime(totalBytes, 2)}
            approxFileSize={totalBytes > 0 ? formatBytes(totalBytes) : undefined}
            fileName={fileA && fileB ? "Two files" : undefined}
            fileType="comparison"
            jobId={job.jobId}
            notice={job.notice}
            onProcessAnother={() => {
              filesA.resetFiles();
              filesB.resetFiles();
              job.reset();
            }}
            onReedit={job.dismissPanel}
            rateLimitScope={job.rateLimitScope}
            state={downloadPanelState(job.state)}
            statusText={job.processingLabel ?? undefined}
            toolName={config.title}
          />
        ) : null
      }
      emptyState={
        <div className="space-y-3">
          <CompareUploadPanel
            fileA={fileA}
            fileB={fileB}
            onSelectA={(nextFiles) => {
              void filesA.addFiles(nextFiles, "replace");
              job.reset();
            }}
            onSelectB={(nextFiles) => {
              void filesB.addFiles(nextFiles, "replace");
              job.reset();
            }}
          />
          <p className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Files up to {FILE_TOOLS_MAX_FILE_SIZE_MB} MB are supported.
          </p>
          <VirusScanBadge />
        </div>
      }
      estimatedTime={totalBytes > 0 ? estimateProcessingTime(totalBytes, 2) : undefined}
      fileInfo={totalBytes > 0 ? formatBytes(totalBytes) : undefined}
      fileName={fileA && fileB ? "Two files ready" : undefined}
      hasContent={Boolean(fileA || fileB)}
      onFilesDropped={(nextFiles) => {
        if (nextFiles[0]) {
          void filesA.addFiles([nextFiles[0]], "replace");
        }
        if (nextFiles[1]) {
          void filesB.addFiles([nextFiles[1]], "replace");
        }
        job.reset();
      }}
      onProcess={handleProcess}
      onReset={() => {
        filesA.resetFiles();
        filesB.resetFiles();
        job.reset();
      }}
      preview={
        <CompareUploadPanel
          fileA={fileA}
          fileB={fileB}
          onSelectA={(nextFiles) => {
            void filesA.addFiles(nextFiles, "replace");
            job.reset();
          }}
          onSelectB={(nextFiles) => {
            void filesB.addFiles(nextFiles, "replace");
            job.reset();
          }}
        />
      }
      processButtonDisabled={disabled}
      processButtonLabel={config.title}
      processingLabel={filesA.uploadState === "uploading" || filesB.uploadState === "uploading" ? "Uploading files" : job.processingLabel}
      resultPanel={resultPanel}
      settingsPanel={
        <div className="space-y-6">
          <StatusBox tone={job.state === "failure" ? "error" : job.state === "success" ? "success" : "default"}>
            {statusCopy(config, filesA.uploadError ?? filesB.uploadError, job.error, job.state, [fileA, fileB].filter(Boolean).length)}
          </StatusBox>
          <WorkspaceControls sections={config.sections} state={settings} update={update} />
        </div>
      }
      title={config.title}
      uploadOverlay={uploadOverlay}
    />
  );
}

function FilenameCheckToolPage({ config }: { config: FileToolConfig }) {
  const files = useWorkspaceFiles({
    accept: ANY_FILE_ACCEPT,
    maxSizeMB: FILE_TOOLS_MAX_FILE_SIZE_MB,
    multiple: false,
    uploadScope: "file-tools",
  });
  const { state: settings, update } = useObjectState(config.initialSettings);
  const file = files.files[0];
  const hasFilename = String(settings.filename || "").trim().length > 0;
  const job = useWorkspaceJob({
    approximateFileSize: file ? formatBytes(file.size_bytes) : undefined,
    fileType: file?.extension ?? "filename",
    filename: "filename-check.json",
    inputFileName: file?.display_name ?? String(settings.filename || ""),
    prefix: "file-tools",
    toolName: config.title,
  });
  const disabled = (!file && !hasFilename) || job.state === "uploading" || job.state === "queued" || job.state === "processing";

  const handleProcess = () => {
    if (disabled) {
      return;
    }
    const formData = new FormData();
    if (file) {
      formData.append("file_id", file.file_id);
    }
    appendSettings(formData, config, settings);
    void job.process(`file-tools/${config.toolId}`, formData);
  };

  return (
    <CompactWorkspaceShell
      countLabel={file ? "File" : hasFilename ? "Filename" : undefined}
      description={config.description}
      downloadPanel={
        job.state !== "idle" && job.state !== "uploading" && job.state !== "success" && !job.panelDismissed ? (
          <DownloadPanel
            error={job.error}
            errorDetails={job.errorDetails ?? null}
            fileName={file?.display_name ?? String(settings.filename || "")}
            fileType="filename"
            jobId={job.jobId}
            notice={job.notice}
            onProcessAnother={() => {
              files.resetFiles();
              job.reset();
            }}
            onReedit={job.dismissPanel}
            rateLimitScope={job.rateLimitScope}
            state={downloadPanelState(job.state)}
            statusText={job.processingLabel ?? undefined}
            toolName={config.title}
          />
        ) : null
      }
      emptyState={
        <div className="space-y-3">
          <EmptyWorkspaceState
            accept={ANY_FILE_ACCEPT}
            description={`${config.uploadDescription} Files up to ${FILE_TOOLS_MAX_FILE_SIZE_MB} MB are supported.`}
            onFilesSelected={(nextFiles) => {
              void files.addFiles(nextFiles, "replace");
              job.reset();
            }}
          />
          <VirusScanBadge />
        </div>
      }
      fileInfo={file ? uploadedFileSummary(file) : undefined}
      fileName={file?.display_name ?? (hasFilename ? String(settings.filename) : undefined)}
      hasContent={Boolean(file || hasFilename)}
      infoContent={fileInfoContent(file ?? null)}
      onFilesDropped={(nextFiles) => {
        void files.addFiles(nextFiles, "replace");
        job.reset();
      }}
      onProcess={handleProcess}
      onReset={() => {
        files.resetFiles();
        job.reset();
      }}
      preview={file ? <SingleFilePreview file={file} /> : (
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Filename input</p>
          <p className="mt-2 break-all font-mono text-sm text-zinc-600 dark:text-zinc-300">{String(settings.filename)}</p>
        </section>
      )}
      processButtonDisabled={disabled}
      processButtonLabel={config.title}
      processingLabel={files.uploadState === "uploading" ? "Uploading file" : job.processingLabel}
      resultPanel={job.state === "success" && job.result?.result ? <InlineResult data={job.result.result} resultMode={config.resultMode} toolId={config.toolId} /> : null}
      settingsPanel={
        <div className="space-y-6">
          <StatusBox tone={job.state === "failure" ? "error" : job.state === "success" ? "success" : "default"}>
            {statusCopy(config, files.uploadError, job.error, files.uploadState === "failure" ? "failure" : job.state, file || hasFilename ? 1 : 0)}
          </StatusBox>
          <WorkspaceControls sections={config.sections} state={settings} update={update} />
          <NoteBox>Use either a file upload or the plain text filename input.</NoteBox>
        </div>
      }
      title={config.title}
      uploadOverlay={
        files.uploadState === "uploading" && files.pendingFiles[0] ? (
          <UploadProgress
            fileLabel="Uploading file"
            fileName={files.pendingFiles[0].name}
            fileSize={files.pendingFiles[0].size}
            onCancel={files.cancelUpload}
            percent={files.uploadPercent}
            remainingSecs={files.uploadRemainingSecs}
            speedKBs={files.uploadSpeedKBs}
            totalBytes={files.uploadTotalBytes}
            uploadedBytes={files.uploadedBytes}
          />
        ) : null
      }
    />
  );
}

export function FileToolWorkspacePage({ toolId }: { toolId: FileToolId }) {
  const config = fileToolConfigs[toolId];

  if (config.uploadMode === "compare") {
    return <CompareFileToolPage config={config} />;
  }
  if (config.uploadMode === "filename") {
    return <FilenameCheckToolPage config={config} />;
  }
  return <StandardFileToolPage config={config} />;
}

export const fileToolPageTitles = Object.fromEntries(
  Object.entries(fileToolConfigs).map(([toolId, config]) => [toolId, config.title]),
) as Record<FileToolId, string>;
