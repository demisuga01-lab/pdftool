"use client";

import { type ReactNode } from "react";

import { CompactWorkspaceShell, VisualEditorWorkspaceShell } from "@/components/workspace/WorkspaceShells";
import type { WorkspaceLayoutKind } from "@/lib/workspace-layouts";

export function UnifiedWorkspace({
  compactPreview,
  countLabel,
  description,
  downloadPanel,
  editor,
  emptyState,
  estimatedTime,
  fileInfo,
  fileName,
  hasContent,
  infoContent,
  kind,
  onDownload,
  onFilesDropped,
  onProcess,
  onReset,
  processButtonDisabled,
  processButtonLabel,
  processingLabel,
  resultPanel,
  settingsPanel,
  title,
  uploadOverlay,
}: {
  compactPreview?: ReactNode;
  countLabel?: string;
  description: string;
  downloadPanel?: ReactNode;
  editor?: ReactNode;
  emptyState: ReactNode;
  estimatedTime?: string;
  fileInfo?: string;
  fileName?: string;
  hasContent: boolean;
  infoContent?: ReactNode;
  kind: WorkspaceLayoutKind;
  onDownload?: () => void;
  onFilesDropped?: (files: File[]) => void;
  onProcess?: () => void;
  onReset?: () => void;
  processButtonDisabled?: boolean;
  processButtonLabel?: string;
  processingLabel?: string | null;
  resultPanel?: ReactNode;
  settingsPanel: ReactNode;
  title: string;
  uploadOverlay?: ReactNode;
}) {
  if (kind === "editor" || kind === "grid") {
    return (
      <VisualEditorWorkspaceShell
        countLabel={countLabel}
        description={description}
        downloadPanel={downloadPanel}
        editor={editor ?? compactPreview ?? null}
        emptyState={emptyState}
        estimatedTime={estimatedTime}
        fileInfo={fileInfo}
        fileName={fileName}
        hasContent={hasContent}
        infoContent={infoContent}
        onDownload={onDownload}
        onFilesDropped={onFilesDropped}
        onProcess={onProcess}
        onReset={onReset}
        processButtonDisabled={processButtonDisabled}
        processButtonLabel={processButtonLabel}
        processingLabel={processingLabel}
        propertiesPanel={
          <div className="space-y-5">
            {settingsPanel}
            {resultPanel}
          </div>
        }
        title={title}
        uploadOverlay={uploadOverlay}
      />
    );
  }

  return (
    <CompactWorkspaceShell
      countLabel={countLabel}
      description={description}
      downloadPanel={downloadPanel}
      emptyState={emptyState}
      estimatedTime={estimatedTime}
      fileInfo={fileInfo}
      fileName={fileName}
      hasContent={hasContent}
      infoContent={infoContent}
      onDownload={onDownload}
      onFilesDropped={onFilesDropped}
      onProcess={onProcess}
      onReset={onReset}
      processButtonDisabled={processButtonDisabled}
      processButtonLabel={processButtonLabel}
      processingLabel={processingLabel}
      preview={compactPreview ?? null}
      resultPanel={resultPanel}
      settingsPanel={settingsPanel}
      title={title}
      uploadOverlay={uploadOverlay}
    />
  );
}
