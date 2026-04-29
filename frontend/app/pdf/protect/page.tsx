"use client";

import type { ControlSection } from "@/components/workspace/Controls";
import { EyeIcon, EyeOffIcon, LockIcon } from "@/components/icons/SiteIcons";
import { SinglePdfWorkspacePage, PreviewStage } from "@/components/workspace/WorkspacePageBuilders";
import { formatBytes, slugifyBaseName } from "@/lib/format";

type ProtectSettings = {
  allowCopying: "allow" | "deny";
  editing: "none" | "pages" | "forms" | "comment" | "full";
  encryptionStrength: "128-rc4" | "256-aes";
  ownerPassword: string;
  printing: "none" | "low" | "high";
  sameOwnerPassword: boolean;
  screenReaderAccess: "allow" | "deny";
  showPasswords: boolean;
  userPassword: string;
  userPasswordConfirm: string;
};

function createPassword() {
  return Math.random().toString(36).slice(2, 8) + Math.random().toString(36).slice(2, 8).toUpperCase();
}

const sections: Array<ControlSection<ProtectSettings>> = [
  {
    key: "user-password",
    label: "User Password",
    render: (settings, update) => (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700 dark:text-slate-300">Password</label>
          <div className="flex gap-2">
            <input
              className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-1 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900"
              onChange={(event) => update("userPassword", event.target.value)}
              type={settings.showPasswords ? "text" : "password"}
              value={settings.userPassword}
            />
            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/5"
              onClick={() => update("showPasswords", !settings.showPasswords)}
              type="button"
            >
              {settings.showPasswords ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="block text-[13px] text-slate-700 dark:text-slate-300">Confirm password</label>
          <input
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-[14px] text-slate-700 outline-none focus:ring-2 focus:ring-[#3B82F6] focus:ring-offset-1 dark:border-white/10 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900"
            onChange={(event) => update("userPasswordConfirm", event.target.value)}
            type={settings.showPasswords ? "text" : "password"}
            value={settings.userPasswordConfirm}
          />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-[13px] text-slate-600 dark:border-white/10 dark:bg-slate-950 dark:text-slate-300">
          <span>
            Password strength:{" "}
            {settings.userPassword.length >= 12 ? "Strong" : settings.userPassword.length >= 8 ? "Medium" : "Weak"}
          </span>
          <button
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-white/5"
            onClick={() => {
              const next = createPassword();
              update("userPassword", next);
              update("userPasswordConfirm", next);
            }}
            type="button"
          >
            Generate
          </button>
        </div>
      </div>
    ),
  },
  {
    key: "owner-password",
    label: "Owner Password",
    fields: [
      { key: "sameOwnerPassword", label: "Different owner password", type: "toggle" },
      {
        key: "ownerPassword",
        label: "Owner password",
        type: "password",
        show: (settings) => !settings.sameOwnerPassword,
      },
    ],
  },
  {
    key: "permissions",
    label: "Permissions",
    fields: [
      {
        key: "printing",
        label: "Printing",
        type: "select",
        options: [
          { label: "Not allowed", value: "none" },
          { label: "Low resolution", value: "low" },
          { label: "High resolution", value: "high" },
        ],
      },
      {
        key: "allowCopying",
        label: "Copying text",
        type: "select",
        options: [
          { label: "Allow", value: "allow" },
          { label: "Deny", value: "deny" },
        ],
      },
      {
        key: "editing",
        label: "Editing",
        type: "select",
        options: [
          { label: "Not allowed", value: "none" },
          { label: "Insert/delete pages", value: "pages" },
          { label: "Fill forms", value: "forms" },
          { label: "Comment only", value: "comment" },
          { label: "Full editing", value: "full" },
        ],
      },
      {
        key: "screenReaderAccess",
        label: "Screen reader access",
        type: "select",
        options: [
          { label: "Allow", value: "allow" },
          { label: "Deny", value: "deny" },
        ],
      },
    ],
  },
  {
    key: "encryption",
    label: "Encryption",
    fields: [
      {
        key: "encryptionStrength",
        label: "Encryption strength",
        type: "select",
        options: [
          { label: "128-bit RC4", value: "128-rc4" },
          { label: "256-bit AES", value: "256-aes" },
        ],
      },
    ],
  },
];

export default function PdfProtectPage() {
  return (
    <SinglePdfWorkspacePage<ProtectSettings>
      buildFormData={({ file, settings }) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_password", settings.userPassword);
        formData.append(
          "owner_password",
          settings.sameOwnerPassword ? settings.userPassword : settings.ownerPassword,
        );
        formData.append("printing", settings.printing);
        formData.append("copying", settings.allowCopying);
        formData.append("editing", settings.editing);
        formData.append("screen_reader_access", settings.screenReaderAccess);
        formData.append("encryption_strength", settings.encryptionStrength);
        return formData;
      }}
      description="Protect a PDF with a user password, owner permissions, and encryption settings before export."
      downloadFilename={(file) => `${slugifyBaseName(file.name)}-protected.pdf`}
      emptyDescription="Upload a PDF to apply password protection and permissions."
      endpoint="pdf/encrypt"
      initialSettings={{
        allowCopying: "deny",
        editing: "none",
        encryptionStrength: "256-aes",
        ownerPassword: "",
        printing: "none",
        sameOwnerPassword: true,
        screenReaderAccess: "allow",
        showPasswords: false,
        userPassword: "",
        userPasswordConfirm: "",
      }}
      processDisabled={({ file, settings }) =>
        !file ||
        !settings.userPassword ||
        settings.userPassword !== settings.userPasswordConfirm ||
        (!settings.sameOwnerPassword && !settings.ownerPassword)
      }
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
      title="Protect PDF"
    />
  );
}
