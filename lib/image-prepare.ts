// Runs in the browser before a photo is uploaded. A phone camera photo is
// typically 3-12 MB; Vercel rejects request bodies over 4.5 MB, and even when
// it fits it is slow on a mobile connection. The record needs a clear photo, not
// the sensor's full resolution, so this shrinks it to at most 1920px on the long
// side and also makes a ~360px thumbnail for lists and galleries.
//
// If the browser cannot decode the file (HEIC on desktop Chrome, for example)
// the original is uploaded unchanged, which is what happened before.

const MAIN_MAX = 1920;
const MAIN_QUALITY = 0.82;
const THUMB_MAX = 360;
const THUMB_QUALITY = 0.7;
// Already small enough: don't re-encode (and lose quality for nothing).
const SKIP_BELOW_BYTES = 700 * 1024;

async function drawToJpeg(bitmap: ImageBitmap, maxSide: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

const jpegName = (name: string) => name.replace(/\.[^.]+$/, "") + ".jpg";

export async function prepareImage(file: File): Promise<{ main: File; thumb: File | null }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const thumbBlob = await drawToJpeg(bitmap, THUMB_MAX, THUMB_QUALITY);
      const thumb = thumbBlob ? new File([thumbBlob], "thumb-" + jpegName(file.name), { type: "image/jpeg" }) : null;

      if (file.type === "image/jpeg" && file.size <= SKIP_BELOW_BYTES && Math.max(bitmap.width, bitmap.height) <= MAIN_MAX) {
        return { main: file, thumb };
      }
      const mainBlob = await drawToJpeg(bitmap, MAIN_MAX, MAIN_QUALITY);
      // Never make it bigger than what the camera gave us.
      if (!mainBlob || (mainBlob.size >= file.size && file.type === "image/jpeg")) return { main: file, thumb };
      return { main: new File([mainBlob], jpegName(file.name), { type: "image/jpeg" }), thumb };
    } finally {
      bitmap.close();
    }
  } catch {
    return { main: file, thumb: null };
  }
}
