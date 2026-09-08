/** Client-side image compression before upload — resizes to fit within
 * maxDimension (preserving aspect ratio) and re-encodes as JPEG at the given
 * quality. Runs entirely in the browser via Canvas, so it costs nothing
 * server-side and shrinks the payload for both the upload itself and every
 * later page load that serves this photo from Storage. Falls back to the
 * original file if compression fails for any reason (e.g. an unsupported
 * format) or doesn't actually make the file smaller.
 *
 * next.config.ts intentionally leaves Storage-served photos unresized
 * (avoids per-request Cloud Function compute) — this is what keeps that
 * trade-off cheap: shrink once at upload time instead of resizing on every
 * view. */
export async function compressImageForUpload(
  file: File,
  { maxDimension = 1600, quality = 0.82 }: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml" || file.type === "image/gif") {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (error) {
    console.error("Image compression failed, uploading original file instead", error);
    return file;
  }
}
