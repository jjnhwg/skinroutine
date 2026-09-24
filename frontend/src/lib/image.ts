/**
 * Downscale an image file to a JPEG data URL before it goes into
 * localStorage — full-size camera photos would blow the quota immediately.
 */
export async function resizeImage(file: File, max: number, square = false): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");

  if (square) {
    const side = Math.min(bmp.width, bmp.height);
    const out = Math.min(max, side);
    canvas.width = canvas.height = out;
    ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, out, out);
  } else {
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  }

  bmp.close?.();
  return canvas.toDataURL("image/jpeg", 0.8);
}

/** Longest edge for a day's skin photo. */
export const PHOTO_MAX = 900;

/** Side length for a square product thumbnail. */
export const PRODUCT_IMAGE_MAX = 400;
