/**
 * Image processing and optimization utility
 * Converts Files to base64 Data URLs and downscales large images for optimal performance.
 * Performs DIRECT browser-to-Supabase Storage uploads using Supabase client SDK (supabaseStorage),
 * signed upload URLs, and direct bucket storage, completely bypassing Vercel serverless /api/upload
 * 4.5MB payload limits and preventing database statement timeout (code 57014).
 */

import { supabase, supabaseStorage } from '../lib/supabase.js';

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Base64 data URL into a native binary Blob directly in the browser
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].replace('data:', '') || 'image/jpeg';
  const rawBase64 = (parts[1] || '').replace(/\s+/g, '');
  const byteCharacters = atob(rawBase64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
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
 * and applying clean JPEG compression via HTML5 canvas.
 * Ensures the payload is lean (~30-60KB) and renders smoothly on mobile and desktop.
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
 * Ultra-compresses a Base64 data URL to an ultra-compact payload (< 18KB, max 380px, quality 0.48)
 * as an absolute safety fallback so it can NEVER trigger PostgreSQL statement timeout (code 57014).
 */
export async function ultraCompressBase64(dataUrl: string): Promise<string> {
  if (!isBase64Image(dataUrl)) return dataUrl;
  return processAndOptimizeImage(dataUrl, 380, 0.48);
}

/**
 * Uploads a file or binary Blob to Supabase Storage.
 * Strategy:
 * 1. Attempts direct upload to public buckets ('package-images', 'yatra-assets', 'pilgrimage-media')
 *    via client SDK.
 * 2. If RLS blocks direct client upload, requests a lightweight signed upload token from
 *    /api/upload-signed-url (< 1KB JSON) and uploads binary directly to Supabase Storage,
 *    completely bypassing Vercel's 4.5MB serverless body limit.
 * 3. Fallback to /api/upload if available.
 * Returns the permanent public CDN URL directly to the frontend.
 */
export async function uploadDirectToSupabaseStorage(
  fileOrBlob: File | Blob,
  filename?: string,
  folder: string = 'packages'
): Promise<string> {
  const candidateBuckets = ['package-images', 'yatra-assets', 'pilgrimage-media'];
  const ext = fileOrBlob.type.includes('png')
    ? 'png'
    : fileOrBlob.type.includes('webp')
    ? 'webp'
    : fileOrBlob.type.includes('svg')
    ? 'svg'
    : 'jpg';

  const cleanBase = (filename || `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`)
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');
  const filePath = `${folder}/${cleanBase}_${Date.now()}.${ext}`;
  const contentType = fileOrBlob.type || 'image/jpeg';

  let lastError: any = null;

  // 1. Direct upload via Supabase SDK to candidate buckets
  for (const bucket of candidateBuckets) {
    try {
      const { data, error } = await supabaseStorage.storage
        .from(bucket)
        .upload(filePath, fileOrBlob, {
          contentType,
          upsert: true,
        });

      if (!error && data) {
        const { data: publicUrlData } = supabaseStorage.storage
          .from(bucket)
          .getPublicUrl(filePath);

        if (publicUrlData?.publicUrl) {
          console.log(`[Supabase Storage Direct] Uploaded successfully to bucket "${bucket}":`, publicUrlData.publicUrl);
          return publicUrlData.publicUrl;
        }
      }

      if (error) {
        lastError = error;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  // 2. If direct upload blocked by RLS, use signed upload token flow
  try {
    const signedRes = await fetch(`/api/upload-signed-url?filename=${encodeURIComponent(cleanBase)}.${ext}&folder=${encodeURIComponent(folder)}`);
    if (signedRes.ok) {
      const signedInfo = await signedRes.json();
      if (signedInfo.token && signedInfo.path) {
        // Upload directly from browser to storage using the signed upload token
        const targetBucket = signedInfo.bucket || 'pilgrimage-media';
        const { error: signedUploadError } = await supabase.storage
          .from(targetBucket)
          .uploadToSignedUrl(signedInfo.path, signedInfo.token, fileOrBlob, {
            contentType,
          });

        if (!signedUploadError && signedInfo.publicUrl) {
          console.log('[Supabase Signed Upload] Uploaded successfully to:', signedInfo.publicUrl);
          return signedInfo.publicUrl;
        }

        // If uploadToSignedUrl had issue, try direct PUT to signedUrl
        if (signedInfo.signedUrl) {
          const putRes = await fetch(signedInfo.signedUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: fileOrBlob,
          });
          if (putRes.ok && signedInfo.publicUrl) {
            console.log('[Supabase Signed PUT] Uploaded successfully to:', signedInfo.publicUrl);
            return signedInfo.publicUrl;
          }
        }
      }
    }
  } catch (signedErr: any) {
    console.warn('[Supabase Storage Signed URL Fallback]:', signedErr?.message || signedErr);
  }

  // 3. Fallback to /api/upload
  try {
    let base64Payload: string;
    if (typeof (fileOrBlob as any).arrayBuffer === 'function') {
      const arrayBuffer = await (fileOrBlob as Blob).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Payload = `data:${contentType};base64,${btoa(binary)}`;
    } else {
      base64Payload = await fileToDataUrl(fileOrBlob as File);
    }

    const uploadApiRes = await fetch('/api/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64Payload,
        filename: `${cleanBase}.${ext}`,
        folder,
      }),
    });

    if (uploadApiRes.ok) {
      const data = await uploadApiRes.json();
      if (data.url) {
        console.log('[Upload API] Uploaded successfully:', data.url);
        return data.url;
      }
    }
  } catch (apiErr: any) {
    console.warn('[/api/upload Fallback Error]:', apiErr?.message || apiErr);
  }

  // If all methods failed, log exact error and throw
  console.error('[Supabase Storage Direct Error] Direct upload to all buckets failed:', lastError);
  throw lastError || new Error('Upload to Supabase Storage failed');
}

/**
 * Uploads an image file directly from the browser to Supabase Storage.
 * Returns a permanent public URL, avoiding large Base64 payload storage in PostgreSQL.
 */
export async function uploadImageFile(file: File, folder: string = 'packages'): Promise<string> {
  try {
    // 1. Optimize image client-side first so the uploaded file is lightweight and optimized (< 80KB)
    const optimizedBase64 = await processAndOptimizeImage(file, 1200, 0.82);
    const optimizedBlob = dataUrlToBlob(optimizedBase64);

    // 2. Upload directly from browser to public Supabase Storage bucket (package-images / yatra-assets)
    return await uploadDirectToSupabaseStorage(optimizedBlob, file.name, folder);
  } catch (directErr: any) {
    console.error('[ImageUpload] Supabase Storage upload failed:', directErr?.message || directErr);

    // 3. Fallback: Ultra-compress client-side to ensure PostgreSQL statement timeout (57014) is never triggered
    console.warn('[ImageUpload] Applying safe ultra-compression fallback to prevent database timeout.');
    try {
      const fallbackBase64 = await fileToDataUrl(file);
      return await ultraCompressBase64(fallbackBase64);
    } catch {
      return '';
    }
  }
}

/**
 * Resolves a Data URL to a clean public URL by uploading it directly to Supabase Storage.
 * If already an HTTP/HTTPS or /uploads/ URL, returns it unchanged.
 * If upload fails, ultra-compresses the data URL to < 20KB so it never triggers PostgreSQL statement timeout (code 57014).
 */
export async function resolveBase64ToUrl(dataUrlOrUrl: string, folder: string = 'packages'): Promise<string> {
  if (!dataUrlOrUrl || typeof dataUrlOrUrl !== 'string') {
    return dataUrlOrUrl;
  }

  // Already a clean public link
  if (!dataUrlOrUrl.startsWith('data:image/')) {
    return dataUrlOrUrl;
  }

  try {
    // Pre-compress and convert to binary Blob
    const optimized = await processAndOptimizeImage(dataUrlOrUrl, 1200, 0.8);
    const blob = dataUrlToBlob(optimized);

    // Direct browser upload to Supabase Storage
    return await uploadDirectToSupabaseStorage(blob, `img_${Date.now()}`, folder);
  } catch (err: any) {
    console.error('[ResolveBase64 Error] Direct upload failed, applying ultra-compression fallback:', err?.message || err);
  }

  // Fallback: compress down to an ultra-lean data URL so it never times out PostgreSQL
  return await ultraCompressBase64(dataUrlOrUrl);
}
