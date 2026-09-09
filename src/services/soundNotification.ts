import { Inquiry } from '../types.js';

export type NotificationTone =
  | 'classic_chime'
  | 'soft_bell'
  | 'digital_beep'
  | 'temple_gong'
  | 'temple_ghanti'
  | 'sacred_om';

export interface NotificationSettings {
  soundEnabled: boolean;
  selectedTone: NotificationTone;
  volume: number; // 0.1 to 1.0
  autoDismissSeconds: number;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  soundEnabled: true,
  selectedTone: 'classic_chime',
  volume: 0.8,
  autoDismissSeconds: 8,
};

const SETTINGS_KEY = 'tirthyatra_admin_notification_settings';
const LAST_ALERT_KEY = 'tirthyatra_last_inquiry_alert';
const BROADCAST_CHANNEL_NAME = 'tirthyatra_admin_inquiries_broadcast';

// Cached AudioContext singleton
let globalAudioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!globalAudioCtx) {
    try {
      globalAudioCtx = new AudioContextClass();
    } catch (e) {
      console.warn('AudioContext could not be initialized:', e);
      return null;
    }
  }

  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }

  return globalAudioCtx;
}

// Ensure AudioContext is unlocked on any user click
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

/**
 * Synthesizes and plays the selected tone via HTML5 Web Audio API.
 * No external audio files or URLs needed.
 */
export function playNotificationTone(
  tone: NotificationTone = 'classic_chime',
  volume = 0.8
) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => executeTone(ctx, tone, volume)).catch(() => {});
      return;
    }

    executeTone(ctx, tone, volume);
  } catch (err) {
    console.warn('Failed to play notification tone:', err);
  }
}

function executeTone(ctx: AudioContext, tone: NotificationTone, volume: number) {
  // Use a slight 10ms lookahead offset to ensure audio scheduling never targets the past
  const now = Math.max(ctx.currentTime + 0.015, 0.015);
  const vol = Math.max(0.05, Math.min(1, volume));

  switch (tone) {
    case 'classic_chime': {
      // Harmonic 4-note ascending major arpeggio: G5, B5, D6, G6
      const notes = [
        { freq: 783.99, delay: 0, dur: 0.32 },
        { freq: 987.77, delay: 0.08, dur: 0.36 },
        { freq: 1174.66, delay: 0.16, dur: 0.42 },
        { freq: 1567.98, delay: 0.24, dur: 0.75 },
      ];

      notes.forEach(({ freq, delay, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + delay);

        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.linearRampToValueAtTime(0.24 * vol, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + delay);
        osc.stop(now + delay + dur + 0.05);
      });
      break;
    }

    case 'soft_bell': {
      // Resonant concierge/temple bell: D5 (587.33Hz) + rich harmonics with natural decay
      const harmonics = [
        { freq: 587.33, amp: 0.35, dur: 1.6 },
        { freq: 1174.66, amp: 0.2, dur: 1.2 },
        { freq: 1762.0, amp: 0.1, dur: 0.8 },
        { freq: 2349.32, amp: 0.05, dur: 0.5 },
      ];

      harmonics.forEach(({ freq, amp, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(amp * vol, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + dur + 0.05);
      });
      break;
    }

    case 'digital_beep': {
      // Modern high-tech dual pulse beep
      const pulses = [
        { freq: 880, start: 0, dur: 0.065 },
        { freq: 1320, start: 0.085, dur: 0.12 },
      ];

      pulses.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + start);

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.linearRampToValueAtTime(0.28 * vol, now + start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + start);
        osc.stop(now + start + dur + 0.02);
      });
      break;
    }

    case 'temple_gong': {
      // 1. SACRED CONCH (SHANKH) BLAST INVOCATION:
      // Ascending frequency sweep from 290Hz to 432Hz (Sacred Vedic Pancham/Gandhar)
      // with acoustic horn filtering, breath swell envelope, and organic detune chorusing
      const shankhSaw = ctx.createOscillator();
      const shankhTri = ctx.createOscillator();
      const shankhFilter = ctx.createBiquadFilter();
      const shankhGain = ctx.createGain();

      // Pitch sweep: breath entering conch and rising to full tonal resonance
      shankhSaw.type = 'sawtooth';
      shankhTri.type = 'triangle';

      // Subtle natural chorusing without conflicting with AudioParam ramp
      shankhSaw.detune.setValueAtTime(7, now);
      shankhTri.detune.setValueAtTime(-7, now);

      shankhSaw.frequency.setValueAtTime(280, now);
      shankhSaw.frequency.exponentialRampToValueAtTime(432, now + 0.38);
      shankhTri.frequency.setValueAtTime(280, now);
      shankhTri.frequency.exponentialRampToValueAtTime(432, now + 0.38);

      // Warm acoustic conch horn lowpass resonance filter
      shankhFilter.type = 'lowpass';
      shankhFilter.frequency.setValueAtTime(650, now);
      shankhFilter.frequency.linearRampToValueAtTime(1300, now + 0.4);
      shankhFilter.frequency.exponentialRampToValueAtTime(450, now + 1.9);
      shankhFilter.Q.setValueAtTime(3.0, now);

      // Conch breath swell gain envelope
      shankhGain.gain.setValueAtTime(0.0001, now);
      shankhGain.gain.linearRampToValueAtTime(0.35 * vol, now + 0.3);
      shankhGain.gain.linearRampToValueAtTime(0.26 * vol, now + 0.85);
      shankhGain.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);

      shankhSaw.connect(shankhFilter);
      shankhTri.connect(shankhFilter);
      shankhFilter.connect(shankhGain);
      shankhGain.connect(ctx.destination);

      shankhSaw.start(now);
      shankhSaw.stop(now + 2.2);
      shankhTri.start(now);
      shankhTri.stop(now + 2.2);

      // 2. DEEP SACRED BRONZE TEMPLE GONG RESONANCE:
      // Harmonic series rooted in 54Hz & 108Hz with massive courtyard depth and rich acoustic decay
      const gongHarmonics = [
        { freq: 54.0, amp: 0.35, dur: 3.2, type: 'sine' as OscillatorType },    // Sub-bass physical vibration
        { freq: 108.0, amp: 0.40, dur: 2.9, type: 'sine' as OscillatorType },   // Primary bronze fundamental
        { freq: 216.0, amp: 0.28, dur: 2.4, type: 'sine' as OscillatorType },   // Warm octave
        { freq: 324.0, amp: 0.16, dur: 1.8, type: 'triangle' as OscillatorType },// Upper overtone
        { freq: 432.0, amp: 0.12, dur: 1.5, type: 'sine' as OscillatorType },   // Pure resonance
        { freq: 540.0, amp: 0.08, dur: 1.1, type: 'sine' as OscillatorType },   // High bronze edge
      ];

      gongHarmonics.forEach(({ freq, amp, dur, type }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(amp * vol, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + dur + 0.05);
      });
      break;
    }

    case 'temple_ghanti': {
      // TRADITIONAL MANDIR BRASS POOJA BELL (GHANTI):
      // Bright, multi-harmonic metallic ringing tone with shimmering acoustics,
      // authentic dual-strike clapper recoil (first light tap, then full resonant ring)
      const baseFreq = 1760.0; // A6 brass bell fundamental

      const bellPartials = [
        { ratio: 1.0, type: 'sine' as OscillatorType, weight: 1.0 },       // 1760 Hz primary bell mode
        { ratio: 1.003, type: 'sine' as OscillatorType, weight: 0.85 },    // 5Hz shimmer beat frequency
        { ratio: 1.414, type: 'triangle' as OscillatorType, weight: 0.45 },// Inharmonic brass clapper strike
        { ratio: 2.0, type: 'sine' as OscillatorType, weight: 0.4 },       // Octave mode
        { ratio: 2.76, type: 'sine' as OscillatorType, weight: 0.25 },     // Upper tierce
        { ratio: 4.07, type: 'sine' as OscillatorType, weight: 0.15 },     // Brilliant brass sparkle
      ];

      const strikes = [
        { time: now, peakAmp: 0.16, decay: 0.35 },       // Initial clapper bounce
        { time: now + 0.14, peakAmp: 0.38, decay: 2.0 },  // Main ringing strike
      ];

      strikes.forEach(({ time: strikeTime, peakAmp, decay }) => {
        bellPartials.forEach(({ ratio, type, weight }) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const filter = ctx.createBiquadFilter();

          osc.type = type;
          osc.frequency.setValueAtTime(baseFreq * ratio, strikeTime);

          // Highshelf filter for glistening golden brass clarity
          filter.type = 'highshelf';
          filter.frequency.setValueAtTime(3200, strikeTime);
          filter.gain.setValueAtTime(2.5, strikeTime);

          gain.gain.setValueAtTime(0.0001, strikeTime);
          gain.gain.linearRampToValueAtTime(peakAmp * weight * vol, strikeTime + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, strikeTime + decay);

          osc.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          osc.start(strikeTime);
          osc.stop(strikeTime + decay + 0.05);
        });
      });
      break;
    }

    case 'sacred_om': {
      // SACRED OM (AUM) MEDITATIVE RESONANCE:
      // Deep, low-frequency meditative drone rooted in 136.10 Hz (the Earth-Year Om frequency)
      // with acoustic vowel formant filter sweeping "A" -> "U" -> "M" and singing bowl overtone
      const omPartials = [
        { freq: 68.05, amp: 0.30, type: 'sine' as OscillatorType, dur: 3.4 },    // Deep grounding sub-octave
        { freq: 136.10, amp: 0.42, type: 'triangle' as OscillatorType, dur: 3.2 },// Primordial OM fundamental
        { freq: 204.15, amp: 0.20, type: 'sine' as OscillatorType, dur: 2.7 },    // Warm fifth
        { freq: 272.20, amp: 0.18, type: 'sine' as OscillatorType, dur: 2.4 },    // Octave overtone
        { freq: 544.40, amp: 0.12, type: 'sine' as OscillatorType, dur: 2.1 },    // Himalayan singing bowl chime
      ];

      // Formant vowel filter simulating the chanting transition "AUM"
      const formantFilter = ctx.createBiquadFilter();
      formantFilter.type = 'bandpass';
      formantFilter.Q.setValueAtTime(3.2, now);
      // Morphing from "A" (780 Hz) -> "U" (430 Hz) -> "M" (230 Hz)
      formantFilter.frequency.setValueAtTime(780, now);
      formantFilter.frequency.exponentialRampToValueAtTime(430, now + 0.7);
      formantFilter.frequency.exponentialRampToValueAtTime(230, now + 1.6);

      const droneGain = ctx.createGain();
      droneGain.gain.setValueAtTime(0.0001, now);
      droneGain.gain.linearRampToValueAtTime(0.36 * vol, now + 0.35); // Gentle peaceful swell
      droneGain.gain.linearRampToValueAtTime(0.30 * vol, now + 1.3);
      droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);

      formantFilter.connect(droneGain);
      droneGain.connect(ctx.destination);

      omPartials.forEach(({ freq, amp, type, dur }) => {
        const osc = ctx.createOscillator();
        const partGain = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);

        partGain.gain.setValueAtTime(0.0001, now);
        partGain.gain.linearRampToValueAtTime(amp, now + 0.25);
        partGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

        osc.connect(partGain);
        partGain.connect(formantFilter);

        // Connect the 68.05 Hz sub bass directly to output for tactile warmth
        if (freq === 68.05) {
          const subGain = ctx.createGain();
          subGain.gain.setValueAtTime(0.0001, now);
          subGain.gain.linearRampToValueAtTime(0.24 * vol, now + 0.35);
          subGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          osc.connect(subGain);
          subGain.connect(ctx.destination);
        }

        osc.start(now);
        osc.stop(now + dur + 0.1);
      });
      break;
    }
  }
}

/**
 * Retrieve saved notification preferences from localStorage
 */
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATION_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      ...parsed,
    };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Persist notification preferences to localStorage
 */
export function saveNotificationSettings(
  partial: Partial<NotificationSettings>
): NotificationSettings {
  const current = getNotificationSettings();
  const updated: NotificationSettings = {
    ...current,
    ...partial,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      window.dispatchEvent(
        new CustomEvent('tirthyatra_notification_settings_changed', {
          detail: updated,
        })
      );
    } catch (e) {
      console.error('Failed to save notification settings:', e);
    }
  }

  return updated;
}

/**
 * Broadcasts a newly submitted inquiry to any listening Admin tabs/windows
 */
export function broadcastNewInquiry(inquiry: Inquiry) {
  if (typeof window === 'undefined') return;

  const payload = {
    type: 'NEW_INQUIRY',
    inquiry,
    timestamp: Date.now(),
  };

  // 1. Direct in-window CustomEvent
  window.dispatchEvent(
    new CustomEvent('tirthyatra_new_inquiry_received', { detail: payload })
  );

  // 2. BroadcastChannel for cross-tab messaging
  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage(payload);
      channel.close();
    }
  } catch (e) {
    // BroadcastChannel unsupported or restricted
  }

  // 3. Storage event trigger for legacy / cross-tab fallback
  try {
    localStorage.setItem(
      LAST_ALERT_KEY,
      JSON.stringify({ id: inquiry.id, timestamp: Date.now(), inquiry })
    );
  } catch (e) {}
}

/**
 * Subscribe to new inquiry events in the Admin UI
 */
export function subscribeToNewInquiries(
  callback: (inquiry: Inquiry, timestamp: number) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Handle in-window custom events
  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent;
    if (custom.detail && custom.detail.inquiry) {
      callback(custom.detail.inquiry, custom.detail.timestamp || Date.now());
    }
  };
  window.addEventListener('tirthyatra_new_inquiry_received', handleCustomEvent);

  // Handle cross-tab BroadcastChannel
  let channel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (event) => {
        if (event.data && event.data.type === 'NEW_INQUIRY' && event.data.inquiry) {
          callback(event.data.inquiry, event.data.timestamp || Date.now());
        }
      };
    } catch (e) {}
  }

  // Handle cross-tab storage fallback
  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === LAST_ALERT_KEY && e.newValue) {
      try {
        const data = JSON.parse(e.newValue);
        if (data && data.inquiry) {
          callback(data.inquiry, data.timestamp || Date.now());
        }
      } catch {}
    }
  };
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('tirthyatra_new_inquiry_received', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    if (channel) {
      channel.close();
    }
  };
}
