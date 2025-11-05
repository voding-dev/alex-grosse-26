/**
 * Image compression utilities
 * Reusable functions for compressing images in the browser
 */

export interface CompressionOptions {
  quality?: number; // 0-1 (0.7 = 70%)
  maxWidth?: number; // Max width in pixels
  maxHeight?: number; // Max height in pixels
  outputFormat?: "jpeg" | "png" | "webp";
  enableResize?: boolean;
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number; // Percentage reduction
  width?: number;
  height?: number;
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    quality = 0.7,
    maxWidth = 1920,
    maxHeight = 1920,
    outputFormat = "jpeg",
    enableResize = true,
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Resize if needed
        if (enableResize) {
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = width * ratio;
            height = height * ratio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);

        const mimeType =
          outputFormat === "jpeg"
            ? "image/jpeg"
            : outputFormat === "png"
            ? "image/png"
            : "image/webp";

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to create blob"));
              return;
            }

            const originalSize = file.size;
            const compressedSize = blob.size;
            const compressionRatio =
              ((originalSize - compressedSize) / originalSize) * 100;

            resolve({
              blob,
              originalSize,
              compressedSize,
              compressionRatio,
              width,
              height,
            });
          },
          mimeType,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to load image"));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate a SHA-256 hash of a file for duplicate detection
 */
export async function generateFileHash(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

