import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Photo evidence is metadata-linked, binary-in-object-storage (spec §45).
// Production (Vercel) reads BLOB_READ_WRITE_TOKEN and stores in Vercel Blob.
// Local dev has no Blob token provisioned yet, so we fall back to writing
// under /public/uploads and serving it as a static file — same contract
// (a durable URL comes back), swapped for real object storage at deploy time.
export async function storePhoto(file: File): Promise<{ url: string; sizeBytes: number }> {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`evidence/${filename}`, Buffer.from(bytes), {
      access: "public",
      contentType: file.type,
    });
    return { url: blob.url, sizeBytes: file.size };
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));
  return { url: `/uploads/${filename}`, sizeBytes: file.size };
}

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
