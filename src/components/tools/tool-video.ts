export type VideoOutputKey = "mp4" | "webm" | "mp3" | "gif";
export type VideoQualityKey = "small" | "balanced" | "quality";
export type VideoResolutionKey = "original" | "1080" | "720" | "480";

const qualityOptions: Record<VideoQualityKey, { audioBitrate: string; mp4Crf: string; webmBitrate: string; webmCrf: string }> = {
  small: { audioBitrate: "96k", mp4Crf: "32", webmBitrate: "1M", webmCrf: "45" },
  balanced: { audioBitrate: "128k", mp4Crf: "26", webmBitrate: "2M", webmCrf: "34" },
  quality: { audioBitrate: "192k", mp4Crf: "20", webmBitrate: "4M", webmCrf: "26" },
};

export const videoResolutionOptions: Record<VideoResolutionKey, { label: string; maxHeight: number | null }> = {
  original: { label: "原始尺寸", maxHeight: null },
  "1080": { label: "1080p", maxHeight: 1080 },
  "720": { label: "720p（推荐压缩）", maxHeight: 720 },
  "480": { label: "480p", maxHeight: 480 },
};

export function fitVideoSize(width: number, height: number, maxHeight: number | null) {
  const targetHeight = maxHeight ? Math.min(height, maxHeight) : height;
  const ratio = targetHeight / height;
  return {
    width: Math.max(2, Math.floor((width * ratio) / 2) * 2),
    height: Math.max(2, Math.floor(targetHeight / 2) * 2),
  };
}

function scaleFilter(resolution: VideoResolutionKey, size: { height: number; width: number } | null) {
  if (size) return `scale=${size.width}:${size.height}`;
  const maxHeight = videoResolutionOptions[resolution].maxHeight;
  return maxHeight
    ? `scale=-2:trunc(min(${maxHeight}\\,ih)/2)*2`
    : "scale=trunc(iw/2)*2:trunc(ih/2)*2";
}

export function videoCommand(options: {
  input: string;
  keepAudio: boolean;
  output: string;
  outputKey: VideoOutputKey;
  quality: VideoQualityKey;
  resolution: VideoResolutionKey;
  size: { height: number; width: number } | null;
}) {
  const { input, output, outputKey, quality, resolution, size, keepAudio } = options;
  const selectedQuality = qualityOptions[quality];
  if (outputKey === "mp3") {
    return ["-i", input, "-map", "0:a:0", "-vn", "-c:a", "libmp3lame", "-b:a", selectedQuality.audioBitrate, output];
  }

  const scale = scaleFilter(resolution, size);
  if (outputKey === "gif") {
    const filter = `[0:v]fps=12,${scale},split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse=dither=sierra2_4a[v]`;
    return ["-i", input, "-filter_complex", filter, "-map", "[v]", "-loop", "0", output];
  }

  const audio = keepAudio ? ["-c:a", outputKey === "webm" ? "libopus" : "aac", "-b:a", selectedQuality.audioBitrate] : ["-an"];
  if (outputKey === "webm") {
    return ["-i", input, "-vf", scale, "-c:v", "libvpx", "-crf", selectedQuality.webmCrf, "-b:v", selectedQuality.webmBitrate, "-deadline", "realtime", "-cpu-used", "8", ...audio, output];
  }

  return ["-i", input, "-vf", scale, "-c:v", "libx264", "-preset", "veryfast", "-crf", selectedQuality.mp4Crf, "-pix_fmt", "yuv420p", "-movflags", "faststart", ...audio, output];
}
