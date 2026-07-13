"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { Check, Download, FileUp, Play, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Select } from "@/components/ui/select";
import { clearObjectUrls, downloadBlob, formatBytes, stripExtension } from "./image-source";
import { fitVideoSize, videoCommand, videoResolutionOptions, type VideoOutputKey, type VideoQualityKey, type VideoResolutionKey } from "./tool-video";

type SourceVideo = {
  duration: number | null;
  file: File;
  height: number | null;
  name: string;
  previewable: boolean;
  previewUrl: string;
  width: number | null;
};

type OutputVideo = {
  blob: Blob;
  name: string;
  size: number;
};

const maxBytes = 200 * 1024 * 1024;
const coreUrl = "/vendor/ffmpeg/0.12.10/ffmpeg-core.js";
const wasmUrl = "/vendor/ffmpeg/0.12.10/ffmpeg-core.wasm";
const videoExtensions = new Set(["avi", "m4v", "mkv", "mov", "mp4", "mpeg", "mpg", "ogv", "webm"]);
const acceptedVideoTypes = "video/*,.avi,.m4v,.mkv,.mov,.mp4,.mpeg,.mpg,.ogv,.webm";

const outputOptions: Record<VideoOutputKey, { label: string; mime: string }> = {
  mp4: { label: "MP4 / H.264", mime: "video/mp4" },
  webm: { label: "WebM / VP8", mime: "video/webm" },
  mp3: { label: "MP3 音频", mime: "audio/mpeg" },
  gif: { label: "GIF 动图", mime: "image/gif" },
};
const qualityOptions: Record<VideoQualityKey, { label: string }> = {
  small: { label: "小体积" },
  balanced: { label: "均衡" },
  quality: { label: "高质量" },
};

const copy = {
  upload: "点击选择、拖拽或粘贴视频",
  format: "输出格式",
  quality: "画质与体积",
  resolution: "分辨率",
  keepAudio: "保留音频",
  start: "开始转换",
  loading: "加载 FFmpeg",
  processing: "处理中",
  download: "下载结果",
  clear: "清空",
  cancel: "取消",
  replace: "换一个",
  log: "处理日志",
  local: "视频仅在浏览器本地处理，不会上传。首次转换需加载约 31MB FFmpeg 核心，移动端处理大文件可能内存不足。",
  license: "FFmpeg WASM core 0.12.10 遵循 GPL-2.0-or-later。",
};

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "时长未知";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function blobPart(data: Awaited<ReturnType<FFmpeg["readFile"]>>) {
  if (typeof data === "string") return data;
  return new Uint8Array(data);
}

async function readVideo(file: File): Promise<SourceVideo> {
  const previewUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = previewUrl;
  const previewable = await new Promise<boolean>((resolve) => {
    const finish = (value: boolean) => {
      window.clearTimeout(timeout);
      video.onloadedmetadata = null;
      video.onerror = null;
      resolve(value);
    };
    const timeout = window.setTimeout(() => finish(false), 5000);
    video.onloadedmetadata = () => finish(true);
    video.onerror = () => finish(false);
  });
  if (previewable) {
    return { duration: video.duration, file, height: video.videoHeight, name: file.name, previewable: true, previewUrl, width: video.videoWidth };
  }
  return { duration: null, file, height: null, name: file.name, previewable: false, previewUrl, width: null };
}

export function VideoConverterTool() {
  const [outputKey, setOutputKey] = useState<VideoOutputKey>("mp4");
  const [quality, setQuality] = useState<VideoQualityKey>("balanced");
  const [resolution, setResolution] = useState<VideoResolutionKey>("720");
  const [keepAudio, setKeepAudio] = useState(true);
  const [source, setSource] = useState<SourceVideo | null>(null);
  const [output, setOutput] = useState<OutputVideo | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadingCore, setLoadingCore] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const busyRef = useRef(false);
  const fileLoadIdRef = useRef(0);
  const logsRef = useRef<string[]>([]);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const cancelRef = useRef(false);
  const taskIdRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => () => {
    cancelRef.current = true;
    taskIdRef.current += 1;
    ffmpegRef.current?.terminate();
    clearObjectUrls(objectUrlsRef.current);
  }, []);

  const targetSize = useMemo(
    () => source?.width && source.height ? fitVideoSize(source.width, source.height, videoResolutionOptions[resolution].maxHeight) : null,
    [resolution, source],
  );

  async function ffmpeg() {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    setLoadingCore(true);
    const instance = new FFmpeg();
    ffmpegRef.current = instance;
    instance.on("log", ({ message }) => {
      logsRef.current = [...logsRef.current.slice(-24), message];
      setLogs(logsRef.current);
    });
    instance.on("progress", ({ progress: nextProgress }) => {
      if (Number.isFinite(nextProgress)) setProgress(Math.max(0, Math.min(99, Math.round(nextProgress * 100))));
    });
    try {
      await instance.load({ coreURL: coreUrl, wasmURL: wasmUrl });
      return instance;
    } catch (error) {
      instance.terminate();
      ffmpegRef.current = null;
      throw error;
    } finally {
      setLoadingCore(false);
    }
  }

  async function loadFile(file: File | undefined | null) {
    if (!file || busyRef.current) return;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!file.type.startsWith("video/") && !videoExtensions.has(extension)) {
      setError("请选择视频文件。");
      return;
    }
    if (file.size > maxBytes) {
      setError("视频超过 200MB，浏览器本地 FFmpeg 容易内存不足。请先换更小的视频。");
      return;
    }
    try {
      const fileLoadId = fileLoadIdRef.current + 1;
      fileLoadIdRef.current = fileLoadId;
      const nextSource = await readVideo(file);
      if (fileLoadIdRef.current !== fileLoadId || busyRef.current) {
        URL.revokeObjectURL(nextSource.previewUrl);
        return;
      }
      clearAll(false, false);
      objectUrlsRef.current.add(nextSource.previewUrl);
      setSource(nextSource);
    } catch {
      setError("视频读取失败，请换一个文件。");
    }
  }

  function clearAll(terminate = false, invalidateFileLoad = true) {
    if (invalidateFileLoad) fileLoadIdRef.current += 1;
    clearObjectUrls(objectUrlsRef.current);
    if (terminate) {
      cancelRef.current = true;
      taskIdRef.current += 1;
      ffmpegRef.current?.terminate();
      ffmpegRef.current = null;
    }
    setSource(null);
    setOutput(null);
    setError("");
    setProgress(0);
    setBusy(false);
    setLogs([]);
    logsRef.current = [];
  }

  function clearOutput() {
    if (!output) return;
    setOutput(null);
  }

  async function convert() {
    if (!source || busyRef.current) return;
    let worker: FFmpeg | null = null;
    let stage: "loading" | "writing" | "converting" | "reading" = "loading";
    const inputName = `input.${source.name.split(".").pop() || "video"}`;
    const outputName = `output.${outputKey}`;
    const taskId = taskIdRef.current + 1;
    taskIdRef.current = taskId;
    cancelRef.current = false;
    busyRef.current = true;
    setBusy(true);
    clearOutput();
    setError("");
    setLogs([]);
    logsRef.current = [];
    setProgress(0);
    try {
      worker = await ffmpeg();
      stage = "writing";
      await worker.writeFile(inputName, new Uint8Array(await source.file.arrayBuffer()));
      stage = "converting";
      const code = await worker.exec(videoCommand({ input: inputName, output: outputName, outputKey, quality, resolution, size: targetSize, keepAudio }));
      if (code !== 0) throw new Error(`FFmpeg exited with ${code}`);
      stage = "reading";
      const data = await worker.readFile(outputName);
      if (cancelRef.current || taskIdRef.current !== taskId) return;
      const blob = new Blob([blobPart(data)], { type: outputOptions[outputKey].mime });
      setOutput({ blob, name: `${stripExtension(source.name)}-converted.${outputKey}`, size: blob.size });
      setProgress(100);
    } catch {
      if (!cancelRef.current) {
        const log = logsRef.current.join("\n");
        if (stage === "loading") setError("FFmpeg 核心加载失败，请检查网络后重试。");
        else if (outputKey === "mp3" && /matches no streams|does not contain any stream|stream map/i.test(log)) setError("源视频没有可提取的音频。");
        else if (/memory|out of bounds|abort/i.test(log)) setError("浏览器内存不足，请换用更小的视频、降低分辨率，或在桌面端重试。");
        else if (/invalid data|could not find codec parameters|error opening input/i.test(log)) setError("FFmpeg 无法解析该视频格式或编码。");
        else if (stage === "writing") setError("无法把视频载入本地处理器，请换用更小的文件。");
        else if (stage === "reading") setError("转换已结束，但输出文件读取失败，请重试。");
        else setError("视频编码失败，请降低分辨率或更换输出格式。");
      }
    } finally {
      if (worker?.loaded) {
        await worker.deleteFile(inputName).catch(() => undefined);
        await worker.deleteFile(outputName).catch(() => undefined);
      }
      cancelRef.current = false;
      busyRef.current = false;
      setBusy(false);
      setLoadingCore(false);
    }
  }

  function downloadOutput() {
    if (output) downloadBlob(output.blob, output.name);
  }

  const busyLabel = loadingCore ? copy.loading : `${copy.processing} ${progress}%`;
  const sizeChange = output && source ? Math.round((1 - output.size / source.file.size) * 100) : null;
  const liveStatus = error || (output ? `转换完成，输出文件 ${output.name}` : busy ? busyLabel : "");

  function changeOutputKey(value: string) {
    const nextOutputKey = value as VideoOutputKey;
    clearOutput();
    setOutputKey(nextOutputKey);
    if (nextOutputKey === "gif") setResolution("480");
  }

  function changeQuality(value: string) {
    clearOutput();
    setQuality(value as VideoQualityKey);
  }

  function changeResolution(value: string) {
    clearOutput();
    setResolution(value as VideoResolutionKey);
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-4 rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)] lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div
          className="grid gap-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            if (busyRef.current) return;
            void loadFile(event.dataTransfer.files[0]);
          }}
          onPaste={(event) => {
            if (busyRef.current) return;
            void loadFile(event.clipboardData.files[0]);
          }}
        >
          {source ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{source.name}</p>
                  <p className="text-xs font-semibold text-muted">{source.width && source.height ? `${source.width} × ${source.height}px · ` : ""}{formatDuration(source.duration)} · {formatBytes(source.file.size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!busy ? <button className="admin-btn admin-btn-secondary inline-flex h-8 cursor-pointer items-center rounded-md px-2.5 text-xs font-semibold" type="button" onClick={() => fileInputRef.current?.click()}>{copy.replace}</button> : null}
                  <button className="admin-btn admin-btn-secondary inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold" type="button" onClick={() => clearAll(busy)}><X className="h-3.5 w-3.5" />{busy ? copy.cancel : copy.clear}</button>
                </div>
              </div>
              {source.previewable ? <video className="max-h-[54dvh] w-full rounded-md border border-line bg-black" src={source.previewUrl} controls /> : <div className="flex min-h-52 items-center justify-center rounded-md border border-line bg-surface px-4 text-center text-sm font-semibold text-muted">浏览器无法预览该格式，但可以尝试使用 FFmpeg 转换。</div>}
            </>
          ) : (
            <button className="flex min-h-72 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-surface/60 px-4 py-6 text-sm font-semibold text-muted transition hover:border-accent/45 hover:text-accent" type="button" onClick={() => fileInputRef.current?.click()}>
              <FileUp className="h-8 w-8" />
              {copy.upload}
            </button>
          )}
          {error ? <p className="text-sm font-semibold text-red-700" role="alert">{error}</p> : null}
        </div>

        <div className="grid h-max gap-4 rounded-md border border-line bg-surface/55 p-3">
          <div className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>{copy.format}</span>
            <Select ariaLabel={copy.format} disabled={busy} options={Object.entries(outputOptions).map(([value, item]) => ({ label: item.label, value }))} size="sm" value={outputKey} onChange={changeOutputKey} />
          </div>
          {outputKey !== "gif" ? <div className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>{copy.quality}</span>
            <Select ariaLabel={copy.quality} disabled={busy} options={Object.entries(qualityOptions).map(([value, item]) => ({ label: item.label, value }))} size="sm" value={quality} onChange={changeQuality} />
          </div> : null}
          {outputKey !== "mp3" ? <div className="grid gap-1.5 text-xs font-semibold text-muted">
            <span>{copy.resolution}</span>
            <Select ariaLabel={copy.resolution} disabled={busy} options={Object.entries(videoResolutionOptions).map(([value, item]) => ({ label: item.label, value }))} size="sm" value={resolution} onChange={changeResolution} />
          </div> : null}
          {outputKey !== "mp3" ? <p className="text-xs font-medium text-muted">输出尺寸：{targetSize ? `${targetSize.width} × ${targetSize.height}px` : "由 FFmpeg 自动计算"}</p> : null}
          {outputKey === "mp4" || outputKey === "webm" ? <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
            <input className="cursor-pointer accent-[var(--accent)]" type="checkbox" checked={keepAudio} disabled={busy} onChange={(event) => { clearOutput(); setKeepAudio(event.currentTarget.checked); }} />
            {copy.keepAudio}
          </label> : null}
          {outputKey === "gif" ? <p className="text-xs font-medium leading-5 text-amber-700">GIF 不包含声音，{source?.duration && source.duration > 30 ? "当前视频超过 30 秒，处理会很慢且文件可能很大。" : "长视频会处理较慢且文件较大。"}建议截取后再转换。</p> : null}
          <button className="admin-btn admin-btn-primary inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!source || busy} onClick={() => void convert()}>
            {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Play className="h-3.5 w-3.5" />}
            {busy ? busyLabel : copy.start}
          </button>
          {busy ? (
            <div className="h-1.5 overflow-hidden rounded-full bg-line" aria-label={busyLabel} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}>
              <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          ) : null}
          <button className="admin-btn admin-btn-secondary inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md px-3 text-xs font-semibold" type="button" disabled={!output} onClick={downloadOutput}>
            {output ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            {copy.download}
          </button>
          {output ? (
            <div className="rounded-md border border-line bg-paper p-2 text-xs font-medium text-muted">
              <p className="font-semibold text-foreground">{output.name}</p>
              <p>输出：{formatBytes(output.size)}，原始：{formatBytes(source?.file.size ?? 0)}</p>
              {sizeChange !== null ? <p className={sizeChange < 0 ? "mt-1 font-semibold text-amber-700" : "mt-1 font-semibold text-emerald-700"}>{sizeChange < 0 ? `体积增大 ${Math.abs(sizeChange)}%，建议降低画质或分辨率。` : `体积减少 ${sizeChange}%`}</p> : null}
            </div>
          ) : null}
          <p className="text-[0.7rem] leading-4 text-muted">{copy.local}</p>
          <p className="text-[0.7rem] leading-4 text-muted">{copy.license}</p>
        </div>
      </section>

      {logs.length > 0 ? (
        <details className="rounded-md border border-line bg-paper/72 p-4 shadow-[var(--shadow-quiet)]">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">{copy.log}</summary>
          <pre className="mt-3 max-h-52 overflow-auto rounded-md border border-line bg-surface p-3 text-xs leading-5 text-muted">{logs.join("\n")}</pre>
        </details>
      ) : null}

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept={acceptedVideoTypes}
        disabled={busy}
        onChange={(event) => {
          void loadFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <p className="sr-only" aria-live="polite">{liveStatus}</p>
    </div>
  );
}
