/**
 * audioUtils.ts
 * Devotee Audio Testimonial utilities:
 * - Pure client-side WAV audio synthesis for authentic devotional sample voice notes (no external assets required)
 * - MediaRecorder microphone audio recording with wave analyzer support
 * - Audio file upload helpers & duration formatters
 */

/**
 * Generates a valid, playable 16-bit PCM WAV Data URI with serene devotional acoustics.
 * Creates harmonic temple bell chime / tanpura meditative resonance.
 */
export function generateSacredAudioDataUrl(
  type: 'vrindavan_flute_bell' | 'kashi_shankh_bell' | 'tirupati_suprabhatam_chime' = 'vrindavan_flute_bell',
  durationSeconds = 4.5
): string {
  const sampleRate = 22050;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // Write WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM format size
  view.setUint16(20, 1, true); // Linear PCM
  view.setUint16(22, 1, true); // Mono (1 channel)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // Byte rate
  view.setUint16(32, 2, true); // Block align
  view.setUint16(34, 16, true); // Bits per sample
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Synthesize sample frequencies based on devotional archetype
  let baseFreq = 432; // Hz (Vedic A)
  let harmonicRatios = [1.0, 1.5, 2.0, 2.76, 4.0];
  let weights = [0.45, 0.25, 0.15, 0.1, 0.05];

  if (type === 'vrindavan_flute_bell') {
    baseFreq = 587.33; // D5 - Krishna flute scale
    harmonicRatios = [1.0, 1.25, 1.5, 1.875, 2.0];
    weights = [0.5, 0.2, 0.18, 0.08, 0.04];
  } else if (type === 'kashi_shankh_bell') {
    baseFreq = 216.0; // Deep Kashi resonant bronze bell / Om
    harmonicRatios = [1.0, 1.333, 1.5, 2.0, 3.0];
    weights = [0.5, 0.28, 0.14, 0.06, 0.02];
  } else if (type === 'tirupati_suprabhatam_chime') {
    baseFreq = 528.0; // C5 Solfeggio / Venkateswara dawn chime
    harmonicRatios = [1.0, 1.5, 2.0, 2.5, 3.0];
    weights = [0.48, 0.24, 0.16, 0.08, 0.04];
  }

  // Generate PCM Samples with natural acoustic decay & subtle vibrato
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    // Bell chime strikes (Initial strike at t=0, gentle secondary tap at t=1.2s)
    const decay1 = Math.exp(-t * 1.8);
    const decay2 = t > 1.2 ? Math.exp(-(t - 1.2) * 2.2) * 0.65 : 0;

    // Gentle 4.5Hz natural devotional tremolo/vibrato
    const vibrato = 1 + 0.008 * Math.sin(2 * Math.PI * 4.5 * t);

    for (let h = 0; h < harmonicRatios.length; h++) {
      const freq = baseFreq * harmonicRatios[h] * vibrato;
      const wave = Math.sin(2 * Math.PI * freq * t);
      sample += wave * weights[h] * (decay1 + decay2);
    }

    // Warm soft saturation & clipping guard
    const softClipped = Math.max(-0.95, Math.min(0.95, sample));
    const int16 = Math.floor(softClipped * 32767);
    view.setInt16(44 + i * 2, int16, true);
  }

  // Convert to Base64 Data URI
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:audio/wav;base64,${base64}`;
}

/**
 * Format duration in seconds to M:SS (e.g. 74 -> "1:14")
 */
export function formatAudioDuration(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Helper to convert Blob or File to Base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert audio file to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Determine supported audio MIME type for MediaRecorder
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return 'audio/webm';
  }
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
  ];
  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }
  return '';
}
