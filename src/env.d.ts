/// <reference types="@cloudflare/workers-types" />

declare global {
  interface CloudflareEnv {
    DB?: D1Database;
    MEDIA_BUCKET?: R2Bucket;
  }
}

export {};
