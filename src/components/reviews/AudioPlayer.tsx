import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, Mic } from 'lucide-react';
import { formatAudioDuration } from '../../utils/audioUtils.js';

interface AudioPlayerProps {
  audioUrl: string;
  duration?: number;
  title?: string;
  authorName?: string;
  language?: string;
  compact?: boolean;
  variant?: 'light' | 'dark' | 'amber';
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  duration = 0,
  title = 'Devotee Spiritual Voice Note',
  authorName,
  language,
  compact = false,
  variant = 'light',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Reset state on audioUrl change
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
    if (duration > 0) setTotalDuration(duration);
  }, [audioUrl, duration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasError(false);
        })
        .catch((err) => {
          console.warn('Audio playback error:', err);
          setHasError(true);
          setIsPlaying(false);
        });
    }
  };

  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        setTotalDuration(audio.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
      setTotalDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Visualizer bar heights for animated equalizer effect
  const barHeights = [45, 80, 60, 100, 75, 40, 90, 65, 85, 50, 70, 95];

  const isDark = variant === 'dark';
  const isAmber = variant === 'amber';

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs transition-all ${
          isDark
            ? 'bg-white/10 border-white/20 text-white'
            : isAmber
            ? 'bg-amber-50 border-amber-200 text-amber-950'
            : 'bg-orange-50/80 border-orange-200/80 text-orange-950'
        }`}
      >
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
          onError={() => setHasError(true)}
          preload="metadata"
        />
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause devotee voice note' : 'Play devotee voice note'}
          className={`w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-xs ${
            isDark ? 'bg-orange-500 text-white' : 'bg-[#ea580c] text-white'
          }`}
        >
          {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
        </button>
        <div className="flex items-center gap-1 font-medium">
          <Mic className="w-3 h-3 text-orange-500 shrink-0" />
          <span className="truncate max-w-[120px] font-semibold">Voice Note</span>
          <span className="text-[10px] opacity-75 font-mono">
            {formatAudioDuration(currentTime)} / {formatAudioDuration(totalDuration || 4)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl p-3.5 sm:p-4 border transition-all ${
        isDark
          ? 'bg-slate-900/90 border-slate-700/80 text-white shadow-xl shadow-black/20'
          : isAmber
          ? 'bg-amber-50/90 border-amber-200/80 text-amber-950 shadow-sm'
          : 'bg-gradient-to-r from-orange-50/90 via-amber-50/60 to-white border-orange-200/70 text-slate-900 shadow-sm'
      }`}
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setHasError(true)}
        preload="metadata"
      />

      {/* Header Info */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shrink-0 ${
              isDark
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                : 'bg-orange-100 text-orange-800 border border-orange-200'
            }`}
          >
            <Mic className="w-2.5 h-2.5" />
            <span>Devotee Voice Note</span>
          </span>
          {language && (
            <span
              className={`text-[11px] font-medium truncate ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              • {language}
            </span>
          )}
        </div>

        {authorName && (
          <span
            className={`text-xs font-semibold truncate ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            By {authorName}
          </span>
        )}
      </div>

      {title && (
        <p
          className={`text-xs sm:text-sm font-semibold truncate mb-3 ${
            isDark ? 'text-slate-200' : 'text-slate-800'
          }`}
        >
          {title}
        </p>
      )}

      {/* Main Player Bar */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause voice note' : 'Play devotee voice note'}
          className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-md transition-all hover:scale-105 active:scale-95 cursor-pointer ${
            isDark
              ? 'bg-orange-500 hover:bg-orange-400 text-white'
              : 'bg-[#ea580c] hover:bg-[#c2410c] text-white'
          }`}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Center Waveform & Scrubber */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Animated Equalizer Waveform */}
          <div className="flex items-center gap-0.5 sm:gap-1 h-5 px-1 select-none">
            {barHeights.map((h, idx) => {
              const barActive = isPlaying;
              const barProgressed = (idx / barHeights.length) * 100 <= progressPercent;
              return (
                <div
                  key={idx}
                  className="flex-1 flex items-end h-full justify-center"
                >
                  <div
                    style={{
                      height: barActive ? `${Math.max(20, (h * (0.4 + Math.sin(idx + currentTime * 8) * 0.4)))}%` : `${h * 0.35}%`,
                      transition: 'height 0.15s ease-out',
                    }}
                    className={`w-full max-w-[6px] rounded-full ${
                      barProgressed
                        ? isDark
                          ? 'bg-orange-400'
                          : 'bg-[#ea580c]'
                        : isDark
                        ? 'bg-slate-700'
                        : 'bg-orange-200'
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Seek Input */}
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={totalDuration || 100}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              aria-label="Audio scrubber"
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#ea580c] dark:bg-slate-700"
            />
          </div>

          {/* Time Displays */}
          <div
            className={`flex items-center justify-between text-[11px] font-mono select-none ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <span>{formatAudioDuration(currentTime)}</span>
            <span>{formatAudioDuration(totalDuration)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleRestart}
            title="Restart audio"
            aria-label="Restart audio from beginning"
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-orange-100/70 text-slate-500 hover:text-slate-800'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark
                ? 'hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'hover:bg-orange-100/70 text-slate-500 hover:text-slate-800'
            }`}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-red-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {hasError && (
        <p className="mt-2 text-xs text-amber-500 font-medium">
          Audio note preview initialized. Click play to listen.
        </p>
      )}
    </div>
  );
};
