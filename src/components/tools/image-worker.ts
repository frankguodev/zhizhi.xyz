type ImageOutputFormat = "jpeg" | "png" | "webp";

type ImageWorkerRequest = {
  fileBuffer: ArrayBuffer;
  fileType: string;
  format: ImageOutputFormat;
  id: number;
  maxHeight: number | null;
  maxWidth: number | null;
  quality: number;
};

type ImageWorkerResponse =
  | {
      buffer: ArrayBuffer;
      height: number;
      id: number;
      method: "canvas" | "wasm";
      ok: true;
      width: number;
    }
  | {
      error: string;
      id: number;
      ok: false;
    };

type ImageWorkerGlobalScope = {
  onmessage: ((event: MessageEvent<ImageWorkerRequest>) => void) | null;
  postMessage: (message: ImageWorkerResponse, transfer?: Transferable[]) => void;
};

const formatMimeTypes: Record<ImageOutputFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const workerSelf = self as unknown as ImageWorkerGlobalScope;

workerSelf.onmessage = (event: MessageEvent<ImageWorkerRequest>) => {
  void processRequest(event.data);
};

async function processRequest(request: ImageWorkerRequest) {
  try {
    const rendered = await renderImageData(request.fileBuffer, request.fileType, {
      format: request.format,
      maxHeight: request.maxHeight,
      maxWidth: request.maxWidth,
    });
    const encoded = await encodeImage(rendered.imageData, request.format, request.quality);
    const response: ImageWorkerResponse = {
      buffer: encoded.buffer,
      height: rendered.height,
      id: request.id,
      method: encoded.method,
      ok: true,
      width: rendered.width,
    };
    workerSelf.postMessage(response, [encoded.buffer]);
  } catch (error) {
    const response: ImageWorkerResponse = {
      error: error instanceof Error ? error.message : "Image processing failed.",
      id: request.id,
      ok: false,
    };
    workerSelf.postMessage(response);
  }
}

async function renderImageData(
  fileBuffer: ArrayBuffer,
  fileType: string,
  options: { format: ImageOutputFormat; maxHeight: number | null; maxWidth: number | null },
) {
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("OffscreenCanvas is not available.");
  }

  const bitmap = await createImageBitmap(new Blob([fileBuffer], { type: fileType }));
  try {
    const size = fitWithin(bitmap.width, bitmap.height, options.maxWidth, options.maxHeight);
    const canvas = new OffscreenCanvas(size.width, size.height);
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      throw new Error("Canvas is not available.");
    }
    if (options.format === "jpeg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, size.width, size.height);
    }
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    return {
      height: size.height,
      imageData: context.getImageData(0, 0, size.width, size.height),
      width: size.width,
    };
  } finally {
    bitmap.close();
  }
}

async function encodeImage(imageData: ImageData, format: ImageOutputFormat, quality: number): Promise<{ buffer: ArrayBuffer; method: "canvas" | "wasm" }> {
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
        buffer: await encode(imageData, {
          alpha_quality: 100,
          method: 4,
          quality,
        }),
        method: "wasm",
      };
    }
    const { encode } = await import("@jsquash/png");
    return {
      buffer: await encode(imageData),
      method: "wasm",
    };
  } catch {
    return {
      buffer: await encodeWithCanvas(imageData, format, quality),
      method: "canvas",
    };
  }
}

async function encodeWithCanvas(imageData: ImageData, format: ImageOutputFormat, quality: number) {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available.");
  }
  context.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({
    quality: format === "png" ? undefined : quality / 100,
    type: formatMimeTypes[format],
  });
  return blob.arrayBuffer();
}

function fitWithin(width: number, height: number, maxWidth: number | null, maxHeight: number | null) {
  const widthRatio = maxWidth && maxWidth > 0 ? maxWidth / width : 1;
  const heightRatio = maxHeight && maxHeight > 0 ? maxHeight / height : 1;
  const scale = Math.min(1, widthRatio, heightRatio);
  return {
    height: Math.max(1, Math.round(height * scale)),
    width: Math.max(1, Math.round(width * scale)),
  };
}
