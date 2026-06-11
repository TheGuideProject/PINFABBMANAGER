import { createReadStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import type { StorageService } from "./types";

const ROOT = path.join(process.cwd(), ".storage");

function resolveSafe(key: string) {
  const resolved = path.resolve(ROOT, key);
  if (!resolved.startsWith(ROOT + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

/** Dev driver: writes under .storage/, downloads proxied via /api/files. */
export const localStorageService: StorageService = {
  async put(key, body) {
    const filePath = resolveSafe(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, body);
  },

  async getDownloadUrl(key) {
    return `/api/files/${key}`;
  },

  async getUploadUrl(key) {
    return { url: `/api/files/${key}`, method: "PUT" };
  },

  async getStream(key) {
    const filePath = resolveSafe(key);
    return Readable.toWeb(createReadStream(filePath)) as ReadableStream;
  },

  async delete(key) {
    await unlink(resolveSafe(key)).catch(() => {});
  },
};
