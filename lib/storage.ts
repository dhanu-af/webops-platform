import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";

// Photo evidence is metadata-linked, binary-in-object-storage (spec §45).
// Production (Vercel) reads BLOB_READ_WRITE_TOKEN and stores in Vercel Blob.
// Local dev has no Blob token provisioned yet, so we fall back to writing
// under /public/uploads and serving it as a static file — same contract
// (a durable URL comes back), swapped for real object storage at deploy time.
const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

export async function storePhoto(file: File): Promise<{ url: string; sizeBytes: number }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  // file.type can be empty for some HEIC uploads (see isAllowedPhotoFile) -
  // fall back to a guess from the extension so Blob stores a real content
  // type rather than none at all.
  const contentType = file.type || EXTENSION_CONTENT_TYPES[ext] || "application/octet-stream";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`evidence/${filename}`, Buffer.from(bytes), {
      access: "public",
      contentType,
    });
    return { url: blob.url, sizeBytes: file.size };
  }

  // On Vercel the filesystem is read-only (no BLOB_READ_WRITE_TOKEN means
  // storage was never provisioned there) - writing to public/uploads below
  // would throw an opaque EROFS deep inside the request, redacted to a
  // useless generic error on the client. Fail with an actionable message
  // instead of silently attempting something that can only work locally.
  if (process.env.VERCEL) {
    throw new Error("Photo storage isn't configured for this deployment (missing BLOB_READ_WRITE_TOKEN).");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));
  return { url: `/uploads/${filename}`, sizeBytes: file.size };
}

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const ALLOWED_PHOTO_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif"];

// Some phones (iOS HEIC photos especially) hand the browser a file with an
// empty or generic file.type instead of "image/heic" - a strict MIME-type
// check then rejects a perfectly real photo straight from the camera. Fall
// back to the file extension rather than trust file.type alone.
export function isAllowedPhotoFile(file: File): boolean {
  if (ALLOWED_PHOTO_TYPES.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_PHOTO_EXTENSIONS.includes(ext);
}

// Admin-configurable via /admin/settings — falls back to the default above
// when no SystemSettings row exists yet (nothing to configure until an
// admin actually visits Settings and saves once).
export async function getMaxPhotoBytes(): Promise<number> {
  const settings = await db.systemSettings.findFirst();
  return (settings?.maxPhotoSizeMb ?? 10) * 1024 * 1024;
}

// Calibration certificates are PDFs from an external lab/vendor (occasionally
// a scanned photo of a paper certificate) — a real content type distinct from
// PhotoEvidence, so this gets its own function/blob prefix rather than
// reusing storePhoto's image-only assumptions.
const CERTIFICATE_EXTENSION_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export const MAX_CERTIFICATE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CERTIFICATE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_CERTIFICATE_EXTENSIONS = ["pdf", "jpg", "jpeg", "png"];

export function isAllowedCertificateFile(file: File): boolean {
  if (ALLOWED_CERTIFICATE_TYPES.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ALLOWED_CERTIFICATE_EXTENSIONS.includes(ext);
}

export async function storeCalibrationCertificate(file: File): Promise<{ url: string; sizeBytes: number }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const filename = `${crypto.randomUUID()}.${ext}`;
  const bytes = await file.arrayBuffer();
  const contentType = file.type || CERTIFICATE_EXTENSION_CONTENT_TYPES[ext] || "application/octet-stream";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`calibration-certificates/${filename}`, Buffer.from(bytes), {
      access: "public",
      contentType,
    });
    return { url: blob.url, sizeBytes: file.size };
  }

  if (process.env.VERCEL) {
    throw new Error("Certificate storage isn't configured for this deployment (missing BLOB_READ_WRITE_TOKEN).");
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), Buffer.from(bytes));
  return { url: `/uploads/${filename}`, sizeBytes: file.size };
}
