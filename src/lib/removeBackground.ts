import { removeBackground } from "@imgly/background-removal";

export async function removePhotoBackground(
  blob: Blob,
  onProgress?: (current: number, total: number) => void,
): Promise<Blob> {
  const publicPath = new URL(`${import.meta.env.BASE_URL}bg/`, window.location.origin).toString();
  try {
    return await removeBackground(blob, {
      publicPath,
      model: "isnet_quint8",
      device: "cpu",
      output: { format: "image/png", quality: 0.9 },
      progress: (_key, current, total) => onProgress?.(current, total),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("publicPath") || message.includes("Resource") || message.includes("fetch")) {
      throw new Error("The background tool is not on this device yet. You can still save the picture as it is.");
    }
    throw new Error("Could not remove the background. You can still save the picture as it is.");
  }
}
