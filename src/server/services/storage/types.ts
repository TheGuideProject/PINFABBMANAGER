export interface StorageService {
  put(key: string, body: Buffer, mimeType: string): Promise<void>;
  /** Short-lived URL (or app-proxied path) the browser can GET. */
  getDownloadUrl(key: string, ttlSeconds?: number): Promise<string>;
  /** Presigned PUT for large direct uploads (audio). Local driver proxies through the app. */
  getUploadUrl(
    key: string,
    mimeType: string,
    ttlSeconds?: number,
  ): Promise<{ url: string; method: "PUT" | "POST" }>;
  getStream(key: string): Promise<ReadableStream>;
  delete(key: string): Promise<void>;
}
