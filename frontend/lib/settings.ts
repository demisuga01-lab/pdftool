"use client";

import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

export type PDFCompressSettings = {
  quality: "screen" | "ebook" | "printer" | "prepress";
  colorMode: "rgb" | "cmyk" | "gray";
  compatibilityLevel: "1.4" | "1.5" | "1.7";
  removeMetadata: boolean;
  flattenTransparency: boolean;
};

export type PDFSplitSettings = {
  namingPattern: "page-{n}" | "output-{n}" | "{original}-{n}";
  outputFormat: "individual" | "ranges";
};

export type PDFToImagesSettings = {
  dpi: 72 | 150 | 300 | 600;
  format: "png" | "jpeg" | "webp";
  jpegQuality: number;
  transparent: boolean;
};

export type PDFMergeSettings = {
  addBookmarks: boolean;
  metadata_title: string;
};

export type ImageConvertSettings = {
  format: "jpg" | "png" | "webp" | "avif" | "tiff";
  quality: number;
  preserveMetadata: boolean;
  colorSpace: "srgb" | "cmyk" | "gray";
};

export type ImageResizeSettings = {
  width: number;
  height: number;
  fit: "cover" | "contain" | "fill" | "inside" | "outside";
  kernel: "nearest" | "cubic" | "lanczos3" | "lanczos2";
  withoutEnlargement: boolean;
  quality: number;
};

export type ImageCompressSettings = {
  quality: number;
  format: "auto" | "jpg" | "png" | "webp";
  progressive: boolean;
  stripMetadata: boolean;
};

export type GlobalSettings = {
  defaultDownloadFormat: string;
  autoDownload: boolean;
};

export type PDFRotateSettings = {
  angle: 90 | 180 | 270;
  pages: string;
};

export type PDFExtractTextSettings = {
  layout: boolean;
};

export type ImageCropSettings = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ImageRotateSettings = {
  angle: 90 | 180 | 270;
};

export type ImageWatermarkSettings = {
  text: string;
  opacity: number;
  position:
    | "top-left"
    | "top"
    | "top-right"
    | "left"
    | "center"
    | "right"
    | "bottom-left"
    | "bottom"
    | "bottom-right";
};

export type ImageOCRSettings = {
  language: "eng" | "eng+osd";
};

export type ImageBatchResizeSettings = {
  width: number;
  height: number;
};

export type EmptyToolSettings = Record<string, never>;

export type ToolSettingsMap = {
  "pdf-compress": PDFCompressSettings;
  "pdf-split": PDFSplitSettings;
  "pdf-to-images": PDFToImagesSettings;
  "pdf-merge": PDFMergeSettings;
  "pdf-rotate": PDFRotateSettings;
  "pdf-extract-text": PDFExtractTextSettings;
  "pdf-images-to-pdf": EmptyToolSettings;
  "pdf-office-to-pdf": EmptyToolSettings;
  "pdf-protect": EmptyToolSettings;
  "pdf-decrypt": EmptyToolSettings;
  "image-convert": ImageConvertSettings;
  "image-resize": ImageResizeSettings;
  "image-compress": ImageCompressSettings;
  "image-crop": ImageCropSettings;
  "image-rotate": ImageRotateSettings;
  "image-watermark": ImageWatermarkSettings;
  "image-remove-background": EmptyToolSettings;
  "image-ocr": ImageOCRSettings;
  "image-batch-resize": ImageBatchResizeSettings;
  "image-info": EmptyToolSettings;
};

export type ToolId = keyof ToolSettingsMap;

export type ToolPreset<T> = {
  id: string;
  name: string;
  description?: string;
  values: Partial<T>;
};

export const GLOBAL_SETTINGS_STORAGE_KEY = "pdftool-global-settings";
export const TOOL_SETTINGS_STORAGE_PREFIX = "pdftool-settings-";
export const CUSTOM_PRESETS_STORAGE_PREFIX = "pdftool-custom-presets-";

export const defaultGlobalSettings: GlobalSettings = {
  defaultDownloadFormat: "original",
  autoDownload: false,
};

export const defaultToolSettings: ToolSettingsMap = {
  "pdf-compress": {
    quality: "ebook",
    colorMode: "rgb",
    compatibilityLevel: "1.4",
    removeMetadata: false,
    flattenTransparency: false,
  },
  "pdf-split": {
    namingPattern: "page-{n}",
    outputFormat: "ranges",
  },
  "pdf-to-images": {
    dpi: 150,
    format: "png",
    jpegQuality: 82,
    transparent: false,
  },
  "pdf-merge": {
    addBookmarks: true,
    metadata_title: "",
  },
  "pdf-rotate": {
    angle: 90,
    pages: "all",
  },
  "pdf-extract-text": {
    layout: true,
  },
  "pdf-images-to-pdf": {},
  "pdf-office-to-pdf": {},
  "pdf-protect": {},
  "pdf-decrypt": {},
  "image-convert": {
    format: "jpg",
    quality: 85,
    preserveMetadata: false,
    colorSpace: "srgb",
  },
  "image-resize": {
    width: 1200,
    height: 1200,
    fit: "cover",
    kernel: "lanczos3",
    withoutEnlargement: true,
    quality: 85,
  },
  "image-compress": {
    quality: 82,
    format: "auto",
    progressive: true,
    stripMetadata: true,
  },
  "image-crop": {
    x: 0,
    y: 0,
    width: 1200,
    height: 1200,
  },
  "image-rotate": {
    angle: 90,
  },
  "image-watermark": {
    text: "PDFTools",
    opacity: 50,
    position: "bottom-right",
  },
  "image-remove-background": {},
  "image-ocr": {
    language: "eng",
  },
  "image-batch-resize": {
    width: 1200,
    height: 1200,
  },
  "image-info": {},
};

type CustomPresetContextValue = {
  globalSettings: GlobalSettings;
  setGlobalSettings: Dispatch<SetStateAction<GlobalSettings>>;
  updateGlobalSettings: (updates: Partial<GlobalSettings>) => void;
  resetGlobalSettings: () => void;
};

const GlobalSettingsContext = createContext<CustomPresetContextValue | null>(null);

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function parseStoredValue<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function mergeWithDefaults<T>(defaults: T, value: unknown): T {
  if (!value || typeof value !== "object") {
    return defaults;
  }

  return {
    ...defaults,
    ...(value as Partial<T>),
  };
}

function loadToolSettings<T extends ToolId>(toolId: T): ToolSettingsMap[T] {
  if (!canUseStorage()) {
    return defaultToolSettings[toolId];
  }

  const stored = parseStoredValue<Partial<ToolSettingsMap[T]>>(
    window.localStorage.getItem(`${TOOL_SETTINGS_STORAGE_PREFIX}${toolId}`),
  );

  return mergeWithDefaults(defaultToolSettings[toolId], stored);
}

export function loadGlobalSettings(): GlobalSettings {
  if (!canUseStorage()) {
    return defaultGlobalSettings;
  }

  const stored = parseStoredValue<Partial<GlobalSettings>>(
    window.localStorage.getItem(GLOBAL_SETTINGS_STORAGE_KEY),
  );

  return mergeWithDefaults(defaultGlobalSettings, stored);
}

export function saveGlobalSettings(settings: GlobalSettings): void {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(GLOBAL_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function useToolSettings<T extends ToolId>(toolId: T) {
  const [settings, setSettings] = useState<ToolSettingsMap[T]>(defaultToolSettings[toolId]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = loadToolSettings(toolId);
    setSettings(next);
    setReady(true);
  }, [toolId]);

  useEffect(() => {
    if (!ready || !canUseStorage()) {
      return;
    }

    window.localStorage.setItem(
      `${TOOL_SETTINGS_STORAGE_PREFIX}${toolId}`,
      JSON.stringify(settings),
    );
  }, [ready, settings, toolId]);

  const updateSettings = (updates: Partial<ToolSettingsMap[T]>) => {
    setSettings((current) => ({
      ...current,
      ...updates,
    }));
  };

  const resetSettings = () => {
    setSettings(defaultToolSettings[toolId]);
  };

  return {
    ready,
    settings,
    setSettings,
    updateSettings,
    resetSettings,
  };
}

export function getCustomPresets<T extends ToolId>(toolId: T): Array<ToolPreset<ToolSettingsMap[T]>> {
  if (!canUseStorage()) {
    return [];
  }

  return (
    parseStoredValue<Array<ToolPreset<ToolSettingsMap[T]>>>(
      window.localStorage.getItem(`${CUSTOM_PRESETS_STORAGE_PREFIX}${toolId}`),
    ) ?? []
  );
}

export function saveCustomPreset<T extends ToolId>(
  toolId: T,
  preset: Omit<ToolPreset<ToolSettingsMap[T]>, "id">,
): Array<ToolPreset<ToolSettingsMap[T]>> {
  const next = [
    ...getCustomPresets(toolId),
    {
      ...preset,
      id: `${toolId}-${Date.now()}`,
    },
  ];

  if (canUseStorage()) {
    window.localStorage.setItem(`${CUSTOM_PRESETS_STORAGE_PREFIX}${toolId}`, JSON.stringify(next));
  }

  return next;
}

export function deleteCustomPreset(toolId: ToolId, presetId: string): void {
  if (!canUseStorage()) {
    return;
  }

  const next = getCustomPresets(toolId).filter((preset) => preset.id !== presetId);
  window.localStorage.setItem(`${CUSTOM_PRESETS_STORAGE_PREFIX}${toolId}`, JSON.stringify(next));
}

export function getAllCustomPresets(): Partial<Record<ToolId, Array<ToolPreset<Record<string, unknown>>>>> {
  return (Object.keys(defaultToolSettings) as ToolId[]).reduce(
    (collection, toolId) => {
      const presets = getCustomPresets(toolId);
      if (presets.length > 0) {
        collection[toolId] = presets as Array<ToolPreset<Record<string, unknown>>>;
      }
      return collection;
    },
    {} as Partial<Record<ToolId, Array<ToolPreset<Record<string, unknown>>>>>,
  );
}

export function clearAllCustomPresets(): void {
  if (!canUseStorage()) {
    return;
  }

  for (const key of Object.keys(window.localStorage)) {
    if (key.startsWith(CUSTOM_PRESETS_STORAGE_PREFIX)) {
      window.localStorage.removeItem(key);
    }
  }
}

export function resetAllToolSettings(): void {
  if (!canUseStorage()) {
    return;
  }

  for (const toolId of Object.keys(defaultToolSettings) as ToolId[]) {
    window.localStorage.removeItem(`${TOOL_SETTINGS_STORAGE_PREFIX}${toolId}`);
  }
}

type GlobalSettingsProviderProps = {
  children: ReactNode;
};

export function GlobalSettingsProvider({ children }: GlobalSettingsProviderProps) {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(defaultGlobalSettings);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setGlobalSettings(loadGlobalSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    saveGlobalSettings(globalSettings);
  }, [globalSettings, hydrated]);

  const value = useMemo<CustomPresetContextValue>(
    () => ({
      globalSettings,
      setGlobalSettings,
      updateGlobalSettings: (updates) => {
        setGlobalSettings((current) => ({
          ...current,
          ...updates,
        }));
      },
      resetGlobalSettings: () => setGlobalSettings(defaultGlobalSettings),
    }),
    [globalSettings],
  );

  return createElement(GlobalSettingsContext.Provider, { value }, children);
}

export function useGlobalSettings() {
  const context = useContext(GlobalSettingsContext);

  if (!context) {
    throw new Error("useGlobalSettings must be used within GlobalSettingsProvider");
  }

  return context;
}
