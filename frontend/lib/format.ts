export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const digits = value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function formatDimensions(width: number, height: number): string {
  return `${width} × ${height} px`;
}

export function formatFileType(type: string, fallback: string): string {
  if (!type) {
    return fallback.toUpperCase();
  }

  const cleaned = type
    .replace(/^image\//, "")
    .replace(/^application\//, "")
    .replace(/load$/i, "")
    .replace(/save$/i, "")
    .trim();
  return (cleaned || fallback).toUpperCase();
}

export function estimateProcessingTime(bytes: number, units: number): string {
  const megabytes = bytes / (1024 * 1024);
  const seconds = Math.max(3, Math.round(megabytes * 0.7 + units * 0.4));

  if (seconds < 60) {
    return `Estimated processing time: about ${seconds} sec`;
  }

  const minutes = Math.ceil(seconds / 60);
  return `Estimated processing time: about ${minutes} min`;
}

export function joinMeta(values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" / ");
}

export function slugifyBaseName(filename: string): string {
  const dotIndex = filename.lastIndexOf(".");
  return dotIndex > 0 ? filename.slice(0, dotIndex) : filename;
}

export function withExtension(filename: string, extension: string): string {
  const base = slugifyBaseName(filename);
  const normalized = extension.startsWith(".") ? extension : `.${extension}`;
  return `${base}${normalized}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function parseNumber(value: string, fallback = 0): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}
