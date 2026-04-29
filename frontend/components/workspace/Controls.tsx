"use client";

import type { ReactNode } from "react";

type Option = {
  description?: string;
  icon?: ReactNode;
  label: string;
  value: string | number | boolean;
};

type BaseField<T> = {
  helpText?: string;
  key: keyof T & string;
  label: string;
  show?: (state: T) => boolean;
};

type TextField<T> = BaseField<T> & {
  placeholder?: string;
  type: "text" | "password" | "textarea" | "color";
};

type NumberField<T> = BaseField<T> & {
  max?: number;
  min?: number;
  step?: number;
  type: "number";
};

type SelectField<T> = BaseField<T> & {
  options: Option[];
  type: "select";
};

type ToggleField<T> = BaseField<T> & {
  type: "toggle";
};

type SliderField<T> = BaseField<T> & {
  max: number;
  min: number;
  step?: number;
  type: "slider";
  valueSuffix?: string;
};

type RadioCardsField<T> = BaseField<T> & {
  options: Option[];
  type: "radioCards";
};

type ButtonGroupField<T> = BaseField<T> & {
  options: Option[];
  type: "buttonGroup";
};

export type ControlField<T> =
  | TextField<T>
  | NumberField<T>
  | SelectField<T>
  | ToggleField<T>
  | SliderField<T>
  | RadioCardsField<T>
  | ButtonGroupField<T>;

export type ControlSection<T> = {
  fields?: Array<ControlField<T>>;
  key: string;
  label: string;
  render?: (state: T, update: <K extends keyof T>(key: K, value: T[K]) => void) => ReactNode;
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
      {children}
    </p>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className={[
        "relative inline-flex h-6 w-11 items-center rounded-full transition",
        checked ? "bg-[#059669]" : "bg-slate-300 dark:bg-zinc-700",
      ].join(" ")}
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-full bg-white transition",
          checked ? "translate-x-5" : "translate-x-0.5",
        ].join(" ")}
      />
    </button>
  );
}

function fieldVisible<T>(field: ControlField<T>, state: T) {
  return field.show ? field.show(state) : true;
}

export function WorkspaceControls<T extends Record<string, any>>({
  sections,
  state,
  update,
}: {
  sections: Array<ControlSection<T>>;
  state: T;
  update: <K extends keyof T>(key: K, value: T[K]) => void;
}) {
  return (
    <div className="space-y-6">
      {sections.map((section, sectionIndex) => (
        <div
          className={[
            "space-y-4",
            sectionIndex > 0 ? "border-t border-zinc-200 pt-6" : "",
            sectionIndex > 0 ? "dark:border-white/10" : "",
          ].join(" ")}
          key={section.key}
        >
          <SectionLabel>{section.label}</SectionLabel>

          {section.render ? section.render(state, update) : null}

          {section.fields?.map((field) => {
            if (!fieldVisible(field, state)) {
              return null;
            }

            const value = state[field.key];

            if (field.type === "toggle") {
              return (
                <div className="flex items-center justify-between gap-4" key={field.key}>
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">{field.label}</label>
                    {field.helpText ? <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{field.helpText}</p> : null}
                  </div>
                  <Toggle checked={Boolean(value)} onChange={(next) => update(field.key, next as T[keyof T])} />
                </div>
              );
            }

            if (field.type === "radioCards") {
              return (
                <div className="space-y-1.5" key={field.key}>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">{field.label}</label>
                  <div className="grid gap-2">
                    {field.options.map((option) => {
                      const isSelected = value === option.value;
                      return (
                        <button
                          className={[
                            "rounded-lg border px-3 py-3 text-left transition",
                            isSelected
                              ? "border-[#059669] bg-[#059669]/[0.05] dark:border-emerald-400 dark:bg-emerald-500/10"
                              : "border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-zinc-500",
                          ].join(" ")}
                          key={String(option.value)}
                          onClick={() => update(field.key, option.value as T[keyof T])}
                          type="button"
                        >
                          <div className="flex items-start gap-3">
                            {option.icon ? (
                              <span className="mt-0.5 text-[#059669]">{option.icon}</span>
                            ) : null}
                            <div className="space-y-1">
                              <p className="text-[15px] font-semibold text-slate-900 dark:text-zinc-100">{option.label}</p>
                              {option.description ? (
                                <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{option.description}</p>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (field.type === "buttonGroup") {
              return (
                <div className="space-y-1.5" key={field.key}>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">{field.label}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {field.options.map((option) => (
                      <button
                        className={[
                          "rounded-lg border px-3 py-2 text-sm font-medium transition",
                          value === option.value
                            ? "border-[#059669] bg-[#059669]/[0.05] text-[#059669] dark:border-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500",
                        ].join(" ")}
                        key={String(option.value)}
                        onClick={() => update(field.key, option.value as T[keyof T])}
                        type="button"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            if (field.type === "slider") {
              return (
                <div className="space-y-1.5" key={field.key}>
                  <div className="flex items-center justify-between gap-3">
                    <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">{field.label}</label>
                    <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">
                      {value}
                      {field.valueSuffix ?? ""}
                    </span>
                  </div>
                  <input
                    className="field-range"
                    max={field.max}
                    min={field.min}
                    onChange={(event) => update(field.key, Number(event.target.value) as T[keyof T])}
                    step={field.step ?? 1}
                    type="range"
                    value={Number(value)}
                  />
                  {field.helpText ? <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{field.helpText}</p> : null}
                </div>
              );
            }

            if (field.type === "select") {
              return (
                <div className="space-y-1.5" key={field.key}>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">{field.label}</label>
                  <select
                    className="field-input"
                    onChange={(event) => {
                      const nextValue =
                        typeof value === "number" ? Number(event.target.value) : event.target.value;
                      update(field.key, nextValue as T[keyof T]);
                    }}
                    value={String(value)}
                    >
                      {field.options.map((option) => (
                        <option key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                  {field.helpText ? <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{field.helpText}</p> : null}
                </div>
              );
            }

            if (field.type === "textarea") {
              return (
                <div className="space-y-1.5" key={field.key}>
                  <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">{field.label}</label>
                  <textarea
                    className="field-textarea min-h-[96px]"
                    onChange={(event) => update(field.key, event.target.value as T[keyof T])}
                    placeholder={field.placeholder}
                    value={String(value ?? "")}
                  />
                  {field.helpText ? <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{field.helpText}</p> : null}
                </div>
              );
            }

            return (
              <div className="space-y-1.5" key={field.key}>
                <label className="block text-[13px] font-medium text-slate-700 dark:text-zinc-200">{field.label}</label>
                <input
                  className={[
                    field.type === "color" ? "h-10 w-full rounded-lg border border-gray-300 bg-white p-1 dark:border-white/10 dark:bg-zinc-950" : "field-input",
                  ].join(" ")}
                  max={field.type === "number" ? field.max : undefined}
                  min={field.type === "number" ? field.min : undefined}
                  onChange={(event) => {
                    const nextValue =
                      field.type === "number" ? Number(event.target.value) : event.target.value;
                    update(field.key, nextValue as T[keyof T]);
                  }}
                  placeholder={"placeholder" in field ? field.placeholder : undefined}
                  step={field.type === "number" ? field.step ?? 1 : undefined}
                  type={field.type}
                  value={String(value ?? "")}
                />
                {field.helpText ? <p className="text-sm font-medium text-slate-500 dark:text-zinc-400">{field.helpText}</p> : null}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
