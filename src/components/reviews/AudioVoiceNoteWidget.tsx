import React, { useState, useRef, useEffect } from 'react';
import { BaseInput } from '../FormField.js';
import {
  Mic,
  Square,
  Upload,
  Trash2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Music,
  CheckCircle2,
} from 'lucide-react';
import { AudioPlayer } from './AudioPlayer.js';
import {
  formatAudioDuration,
  blobToDataUrl,
  getSupportedAudioMimeType,
  generateSacredAudioDataUrl,
} from '../../utils/audioUtils.js';

interface AudioVoiceNoteWidgetProps {
  onAudioChange: (audioUrl: string | undefined, duration: number, audioTitle?: string) => void;
  initialAudioUrl?: string;
  initialDuration?: number;
  initialTitle?: string;
}

export const AudioVoiceNoteWidget: React.FC<AudioVoiceNoteWidgetProps> = ({
  onAudioChange,
  initialAudioUrl,
  initialDuration = 0,
  initialTitle = '',
}) => {
  const [mode, setMode] = useState<'upload' | 'record' | 'sample'>('upload');
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | undefined>(initialAudioUrl);
  const [audioDuration, setAudioDuration] = useState<number>(initialDuration);
  const [audioTitle, setAudioTitle] = useState<string>(initialTitle);
  const [micError, setMicError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liveVolume, setLiveVolume] = useState<number[]>(new Array(16).fill(15));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial audio
  useEffect(() => {
    if (initialAudioUrl && !audioUrl) {
      setAudioUrl(initialAudioUrl);
      setAudioDuration(initialDuration);
      if (initialTitle) setAudioTitle(initialTitle);
    }
  }, [initialAudioUrl, initialDuration, initialTitle]);

  // Clean up recording stream on unmount
  useEffect(() => {
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];

    try {
      if (typeof window === 'undefined' || !navigator || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone recording is not supported in this browser or environment. Please upload an audio file instead.');
      }

      // Strictly on-demand: Only triggered by explicit user button click
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio analyzer for live frequency bar animation
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          const ctx = new AudioContextClass();
          audioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyserRef.current = analyser;
          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const updateVolumeBars = () => {
            if (!analyserRef.current) return;
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);

            const bars = [];
            const step = Math.floor(dataArray.length / 16);
            for (let i = 0; i < 16; i++) {
              const val = dataArray[i * step] || 0;
              bars.push(Math.max(12, Math.min(100, Math.round((val / 255) * 100))));
            }
            setLiveVolume(bars);
            animationFrameRef.current = requestAnimationFrame(updateVolumeBars);
          };
          updateVolumeBars();
        }
      } catch (e) {
        console.warn('Analyser setup warning:', e);
      }

      const mimeType = getSupportedAudioMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const finalType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });
        try {
          const dataUrl = await blobToDataUrl(audioBlob);
          const dur = recordDuration || 5;
          const autoTitle = audioTitle || 'Devotee Spiritual Voice Note';
          setAudioUrl(dataUrl);
          setAudioDuration(dur);
          onAudioChange(dataUrl, dur, autoTitle);
        } catch (err: any) {
          setMicError('Failed to process recorded voice note: ' + err.message);
        }
        stopRecordingCleanup();
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setRecordDuration(0);

      // Start elapsed timer (max 2 minutes = 120s)
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => {
          if (prev >= 120) {
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.warn('[AudioVoiceNoteWidget] Microphone access error:', err);
      const isDenied =
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError' ||
        err.name === 'SecurityError' ||
        (err.message && err.message.toLowerCase().includes('permission'));

      if (isDenied) {
        setMicError('Microphone permission was not granted or is blocked by browser policy. You can easily upload an audio file or select from our temple audio samples below.');
      } else {
        setMicError(err.message || 'Could not access microphone.');
      }
      setIsRecording(false);
      stopRecordingCleanup();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
  };

  const handleDiscardAudio = () => {
    stopRecordingCleanup();
    setIsRecording(false);
    setAudioUrl(undefined);
    setAudioDuration(0);
    setAudioTitle('');
    setMicError(null);
    onAudioChange(undefined, 0, undefined);
  };

  const handleFileUpload = async (file: File) => {
    setMicError(null);
    if (!file.type.startsWith('audio/')) {
      setMicError('Please select a valid audio file (.mp3, .wav, .m4a, .ogg, .webm).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setMicError('Audio file is too large. Maximum supported size is 15MB.');
      return;
    }

    try {
      const dataUrl = await blobToDataUrl(file);
      // Determine duration via Audio element
      const tempAudio = new Audio(dataUrl);
      tempAudio.onloadedmetadata = () => {
        const dur = Math.round(tempAudio.duration) || 10;
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        setAudioUrl(dataUrl);
        setAudioDuration(dur);
        setAudioTitle(cleanTitle);
        onAudioChange(dataUrl, dur, cleanTitle);
      };
      tempAudio.onerror = () => {
        // Fallback default duration
        setAudioUrl(dataUrl);
        setAudioDuration(15);
        const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
        setAudioTitle(cleanTitle);
        onAudioChange(dataUrl, 15, cleanTitle);
      };
    } catch (err: any) {
      setMicError('Could not read audio file: ' + err.message);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUseSampleChime = (
    type: 'vrindavan_flute_bell' | 'kashi_shankh_bell' | 'tirupati_suprabhatam_chime',
    name: string
  ) => {
    const dataUrl = generateSacredAudioDataUrl(type, 5);
    setAudioUrl(dataUrl);
    setAudioDuration(5);
    setAudioTitle(name);
    setMicError(null);
    onAudioChange(dataUrl, 5, name);
  };

  return (
    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-4">
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center font-bold text-xs">
              <Mic className="w-4 h-4" />
            </span>
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">
              Devotee Voice Note (Spiritual Audio)
            </h4>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Share your voice or audio reflection to help fellow pilgrims experience the sacred atmosphere.
          </p>
        </div>

        {/* Mode Switcher */}
        {!audioUrl && !isRecording && (
          <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shrink-0 self-start sm:self-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('record')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'record'
                  ? 'bg-[#ea580c] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Record</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('upload')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                mode === 'upload'
                  ? 'bg-[#ea580c] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('sample')}
              className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                mode === 'sample'
                  ? 'bg-[#ea580c] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Samples</span>
            </button>
          </div>
        )}
      </div>

      {/* Mic Error Notice */}
      {micError && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <p className="font-semibold">{micError}</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMicError(null);
                  setMode('upload');
                }}
                className="px-2.5 py-1 bg-amber-200/70 hover:bg-amber-300 text-amber-950 font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>Switch to File Upload</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMicError(null);
                  setMode('sample');
                }}
                className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 font-semibold border border-amber-300 rounded-lg transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-[#ea580c]" />
                <span>Select Temple Sample</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 1: Active Recorded/Uploaded Audio Preview */}
      {audioUrl ? (
        <div className="space-y-3 bg-white p-3.5 rounded-xl border border-orange-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Voice Note Ready ({formatAudioDuration(audioDuration)})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDiscardAudio}
                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1"
                title="Discard audio"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          </div>

          <AudioPlayer
            audioUrl={audioUrl}
            duration={audioDuration}
            title={audioTitle || 'Recorded Devotee Voice Note'}
            variant="amber"
          />

          {/* Audio Title Field */}
          <div className="pt-1">
            <label htmlFor="audio-voice-note-title" className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
              Audio Note Title / Caption (Optional)
            </label>
            <BaseInput
              id="audio-voice-note-title"
              name="audio-voice-note-title"
              type="text"
              value={audioTitle}
              onChange={(e) => {
                setAudioTitle(e.target.value);
                onAudioChange(audioUrl, audioDuration, e.target.value);
              }}
              placeholder="e.g. Kedarnath Morning Aarti reflection, Vrindavan darshan feeling"
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#ea580c] focus:bg-white transition-all"
            />
          </div>
        </div>
      ) : isRecording ? (
        /* State 2: Actively Recording */
        <div className="bg-white border-2 border-red-400/80 rounded-xl p-5 text-center space-y-4 shadow-sm animate-pulse">
          <div className="flex items-center justify-center gap-2 text-red-600 font-bold text-sm tracking-wide">
            <span className="w-3 h-3 rounded-full bg-red-600 animate-ping" />
            <span>RECORDING DEVOTEE VOICE NOTE...</span>
          </div>

          {/* Live Animated Frequency Bars */}
          <div className="flex items-end justify-center gap-1.5 h-14 px-4 py-1">
            {liveVolume.map((vol, i) => (
              <div
                key={i}
                style={{ height: `${vol}%`, transition: 'height 0.08s ease' }}
                className="w-2 sm:w-2.5 bg-gradient-to-t from-red-500 to-orange-400 rounded-full"
              />
            ))}
          </div>

          {/* Timer */}
          <div className="text-2xl sm:text-3xl font-mono font-black text-slate-900">
            {formatAudioDuration(recordDuration)}
            <span className="text-xs font-sans font-medium text-slate-400 ml-1">/ 2:00</span>
          </div>

          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Speak into your microphone. Describe the darshan, temple atmosphere, or devotional peace you felt.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={stopRecording}
              className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop & Preview</span>
            </button>
            <button
              type="button"
              onClick={handleDiscardAudio}
              className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : mode === 'record' ? (
        /* State 3: Record Prompt (Strictly On-Demand) */
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-orange-100 text-[#ea580c] flex items-center justify-center mx-auto shadow-inner">
            <Mic className="w-8 h-8" />
          </div>
          <div>
            <h5 className="font-bold text-slate-900 text-sm sm:text-base">
              Record a Voice Testimonial (On-Demand)
            </h5>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Microphone is strictly requested only when you click start below. You can record up to 2 minutes of your sacred pilgrimage reflection.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={startRecording}
              className="px-6 py-3 rounded-full bg-[#ea580c] hover:bg-[#d44e0a] text-white font-bold text-xs sm:text-sm inline-flex items-center gap-2 shadow-md hover:shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Allow Mic & Start Recording</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Microphone access is never requested automatically.
          </p>
        </div>
      ) : mode === 'upload' ? (
        /* State 4: Upload Tab */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-[#ea580c] bg-orange-50/50'
              : 'border-slate-300 hover:border-[#ea580c] bg-white'
          }`}
        >
          <BaseInput
            ref={fileInputRef}
            id="audio-voice-note-file-upload"
            name="audio-voice-note-file-upload"
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileUpload(e.target.files[0]);
              }
            }}
          />
          <div className="w-12 h-12 rounded-full bg-orange-50 text-[#ea580c] flex items-center justify-center mx-auto mb-2">
            <Upload className="w-6 h-6" />
          </div>
          <h5 className="font-bold text-slate-800 text-sm">
            Drag & drop audio file or click to browse
          </h5>
          <p className="text-xs text-slate-500 mt-1">
            Supports MP3, WAV, M4A, OGG, WebM (Max 15MB)
          </p>
        </div>
      ) : (
        /* State 5: Sample Chimes */
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Music className="w-4 h-4 text-[#ea580c]" />
            <span>Select a Sacred Atmosphere Voice Note Sample:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() =>
                handleUseSampleChime(
                  'vrindavan_flute_bell',
                  'Vrindavan Evening Banke Bihari Aarti Chime'
                )
              }
              className="p-3 text-left border rounded-xl hover:border-[#ea580c] hover:bg-orange-50/60 transition-all text-xs space-y-1 cursor-pointer bg-slate-50"
            >
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>🪈 Vrindavan Flute & Bell</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Krishna Flute harmonic scale with temple brass bell
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleUseSampleChime(
                  'kashi_shankh_bell',
                  'Kashi Ganga Ghat Shankh & Om Drone'
                )
              }
              className="p-3 text-left border rounded-xl hover:border-[#ea580c] hover:bg-orange-50/60 transition-all text-xs space-y-1 cursor-pointer bg-slate-50"
            >
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>🔔 Kashi Temple Gong & Om</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Deep resonant 216Hz Vedic chime with holy ghat aura
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                handleUseSampleChime(
                  'tirupati_suprabhatam_chime',
                  'Tirumala Hilltop Dawn Suprabhatam Chime'
                )
              }
              className="p-3 text-left border rounded-xl hover:border-[#ea580c] hover:bg-orange-50/60 transition-all text-xs space-y-1 cursor-pointer bg-slate-50"
            >
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <span>✨ Tirupati Dawn Chime</span>
              </div>
              <p className="text-[11px] text-slate-500">
                528Hz Solfeggio golden temple chime & sanctum silence
              </p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
