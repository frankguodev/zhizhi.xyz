export type ImageOutputFormat = "avif" | "jpeg" | "png" | "webp";

export const formatMimeTypes: Record<ImageOutputFormat, string> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function fitWithin(width: number, height: number, maxWidth: number | null, maxHeight: number | null) {
  const widthRatio = maxWidth && maxWidth > 0 ? maxWidth / width : 1;
  const heightRatio = maxHeight && maxHeight > 0 ? maxHeight / height : 1;
  const scale = Math.min(1, widthRatio, heightRatio);
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}

type CanvasEncoder = (imageData: ImageData, format: ImageOutputFormat, quality: number, lossless: boolean) => Promise<ArrayBuffer>;

export async function encodeImage(
  imageData: ImageData,
  format: ImageOutputFormat,
  quality: number,
  lossless: boolean,
  encodeWithCanvas: CanvasEncoder,
): Promise<{ buffer: ArrayBuffer; method: "canvas" | "wasm" }> {
  try {
    if (format === "jpeg") {
      const { encode } = await import("@jsquash/jpeg");
      return {
        buffer: await encode(imageData, {
          optimize_coding: true,
          progressive: true,
          quality,
        }),
        method: "wasm",
      };
    }
    if (format === "webp") {
      const { encode } = await import("@jsquash/webp");
      return {
        buffer: await encode(imageData, lossless ? { lossless: 1, method: 4, quality } : { alpha_quality: 100, method: 4, quality }),
        method: "wasm",
      };
    }
    if (format === "avif") {
      const { encode } = await import("@jsquash/avif");
      return {
        buffer: await encode(imageData, { quality }),
        method: "wasm",
      };
    }
    const { encode } = await import("@jsquash/png");
    const { optimise } = await import("@jsquash/oxipng");
    return {
      buffer: await optimise(await encode(imageData)),
      method: "wasm",
    };
  } catch (error) {
    // AVIF has no reliable canvas encoder (browsers silently fall back to PNG),
    // so surface the failure instead of emitting a mislabelled file.
    if (format === "avif") {
      throw error instanceof Error ? error : new Error("AVIF encode failed.");
    }
    return {
      buffer: await encodeWithCanvas(imageData, format, quality, lossless),
      method: "canvas",
    };
  }
}
