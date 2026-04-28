"use client";

export type ImagePreview = {
  dataUrl: string;
  file: File;
  format: string;
  height: number;
  size: number;
  width: number;
};

function readDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export async function loadImagePreview(file: File): Promise<ImagePreview> {
  const dataUrl = await readDataUrl(file);
  const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Failed to load image preview"));
    image.src = dataUrl;
  });

  return {
    dataUrl,
    file,
    format: file.type || "unknown",
    height: dimensions.height,
    size: file.size,
    width: dimensions.width,
  };
}

export async function loadImagePreviews(files: File[]): Promise<ImagePreview[]> {
  return Promise.all(files.map((file) => loadImagePreview(file)));
}

export async function generateThumbnail(dataUrl: string, maxSize: number): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Failed to load image"));
    element.src = dataUrl;
  });

  const scale = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight, 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");

  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}
