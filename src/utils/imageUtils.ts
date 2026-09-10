/**
 * Image processing and optimization utility
 * Converts Files to base64 Data URLs and downscales large images for optimal performance.
 */

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Optimizes an image by resizing large dimensions and applying reasonable compression
 * Keeps high visual fidelity while reducing 5-10MB files to ~150-300KB.
 */
export async function processAndOptimizeImage(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<string> {
  const dataUrl = await fileToDataUrl(file);

  // If already small or SVG/GIF, return as is
  if (file.size < 250 * 1024 || file.type === 'image/svg+xml' || file.type === 'image/gif') {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      try {
        const compressed = canvas.toDataURL(outputType, quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
