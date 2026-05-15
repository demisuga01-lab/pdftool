"use client";

import { ChevronDown, RotateCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";

import {
  deleteCustomPreset,
  getCustomPresets,
  saveCustomPreset,
  type ToolId,
  type ToolPreset,
  type ToolSettingsMap,
} from "@/lib/settings";

type SelectOption = {
  label: string;
  value: string | number;
};

type BaseField<Key extends string> = {
  key: Key;
  label: string;
  description?: string;
  hidden?: boolean;
};

type SelectField<Key extends string> = BaseField<Key> & {
  options: SelectOption[];
  type: "select";
};

type ToggleField<Key extends string> = BaseField<Key> & {
  type: "toggle";
};

type RangeField<Key extends string> = BaseField<Key> & {
  max: number;
  min: number;
  step?: number;
  type: "range";
};

type TextField<Key extends string> = BaseField<Key> & {
  placeholder?: string;
  type: "text";
};

type NumberField<Key extends string> = BaseField<Key> & {
  max?: number;
  min?: number;
  step?: number;
  type: "number";
};

export type SettingField<T extends Record<string, unknown>> =
  | SelectField<Extract<keyof T, string>>
  | ToggleField<Extract<keyof T, string>>
  | RangeField<Extract<keyof T, string>>
  | TextField<Extract<keyof T, string>>
  | NumberField<Extract<keyof T, string>>;

export type SettingSection<T extends Record<string, unknown>> = {
  description?: string;
  fields: Array<SettingField<T>>;
  title: string;
};

type ToolSettingsProps<T extends ToolId> = {
  featuredPresets?: string[];
  onChange: (updates: Partial<ToolSettingsMap[T]>) => void;
  onReset: () => void;
  presets: Array<ToolPreset<ToolSettingsMap[T]>>;
  sections: Array<SettingSection<ToolSettingsMap[T]>>;
  settings: ToolSettingsMap[T];
  toolId: T;
};

function Toggle({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-[#059669]" : "bg-slate-200 dark:bg-zinc-700",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

export function ToolSettings<T extends ToolId>({
  featuredPresets = [],
  onChange,
  onReset,
  presets,
  sections,
  settings,
  toolId,
}: ToolSettingsProps<T>) {
  const [expanded, setExpanded] = useState(false);
  const [customPresets, setCustomPresets] = useState<Array<ToolPreset<ToolSettingsMap[T]>>>(() =>
    getCustomPresets(toolId),
  );

  const allPresets = useMemo(
    () => [
      ...presets.map((preset) => ({ ...preset, kind: "built-in" as const })),
      ...customPresets.map((preset) => ({ ...preset, kind: "custom" as const })),
    ],
    [customPresets, presets],
  );

  const chipPresets = useMemo(() => {
    if (featuredPresets.length === 0) {
      return presets.slice(0, 4);
    }

    return presets.filter((preset) => featuredPresets.includes(preset.name));
  }, [featuredPresets, presets]);

  const handleFieldChange = <Key extends keyof ToolSettingsMap[T]>(
    key: Key,
    value: ToolSettingsMap[T][Key],
  ) => {
    onChange({ [key]: value } as unknown as Partial<ToolSettingsMap[T]>);
  };

  const handleSavePreset = () => {
    const name = window.prompt("Preset name");
    if (!name) {
      return;
    }

    const next = saveCustomPreset(toolId, {
      name: name.trim(),
      values: settings,
    });
    setCustomPresets(next);
  };

  const handlePresetSelect = (value: string) => {
    const [kind, id] = value.split(":", 2);
    const preset = allPresets.find((item) => item.kind === kind && item.id === id);

    if (!preset) {
      return;
    }

    onChange(preset.values);
  };

  return (
    <div className="space-y-4">
      {chipPresets.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {chipPresets.map((preset) => (
            <button
              className="secondary-button h-9 px-3"
              key={preset.id}
              onClick={() => onChange(preset.values)}
              type="button"
            >
              {preset.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-900">
        <button
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <div>
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Advanced Settings</p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Saved per tool on this device.</p>
          </div>
          <ChevronDown
            className={[
              "h-4 w-4 text-slate-400 transition",
              expanded ? "rotate-180" : "",
            ].join(" ")}
          />
        </button>

        {expanded ? (
          <div className="space-y-6 border-t border-zinc-200 px-4 py-4 dark:border-white/10">
            {sections.length > 0 || presets.length > 0 || customPresets.length > 0 ? (
              <div className="flex flex-col gap-3 lg:flex-row">
                <select
                  className="field-input"
                  defaultValue=""
                  onChange={(event) => {
                    if (event.target.value) {
                      handlePresetSelect(event.target.value);
                    }
                  }}
                >
                  <option value="">Apply a preset</option>
                  {presets.length > 0 ? (
                    <optgroup label="Built-in presets">
                      {presets.map((preset) => (
                        <option key={preset.id} value={`built-in:${preset.id}`}>
                          {preset.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {customPresets.length > 0 ? (
                    <optgroup label="Saved presets">
                      {customPresets.map((preset) => (
                        <option key={preset.id} value={`custom:${preset.id}`}>
                          {preset.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>

                <div className="flex gap-2">
                  <button className="secondary-button flex-1 gap-2 lg:flex-none" onClick={handleSavePreset} type="button">
                    <Save className="h-4 w-4" />
                    Save as Preset
                  </button>
                  <button className="ghost-button gap-2 text-slate-500" onClick={onReset} type="button">
                    <RotateCcw className="h-4 w-4" />
                    Reset to Default
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-zinc-200 bg-white px-4 py-4 text-sm text-slate-500 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-400">
                No additional advanced settings for this tool yet.
              </div>
            )}

            {customPresets.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">Saved presets</p>
                <div className="flex flex-wrap gap-2">
                  {customPresets.map((preset) => (
                    <div className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-zinc-950" key={preset.id}>
                      <button
                        className="text-sm text-zinc-900 dark:text-zinc-100"
                        onClick={() => onChange(preset.values)}
                        type="button"
                      >
                        {preset.name}
                      </button>
                      <button
                        className="text-xs text-slate-400 transition hover:text-rose-500"
                        onClick={() => {
                          deleteCustomPreset(toolId, preset.id);
                          setCustomPresets(getCustomPresets(toolId));
                        }}
                        type="button"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-6">
              {sections.map((section) => (
                <div className="space-y-4" key={section.title}>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{section.title}</h3>
                    {section.description ? (
                      <p className="text-xs text-slate-500 dark:text-zinc-400">{section.description}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {section.fields
                      .filter((field) => !field.hidden)
                      .map((field) => {
                        const value = settings[field.key];

                        if (field.type === "toggle") {
                          return (
                            <div className="flex items-center justify-between gap-4 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-zinc-950" key={field.key}>
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{field.label}</p>
                                {field.description ? (
                                  <p className="text-xs text-slate-500 dark:text-zinc-400">{field.description}</p>
                                ) : null}
                              </div>
                              <Toggle
                                checked={Boolean(value)}
                                onClick={() => handleFieldChange(field.key, (!value) as ToolSettingsMap[T][typeof field.key])}
                              />
                            </div>
                          );
                        }

                        if (field.type === "select") {
                          return (
                            <label className="space-y-2" key={field.key}>
                              <span className="field-label">{field.label}</span>
                              <select
                                className="field-input"
                                onChange={(event) =>
                                  handleFieldChange(
                                    field.key,
                                    (typeof value === "number"
                                      ? Number(event.target.value)
                                      : event.target.value) as ToolSettingsMap[T][typeof field.key],
                                  )
                                }
                                value={String(value)}
                              >
                                {field.options.map((option) => (
                                  <option key={String(option.value)} value={String(option.value)}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              {field.description ? (
                                <span className="block text-xs text-slate-500">{field.description}</span>
                              ) : null}
                            </label>
                          );
                        }

                        if (field.type === "range") {
                          return (
                            <label className="space-y-2" key={field.key}>
                              <span className="field-label">
                                {field.label}: {value as number}
                              </span>
                              <input
                                className="field-range"
                                max={field.max}
                                min={field.min}
                                onChange={(event) => handleFieldChange(field.key, Number(event.target.value) as ToolSettingsMap[T][typeof field.key])}
                                step={field.step ?? 1}
                                type="range"
                                value={value as number}
                              />
                              {field.description ? (
                                <span className="block text-xs text-slate-500">{field.description}</span>
                              ) : null}
                            </label>
                          );
                        }

                        if (field.type === "number") {
                          return (
                            <label className="space-y-2" key={field.key}>
                              <span className="field-label">{field.label}</span>
                              <input
                                className="field-input"
                                max={field.max}
                                min={field.min}
                                onChange={(event) => handleFieldChange(field.key, Number(event.target.value) as ToolSettingsMap[T][typeof field.key])}
                                step={field.step ?? 1}
                                type="number"
                                value={value as number}
                              />
                              {field.description ? (
                                <span className="block text-xs text-slate-500">{field.description}</span>
                              ) : null}
                            </label>
                          );
                        }

                        return (
                          <label className="space-y-2" key={field.key}>
                            <span className="field-label">{field.label}</span>
                            <input
                              className="field-input"
                              onChange={(event) => handleFieldChange(field.key, event.target.value as ToolSettingsMap[T][typeof field.key])}
                              placeholder={field.placeholder}
                              type="text"
                              value={String(value)}
                            />
                            {field.description ? (
                              <span className="block text-xs text-slate-500">{field.description}</span>
                            ) : null}
                          </label>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
