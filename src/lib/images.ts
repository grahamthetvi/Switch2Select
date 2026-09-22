export async function fitImage(blob: Blob, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Could not read that picture.");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const fitted = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!fitted) throw new Error("Could not read that picture.");
  return fitted;
}
