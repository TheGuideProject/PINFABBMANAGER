import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { StorageService } from "./types";

// Cloudflare R2 (or any S3-compatible endpoint).
const client = new S3Client({
  region: "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
  },
});

const bucket = () => process.env.S3_BUCKET ?? "pinfabb";

export const r2StorageService: StorageService = {
  async put(key, body, mimeType) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket(),
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  },

  async getDownloadUrl(key, ttlSeconds = 600) {
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
      { expiresIn: ttlSeconds },
    );
  },

  async getUploadUrl(key, mimeType, ttlSeconds = 900) {
    const url = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: mimeType }),
      { expiresIn: ttlSeconds },
    );
    return { url, method: "PUT" as const };
  },

  async getStream(key) {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
    );
    return response.Body!.transformToWebStream() as ReadableStream;
  },

  async delete(key) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  },
};
