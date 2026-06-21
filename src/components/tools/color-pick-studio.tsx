"use client";

import { ImageIcon, Pipette, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ColorPickStudioProps = {
  onPick: (hex: string) => void;
};

const displayMaxWidth = 560;
const paletteSize = 8;
const maxPaletteSamples = 4096;

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

// 缩小取样 + 4-bit 量化分桶，取出现最多的若干主色，桶内取平均色更贴近真实观感。
function extractPalette(data: Uint8ClampedArray, width: number, height: number) {
  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>();
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / maxPaletteSamples)));
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const index = (y * width + x) * 4;
      if (data[index + 3] < 128) {
        continue;
      }
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
      const bucket = buckets.get(key);
      if (bucket) {
        bucket.count += 1;
        bucket.r += r;
        bucket.g += g;
        bucket.b += b;
      } else {
        buckets.set(key, { count: 1, r, g, b });
      }
    }
  }
  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, paletteSize)
    .map((bucket) => rgbToHex(Math.round(bucket.r / bucket.count), Math.round(bucket.g / bucket.count), Math.round(bucket.b / bucket.count)));
}

export function ColorPickStudio({ onPick }: ColorPickStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [hasImage, setHasImage] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);
  const [supportsEyeDropper, setSupportsEyeDropper] = useState(false);
  const [message, setMessage] = useState("");

  // 延后到 setTimeout 再写 state，避免 effect 内同步 setState 触发级联渲染（与 image-tool 一致）。
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSupportsEyeDropper("EyeDropper" in window);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  async function openEyeDropper() {
    try {
      const EyeDropperCtor = (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper;
      const result = await new EyeDropperCtor().open();
      onPick(result.sRGBHex);
    } catch {
      // 用户按 Esc 取消或取色失败，静默忽略。
    }
  }

  async function loadImageFile(file: File | null) {
    if (!file) {
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("请选择 JPG、PNG 或 WebP 图片。");
      return;
    }

    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      const canvas = canvasRef.current;
      if (!canvas) {
        bitmap.close();
        return;
      }
      const scale = Math.min(1, displayMaxWidth / bitmap.width);
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) {
        bitmap.close();
        return;
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      setPalette(extractPalette(imageData.data, canvas.width, canvas.height));
      setHasImage(true);
      setHoverColor(null);
      setMessage("");
    } catch {
      setMessage("无法读取这张图片，请换一张 JPG、PNG 或 WebP。");
    }
  }

  function colorAtPointer(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas || !hasImage) {
      return null;
    }
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return null;
    }
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }
    const x = Math.floor(((clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * canvas.height);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      return null;
    }
    const [r, g, b] = context.getImageData(x, y, 1, 1).data;
    return rgbToHex(r, g, b);
  }

  function clearImage() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasImage(false);
    setPalette([]);
    setHoverColor(null);
    setMessage("");
  }

  return (
    <div className="mb-3 grid gap-3 rounded-md border border-line bg-paper/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">取色</span>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-semibold text-foreground transition hover:border-accent/60 hover:bg-accent/8 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImageIcon className="h-3.5 w-3.5 text-accent" />
            图片取色
          </button>
          {supportsEyeDropper ? (
            <button
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 text-xs font-semibold text-foreground transition hover:border-accent/60 hover:bg-accent/8"
              type="button"
              onClick={() => void openEyeDropper()}
            >
              <Pipette className="h-3.5 w-3.5 text-accent" />
              屏幕吸管
            </button>
          ) : null}
          {hasImage ? (
            <button
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line bg-surface text-muted transition hover:border-accent/60 hover:text-foreground"
              type="button"
              aria-label="移除图片"
              title="移除图片"
              onClick={clearImage}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className={hasImage ? "block" : "hidden"}>
        <div className="flex flex-wrap items-center gap-2">
          <canvas
            ref={canvasRef}
            className="block max-w-full cursor-crosshair rounded-md border border-line shadow-inner"
            style={{ touchAction: "none", height: "auto" }}
            onMouseMove={(event) => setHoverColor(colorAtPointer(event.clientX, event.clientY))}
            onMouseLeave={() => setHoverColor(null)}
            onClick={(event) => {
              const hex = colorAtPointer(event.clientX, event.clientY);
              if (hex) {
                onPick(hex);
              }
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (!touch) {
                return;
              }
              const hex = colorAtPointer(touch.clientX, touch.clientY);
              if (hex) {
                setHoverColor(hex);
                onPick(hex);
              }
            }}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              if (!touch) {
                return;
              }
              const hex = colorAtPointer(touch.clientX, touch.clientY);
              if (hex) {
                setHoverColor(hex);
                onPick(hex);
              }
            }}
          />
          {hoverColor ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              <span className="h-5 w-5 rounded border border-line" style={{ backgroundColor: hoverColor }} />
              <code className="font-mono text-foreground">{hoverColor}</code>
            </span>
          ) : (
            <span className="text-xs font-semibold text-muted">在图片上移动并点击取色，触屏可直接点按。</span>
          )}
        </div>
      </div>

      <button
        className={`${hasImage ? "hidden" : "flex"} aspect-[16/6] w-full cursor-pointer items-center justify-center rounded-md border border-dashed p-3 text-center text-xs font-semibold transition ${
          dragActive
            ? "border-accent bg-accent/12 text-accent"
            : "border-[color-mix(in_srgb,var(--accent)_34%,var(--line))] bg-accent/5 text-muted hover:border-accent/60 hover:bg-accent/8"
        }`}
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          if (event.currentTarget === event.target) {
            setDragActive(false);
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragActive(false);
          void loadImageFile(event.dataTransfer.files?.[0] ?? null);
        }}
      >
        {dragActive ? "松开后读取这张图片" : "拖图片到这里，或点击上传，从图中取色并提取主色板"}
      </button>

      {palette.length > 0 ? (
        <div className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted">主色板（点击取色）</span>
          <div className="flex flex-wrap gap-1.5">
            {palette.map((hex) => (
              <button
                key={hex}
                className="group inline-flex cursor-pointer flex-col items-center gap-1"
                type="button"
                title={hex}
                onClick={() => onPick(hex)}
              >
                <span className="h-8 w-8 rounded-md border border-line shadow-inner transition group-hover:scale-105" style={{ backgroundColor: hex }} />
                <code className="font-mono text-[0.65rem] text-muted">{hex}</code>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {message ? <p className="text-xs font-semibold text-[var(--accent-2)]">{message}</p> : null}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) => {
          void loadImageFile(event.target.files?.[0] ?? null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }}
      />
    </div>
  );
}
