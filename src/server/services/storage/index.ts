import type { StorageService } from "./types";
import { localStorageService } from "./local";
import { r2StorageService } from "./r2";

export const storage: StorageService =
  process.env.STORAGE_DRIVER === "r2" ? r2StorageService : localStorageService;

export type { StorageService };
