"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { EyeIcon, EyeOffIcon, LockIcon } from "@/components/icons/SiteIcons";
import { SinglePdfWorkspacePage, PreviewStage } from "@/components/workspace/WorkspacePageBuilders";
import { formatBytes, slugifyBaseName } from "@/lib/format";

type DecryptSettings = {
  keepMetadata: boolean;
  password: string;
  removeRestrictions: boolean;
  showPassword: boolean;
};

const sections: Array<ControlSection<DecryptSettings>> = [
  {
    key: "password",
    label: "Password",
    render: (settings, update) => (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700 dark:text-slate-300">Password</label>
          <div className="flex gap-2">
            <input
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-1 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900"
              onChange={(event) => update("password", event.target.value)}
              type={settings.showPassword ? "text" : "password"}
              value={settings.password}
            />
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
              onClick={() => update("showPassword", !settings.showPassword)}
              type="button"
            >
              {settings.showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500">Enter the user or owner password to unlock this PDF.</p>
      </div>
    ),
  },
  {
    key: "after-decryption",
    label: "After Decryption",
    fields: [
      { key: "removeRestrictions", label: "Remove all restrictions", type: "toggle" },
      { key: "keepMetadata", label: "Keep original metadata", type: "toggle" },
    ],
  },
];

export default function PdfDecryptPage() {
  return (
    <SinglePdfWorkspacePage<DecryptSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("password", settings.password);
        formData.append("remove_restrictions", String(settings.removeRestrictions));
        formData.append("keep_metadata", String(settings.keepMetadata));
        return formData;
      }}
      description="Unlock an encrypted PDF with the correct password and export a clean decrypted copy."
      downloadFilename={(file) => `${slugifyBaseName(file.name)}-unlocked.pdf`}
      emptyDescription="Upload a locked PDF to remove its password and restrictions."
      endpoint="pdf/decrypt"
      initialSettings={{
        keepMetadata: true,
        password: "",
        removeRestrictions: true,
        showPassword: false,
      }}
      processDisabled={({ file, settings }) => !file || !settings.password}
      renderCenter={({ file }) => (
        <PreviewStage className="mx-auto max-w-3xl">
          <div className="flex min-h-[420px] items-center justify-center bg-slate-50 p-8 dark:bg-slate-950">
            <div className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-8 text-center dark:border-white/10 dark:bg-slate-900">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFF6FF] text-[#2563EB]">
                <LockIcon className="h-7 w-7" />
              </div>
              <h2 className="mt-4 text-[24px] text-slate-900 dark:text-slate-100">{file.name}</h2>
              <p className="mt-2 text-[14px] leading-6 text-slate-500 dark:text-slate-400">{formatBytes(file.size)}</p>
            </div>
          </div>
        </PreviewStage>
      )}
      sections={sections}
      showSelectionBar={false}
      showSizeToggle={false}
      title="Decrypt PDF"
    />
  );
}
