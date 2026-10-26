"use client";

/**
 * Run Tesseract.js in the browser. The image never leaves the device; the
 * worker downloads its WASM core and English model from a CDN on first use.
 */
export async function recognizeLabel(
  image: File | Blob | string,
  onProgress: (fraction: number, status: string) => void,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (m) => onProgress(m.progress ?? 0, m.status),
  });
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}
