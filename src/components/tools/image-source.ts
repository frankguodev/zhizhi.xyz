// 媒体工具共享：图片导入（拖拽/多选）、对象 URL 管理、体积/文件名格式化、单张下载与 ZIP 打包。
// 供图片压缩转换（image-tool）与图片水印（image-watermark-tool）复用，避免重复实现。

export type SourceImage = {
  file: File;
  height: number;
  id: string;
  name: string;
  previewUrl: string;
  width: number;
};

export const SUPPORTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export type LoadSourceImagesResult = {
  images: SourceImage[];
  previewUrls: Set<string>;
  skipped: number;
  tooLarge: number;
  tooManyPixels: number;
};

// 校验类型/大小/像素，逐张解码（按 EXIF 方向）并生成预览 URL。纯逻辑：调用方负责把 previewUrls 纳入自己的引用集并在适当时机释放。
export async function loadSourceImages(files: File[], options: { maxBytes: number; maxPixels: number }): Promise<LoadSourceImagesResult> {
  const images: SourceImage[] = [];
  const previewUrls = new Set<string>();
  let skipped = 0;
  let tooLarge = 0;
  let tooManyPixels = 0;

  for (const file of files) {
    if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
      skipped += 1;
      continue;
    }
    if (file.size > options.maxBytes) {
      skipped += 1;
      tooLarge += 1;
      continue;
    }
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      if (bitmap.width * bitmap.height > options.maxPixels) {
        bitmap.close();
        skipped += 1;
        tooManyPixels += 1;
        continue;
      }
      const previewUrl = URL.createObjectURL(file);
      previewUrls.add(previewUrl);
      images.push({
        file,
        height: bitmap.height,
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        name: file.name,
        previewUrl,
        width: bitmap.width,
      });
      bitmap.close();
    } catch {
      skipped += 1;
    }
  }

  return { images, previewUrls, skipped, tooLarge, tooManyPixels };
}

export function clearObjectUrls(urls: Set<string>) {
  for (const url of urls) {
    URL.revokeObjectURL(url);
  }
  urls.clear();
}

export function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, "") || "image";
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatMegapixels(pixels: number) {
  return `${Math.round(pixels / 1_000_000)}MP`;
}

export function formatDateForFileName(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${date.getFullYear()}${month}${day}-${hour}${minute}`;
}

export function downloadBlobUrl(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
}

// 下载一个 Blob：创建临时对象 URL、触发下载，稍后释放。
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  try {
    downloadBlobUrl(url, fileName);
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

// 最小 ZIP（store，无压缩）打包，适合已是压缩格式的图片，避免引入额外依赖。
export async function createZipBlob(files: Array<{ data: Uint8Array; name: string }>) {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralDirectoryParts: Uint8Array[] = [];
  let offset = 0;

  for (const [index, file] of files.entries()) {
    const fileNameBytes = encoder.encode(uniqueZipFileName(file.name, index));
    const crc = crc32(file.data);
    const localHeader = new Uint8Array(30 + fileNameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, file.data.byteLength, true);
    localView.setUint32(22, file.data.byteLength, true);
    localView.setUint16(26, fileNameBytes.length, true);
    localHeader.set(fileNameBytes, 30);
    parts.push(localHeader, file.data);

    const centralHeader = new Uint8Array(46 + fileNameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, file.data.byteLength, true);
    centralView.setUint32(24, file.data.byteLength, true);
    centralView.setUint16(28, fileNameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(fileNameBytes, 46);
    centralDirectoryParts.push(centralHeader);
    offset += localHeader.byteLength + file.data.byteLength;
  }

  const centralDirectorySize = centralDirectoryParts.reduce((sum, item) => sum + item.byteLength, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDirectorySize, true);
  endView.setUint32(16, offset, true);

  return new Blob([concatUint8Arrays([...parts, ...centralDirectoryParts, endRecord])], { type: "application/zip" });
}

function uniqueZipFileName(fileName: string, index: number) {
  const normalized = fileName.replace(/[\\/:*?"<>|]/g, "-") || `image-${index + 1}`;
  if (index === 0) {
    return normalized;
  }
  const dotIndex = normalized.lastIndexOf(".");
  if (dotIndex <= 0) {
    return `${normalized}-${index + 1}`;
  }
  return `${normalized.slice(0, dotIndex)}-${index + 1}${normalized.slice(dotIndex)}`;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8Arrays(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}
