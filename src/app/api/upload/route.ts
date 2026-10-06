import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (
  process.env.VITE_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ''
).trim();

const SUPABASE_ANON_KEY = (
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  (process as any).SUPABASE_SERVICE_ROLE_KEY ||
  ''
).trim();

const supabaseAdmin = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY || 'placeholder-anon-key',
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
);

const STORAGE_BUCKETS = ['package-images', 'yatra-assets', 'pilgrimage-media'];

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (parseErr: any) {
      console.error('[/api/upload] Failed to parse JSON body:', parseErr?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON request payload or payload exceeds serverless limit' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const rawData = body?.fileData || body?.image || body?.dataUrl || body?.base64;
    const { filename, folder = 'general' } = body || {};

    if (!rawData || typeof rawData !== 'string') {
      return new Response(
        JSON.stringify({ error: 'fileData (Base64 string or Data URL) is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cleanly parse mime type and base64 body
    let mimeType = 'image/jpeg';
    let base64Body = rawData.trim();

    if (base64Body.startsWith('data:')) {
      const commaIndex = base64Body.indexOf(',');
      if (commaIndex !== -1) {
        const header = base64Body.substring(0, commaIndex);
        base64Body = base64Body.substring(commaIndex + 1);
        const mimeMatch = header.match(/^data:([^;]+)/);
        if (mimeMatch && mimeMatch[1]) {
          mimeType = mimeMatch[1].trim();
        }
      }
    }

    base64Body = base64Body.replace(/\s+/g, '');
    const buffer = Buffer.from(base64Body, 'base64');

    let ext = 'jpg';
    if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('svg')) ext = 'svg';

    const safeBase = (filename || `media_${Date.now()}`)
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${folder}/${safeBase}_${Date.now()}.${ext}`;

    let lastError: any = null;

    // Try candidate buckets
    for (const bucket of STORAGE_BUCKETS) {
      try {
        const { data, error } = await supabaseAdmin.storage
          .from(bucket)
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (!error && data) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(storagePath);

          if (publicUrlData?.publicUrl) {
            return new Response(
              JSON.stringify({
                success: true,
                url: publicUrlData.publicUrl,
                path: storagePath,
                bucket,
                size: buffer.length,
              }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
        if (error) {
          lastError = error;
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    console.error('[/api/upload] Supabase storage upload failed:', lastError?.message || lastError);
    return new Response(
      JSON.stringify({
        error: lastError?.message || 'Failed to upload to Supabase Storage',
        fallbackNeeded: true,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[/api/upload] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error during upload' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename') || `img_${Date.now()}.jpg`;
    const folder = searchParams.get('folder') || 'general';
    const ext = filename.split('.').pop() || 'jpg';
    const safeBase = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `${folder}/${safeBase}_${Date.now()}.${ext}`;
    const bucket = STORAGE_BUCKETS[0]; // 'package-images'

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: error?.message || 'Failed to generate signed upload URL' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    return new Response(
      JSON.stringify({
        success: true,
        signedUrl: data.signedUrl,
        token: data.token,
        path: storagePath,
        bucket,
        publicUrl: publicUrlData?.publicUrl,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || 'Error generating signed upload URL' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
