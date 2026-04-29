"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ToolLayout } from "@/components/layout/ToolLayout";
import { useTheme } from "@/components/theme/ThemeProvider";
import { tools } from "@/lib/tools";
import {
  clearAllCustomPresets,
  defaultToolSettings,
  deleteCustomPreset,
  getAllCustomPresets,
  resetAllToolSettings,
  type ToolId,
  useGlobalSettings,
} from "@/lib/settings";

const panelClass = "tool-panel";

export default function SettingsPage() {
  const { globalSettings, updateGlobalSettings, resetGlobalSettings } = useGlobalSettings();
  const { setTheme, theme } = useTheme();
  const [customPresets, setCustomPresets] = useState(getAllCustomPresets());

  useEffect(() => {
    setCustomPresets(getAllCustomPresets());
  }, []);

  const toolNames = useMemo(
    () =>
      Object.fromEntries(
        tools.map((tool) => [`${tool.category}-${tool.id}`, tool.name]),
      ) as Record<string, string>,
    [],
  );
  const toolHrefs = useMemo(
    () =>
      Object.fromEntries(
        tools.map((tool) => [`${tool.category}-${tool.id}`, tool.href]),
      ) as Record<string, string>,
    [],
  );

  return (
    <ToolLayout>
      <div className="space-y-6">
        <section className={panelClass}>
          <p className="tool-eyebrow">Settings</p>
          <h1 className="tool-title">Global preferences</h1>
          <p className="tool-description">
            Control app-wide defaults, theme behavior, and saved presets from one place.
          </p>
        </section>

        <section className={`${panelClass} space-y-6`}>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="field-label">Theme</span>
              <select
                className="field-input"
                onChange={(event) => setTheme(event.target.value as "light" | "dark" | "system")}
                value={theme}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="field-label">Default download format</span>
              <input
                className="field-input"
                onChange={(event) =>
                  updateGlobalSettings({
                    defaultDownloadFormat: event.target.value,
                  })
                }
                type="text"
                value={globalSettings.defaultDownloadFormat}
              />
            </label>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-zinc-900">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Auto-download completed files</p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Trigger the download automatically when a job succeeds.</p>
            </div>
            <button
              aria-pressed={globalSettings.autoDownload}
              className={[
                "relative inline-flex h-6 w-11 items-center rounded-full transition",
                globalSettings.autoDownload ? "bg-[#059669]" : "bg-slate-200 dark:bg-zinc-700",
              ].join(" ")}
              onClick={() =>
                updateGlobalSettings({
                  autoDownload: !globalSettings.autoDownload,
                })
              }
              type="button"
            >
              <span
                className={[
                  "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition",
                  globalSettings.autoDownload ? "translate-x-5" : "translate-x-0.5",
                ].join(" ")}
              />
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="secondary-button"
              onClick={() => {
                clearAllCustomPresets();
                setCustomPresets({});
              }}
              type="button"
            >
              Clear all saved presets
            </button>
            <button
              className="secondary-button"
              onClick={() => {
                resetAllToolSettings();
                resetGlobalSettings();
                setTheme("system");
              }}
              type="button"
            >
              Reset all tool settings to defaults
            </button>
          </div>
        </section>

        <section className={`${panelClass} space-y-4`}>
          <div className="space-y-1">
            <h2 className="section-title">Saved custom presets</h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400">Delete presets per tool or jump back into the tool that uses them.</p>
          </div>

          {Object.keys(customPresets).length === 0 ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-400">
              No custom presets saved yet.
            </div>
          ) : (
            <div className="space-y-4">
              {(Object.entries(customPresets) as Array<[ToolId, Array<{ id: string; name: string }>]>).map(
                ([toolId, presets]) => (
                  <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900" key={toolId}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {toolNames[toolId] ?? toolId}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-zinc-400">{toolId}</p>
                      </div>
                      <Link
                        className="ghost-button"
                        href={toolHrefs[toolId] ?? "/"}
                      >
                        Open
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {presets.map((preset) => (
                        <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950" key={preset.id}>
                          <span className="text-sm text-zinc-900 dark:text-zinc-100">{preset.name}</span>
                          <button
                            className="text-xs text-slate-400 transition hover:text-rose-500"
                            onClick={() => {
                              deleteCustomPreset(toolId, preset.id);
                              setCustomPresets(getAllCustomPresets());
                            }}
                            type="button"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </section>

        <section className={`${panelClass} space-y-3`}>
          <h2 className="section-title">Tracked tools</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(defaultToolSettings) as ToolId[]).map((toolId) => (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-white/10 dark:bg-zinc-900" key={toolId}>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{toolNames[toolId] ?? toolId}</p>
                <p className="text-xs text-slate-500 dark:text-zinc-400">{toolId}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ToolLayout>
  );
}
