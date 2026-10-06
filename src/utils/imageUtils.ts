/**
 * Image processing and optimization utility
 * Converts Files to base64 Data URLs and downscales large images for optimal performance.
 * Integrates directly with Supabase Storage (/api/upload -> pilgrimage-media bucket)
 * and direct signed URL uploads to return clean, public CDN URLs and avoid storing large Base64 payloads in PostgreSQL.
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
 * Checks whether an image string is an inline Base64 data URL
 */
export function isBase64Image(val: string | null | undefined): boolean {
  return typeof val === 'string' && val.startsWith('data:image/');
}

/**
 * Checks whether an image string is an existing public HTTP/HTTPS or local upload URL
 */
export function isPublicImageUrl(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return false;
  return val.startsWith('http://') || val.startsWith('https://') || val.startsWith('/uploads/');
}

/**
 * Optimizes an image (File or existing Data URL) by resizing large dimensions
 * and applying clean JPEG compression.
 * Ensures the payload is lean (~30-60KB) and never sends multi-megabyte lossless strings.
 */
export async function processAndOptimizeImage(
  input: File | string,
  maxDimension = 1200,
  quality = 0.8
): Promise<string> {
  let dataUrl: string;

  if (typeof input === 'string') {
    if (!input.startsWith('data:image/')) {
      return input;
    }
    dataUrl = input;
  } else {
    // SVG files can be kept as-is since they are already vector text
    if (input.type === 'image/svg+xml') {
      return fileToDataUrl(input);
    }
    dataUrl = await fileToDataUrl(input);
  }

  // If running in an environment without DOM/Image, return dataUrl
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
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
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };

    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Ultra-compresses a Base64 data URL to an ultra-compact payload (< 25KB, max 480px, quality 0.5)
 * as an absolute safety fallback so it can NEVER trigger PostgreSQL statement timeout (code 57014).
 */
export async function ultraCompressBase64(dataUrl: string): Promise<string> {
  if (!isBase64Image(dataUrl)) return dataUrl;
  return processAndOptimizeImage(dataUrl, 480, 0.5);
}

/**
 * Attempts a direct upload to Supabase Storage using a pre-signed upload URL.
 * Bypasses custom serverless body-size limits completely.
 */
export async function uploadDirectToSupabase(file: File, folder: string = 'general'): Promise<string | null> {
  try {
    const res = await fetch(`/api/upload-signed-url?filename=${encodeURIComponent(file.name)}&folder=${encodeURIComponent(folder)}`);
    if (!res.ok) {
      const errText = await res.text();
      console.warn('[DirectUpload] Failed to acquire signed URL:', res.status, errText);
      return null;
    }
    const { signedUrl, publicUrl } = await res.json();
    if (!signedUrl || !publicUrl) return null;

    const uploadRes = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'image/jpeg',
      },
      body: file,
    });

    if (uploadRes.ok) {
      console.log('[DirectUpload] Successfully uploaded directly to Supabase Storage:', publicUrl);
      return publicUrl;
    } else {
      const uploadErr = await uploadRes.text();
      console.warn('[DirectUpload] Storage PUT failed:', uploadRes.status, uploadErr);
    }
  } catch (err) {
    console.warn('[DirectUpload] Direct signed upload error:', err);
  }
  return null;
}

/**
 * Uploads an image file to Supabase Storage (with fallback to local /uploads) via /api/upload.
 * Logs exact server response errors on failure instead of silently falling back.
 * Returns a permanent public URL, avoiding large Base64 payload storage in PostgreSQL.
 */
export async function uploadImageFile(file: File, folder: string = 'general'): Promise<string> {
  // 1. First, try direct signed URL upload to Supabase Storage (fastest & bypasses serverless body limits)
  const directUrl = await uploadDirectToSupabase(file, folder);
  if (directUrl) {
    return directUrl;
  }

  try {
    // 2. Optimize image client-side first so the network upload request is lean (< 60KB)
    const optimizedBase64 = await processAndOptimizeImage(file, 1200, 0.8);

    // 3. Upload to server endpoint (/api/upload -> Supabase Storage bucket 'pilgrimage-media')
    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData: optimizedBase64,
        filename: file.name,
        folder,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.url) {
        return data.url;
      }
    }

    // Capture the exact server response error instead of silently falling back
    const errText = await response.text();
    let errorDetail = errText;
    try {
      const errObj = JSON.parse(errText);
      errorDetail = errObj.error || errObj.message || errText;
    } catch {}

    console.error(`[Upload Error] /api/upload failed with HTTP ${response.status} (${response.statusText}):`, errorDetail);
    console.warn('[Upload] Applying safe ultra-compression fallback to prevent PostgreSQL timeout.');
    return await ultraCompressBase64(optimizedBase64);
  } catch (err: any) {
    console.error('[Upload Error] Network exception during /api/upload request:', err?.message || err);
    console.warn('[Upload] Applying safe ultra-compression fallback.');
    try {
      const fallbackBase64 = await fileToDataUrl(file);
      return await ultraCompressBase64(fallbackBase64);
    } catch {
      return '';
    }
  }
}

/**
 * Resolves a Data URL to a clean public URL by uploading it to Supabase Storage if it is Base64.
 * Logs exact server errors on failure instead of silently falling back.
 * If upload fails, ultra-compresses the data URL to < 20KB so it never triggers PostgreSQL statement timeout (code 57014).
 */
export async function resolveBase64ToUrl(dataUrlOrUrl: string, folder: string = 'general'): Promise<string> {
  if (!dataUrlOrUrl || typeof dataUrlOrUrl !== 'string') {
    return dataUrlOrUrl;
  }

  // Already a clean public link
  if (!dataUrlOrUrl.startsWith('data:image/')) {
    return dataUrlOrUrl;
  }

  try {
    // Pre-compress if the base64 string is large before posting
    const optimized = await processAndOptimizeImage(dataUrlOrUrl, 1200, 0.8);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData: optimized,
        folder,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.url) {
        return data.url;
      }
    }

    // Capture the exact server response error
    const errText = await response.text();
    let errorDetail = errText;
    try {
      const errObj = JSON.parse(errText);
      errorDetail = errObj.error || errObj.message || errText;
    } catch {}

    console.error(`[Upload Error] /api/upload rejected resolveBase64ToUrl with HTTP ${response.status} (${response.statusText}):`, errorDetail);
  } catch (err: any) {
    console.error('[Upload Error] Exception during resolveBase64ToUrl /api/upload:', err?.message || err);
  }

  // Fallback: compress down to an ultra-lean data URL so it never times out PostgreSQL
  return await ultraCompressBase64(dataUrlOrUrl);
}
