import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Disc,
  Music,
  Folder,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface Track {
  id: string;
  title: string;
  subtitle: string;
  src: string;
  altSrc: string;
}

const TRACKS: Track[] = [
  {
    id: 'song1',
    title: 'Clarity Ambient',
    subtitle: 'Track 01 · /public/song1.mp3',
    src: '/song1.mp3',
    altSrc: '/audio/song1.mp3'
  },
  {
    id: 'song2',
    title: 'Focus Resonance',
    subtitle: 'Track 02 · /public/song2.mp3',
    src: '/song2.mp3',
    altSrc: '/audio/song2.mp3'
  }
];

export const AmbientAudioPlayer: React.FC = () => {
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('brandlens_audio_vol');
      return saved !== null ? Math.min(1, Math.max(0, parseFloat(saved))) : 0.45;
    } catch {
      return 0.45;
    }
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTabInactive, setIsTabInactive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showFolderHelp, setShowFolderHelp] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wasPlayingBeforeBackgroundRef = useRef<boolean>(false);
  const isPlayingRef = useRef<boolean>(false);
  const isUserPausedRef = useRef<boolean>(false);
  const lastSecRef = useRef<number>(-1);

  // Sync ref
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const currentTrack = TRACKS[currentTrackIndex];

  // Initialize Audio instance
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = currentTrack.src;
    audio.volume = isMuted ? 0 : volume;
    audioRef.current = audio;

    const onTimeUpdate = () => {
      const sec = Math.floor(audio.currentTime);
      if (sec !== lastSecRef.current) {
        lastSecRef.current = sec;
        setCurrentTime(sec);
      }
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const onEnded = () => {
      // Auto-advance to next song and play in loop
      setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
    };

    const onError = () => {
      // If primary src fails, try alternative path
      if (audio.src.includes(currentTrack.src)) {
        audio.src = currentTrack.altSrc;
        if (isPlayingRef.current) {
          audio.play().catch(() => {});
        }
      }
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
      audio.pause();
      audio.src = '';
    };
  }, []);

  // Handle track index changes
  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    const shouldKeepPlaying = isPlayingRef.current && !isTabInactive && !isUserPausedRef.current;

    audio.src = TRACKS[currentTrackIndex].src;
    audio.load();

    if (shouldKeepPlaying) {
      audio.play().catch(() => {
        setIsPlaying(false);
      });
    }
  }, [currentTrackIndex]);

  // Handle volume changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    try {
      localStorage.setItem('brandlens_audio_vol', volume.toString());
    } catch {}
  }, [volume, isMuted]);

  // CRITICAL: Background audio protection
  // When user switches tab or minimizes window, PAUSE IMMEDIATELY.
  // When user returns, resume if was playing before leaving.
  useEffect(() => {
    const handleVisibility = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.hidden) {
        setIsTabInactive(true);
        if (isPlayingRef.current) {
          wasPlayingBeforeBackgroundRef.current = true;
          audio.pause();
          setIsPlaying(false);
        }
      } else {
        setIsTabInactive(false);
        if (wasPlayingBeforeBackgroundRef.current && !isUserPausedRef.current) {
          wasPlayingBeforeBackgroundRef.current = false;
          audio.play().then(() => {
            setIsPlaying(true);
          }).catch(() => {
            // Autoplay restriction or user interaction needed
          });
        }
      }
    };

    // Note: window blur/focus listeners removed — they were too aggressive and
    // paused audio whenever the user clicked DevTools or any non-browser window.
    // document.visibilitychange is the correct, spec-compliant guard.
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Listen to first click anywhere on document to activate audio context if user hasn't explicitly disabled
  useEffect(() => {
    const handleFirstUserInteraction = () => {
      if (hasInteracted) return;
      setHasInteracted(true);
      // Auto-start ambient audio on first interaction if not explicitly paused by user
      if (!isUserPausedRef.current && audioRef.current && !isPlayingRef.current && !document.hidden) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          // Allowed to fail if user prefers silence
        });
      }
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };

    window.addEventListener('click', handleFirstUserInteraction, { once: true });
    window.addEventListener('keydown', handleFirstUserInteraction, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('keydown', handleFirstUserInteraction);
    };
  }, [hasInteracted]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      isUserPausedRef.current = true;
      wasPlayingBeforeBackgroundRef.current = false;
      audio.pause();
      setIsPlaying(false);
    } else {
      isUserPausedRef.current = false;
      audio.play().then(() => {
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('Audio playback trigger requires user click:', err);
      });
    }
  }, [isPlaying]);

  const handleNext = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  const toggleMute = () => {
    setIsMuted((prev) => !prev);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="fixed bottom-5 left-5 z-40 transition-all duration-300 font-sans"
      aria-label="BrandLens Ambient Audio Player"
    >
      {/* Popover helper explaining exact folder placement */}
      {showFolderHelp && (
        <div className="absolute bottom-full left-0 mb-3 w-80 p-4 rounded-2xl bg-[#0c0d16] border border-[#a68bff]/30 shadow-[0_16px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-xs text-zinc-300 space-y-2.5 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-mono text-white font-semibold flex items-center gap-1.5">
              <Music size={14} className="text-[#9cecff]" />
              Song Files Folder
            </span>
            <button
              type="button"
              onClick={() => setShowFolderHelp(false)}
              className="text-zinc-400 hover:text-white text-xs px-1"
            >
              ✕
            </button>
          </div>
          <p className="text-zinc-300 leading-relaxed">
            Place your two custom MP3 files inside the project&apos;s <span className="font-mono text-[#9cecff] bg-white/5 px-1 py-0.5 rounded">public/</span> folder:
          </p>
          <div className="p-2.5 rounded-lg bg-black/60 border border-white/10 font-mono text-[11px] space-y-1 text-zinc-300">
            <div className="flex items-center gap-2 text-[#a4e6cf]">
              <span>📁</span>
              <span>public/song1.mp3</span>
            </div>
            <div className="flex items-center gap-2 text-[#9cecff]">
              <span>📁</span>
              <span>public/song2.mp3</span>
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            • BrandLens automatically loops and cycles between them.<br />
            • <strong className="text-white">Strict Tab Protection:</strong> Audio pauses instantly when you leave or switch tabs.
          </p>
        </div>
      )}

      {/* Main Container */}
      <div className="rounded-2xl bg-[#090a10]/95 border border-white/10 shadow-[0_10px_35px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl overflow-hidden transition-all duration-300">
        {/* Compact Bar (always visible) */}
        <div className="px-3 py-2 flex items-center gap-2.5">
          {/* Animated Equalizer Waves / Play Icon */}
          <button
            type="button"
            onClick={togglePlay}
            className="relative w-9 h-9 rounded-xl bg-white/[0.05] border border-white/10 hover:border-white/20 flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 cursor-pointer group"
            title={isPlaying ? 'Pause soundtrack' : 'Play soundtrack'}
            aria-label={isPlaying ? 'Pause soundtrack' : 'Play soundtrack'}
          >
            {isPlaying ? (
              <div className="flex items-end justify-center gap-0.5 h-3.5 w-3.5" aria-hidden="true">
                <span className="w-0.5 bg-[#9cecff] rounded-full animate-bounce [animation-duration:600ms] [animation-delay:0ms] h-full" />
                <span className="w-0.5 bg-[#a68bff] rounded-full animate-bounce [animation-duration:500ms] [animation-delay:150ms] h-3/4" />
                <span className="w-0.5 bg-[#a4e6cf] rounded-full animate-bounce [animation-duration:700ms] [animation-delay:300ms] h-4/5" />
                <span className="w-0.5 bg-[#9cecff] rounded-full animate-bounce [animation-duration:550ms] [animation-delay:100ms] h-2/3" />
              </div>
            ) : (
              <Play size={15} className="text-[#a4a3b2] group-hover:text-white ml-0.5 transition-colors" />
            )}
          </button>

          {/* Track Info (clickable to toggle expanded view) */}
          <div
            onClick={() => setIsExpanded(!isExpanded)}
            className="cursor-pointer select-none flex flex-col justify-center min-w-[120px] max-w-[170px]"
          >
            <div className="flex items-center gap-1.5">
              <span className="text-[12px] font-semibold text-white truncate">
                {currentTrack.title}
              </span>
              {isTabInactive ? (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" title="Paused (Tab inactive)" />
              ) : isPlaying ? (
                <span className="w-1.5 h-1.5 rounded-full bg-[#a4e6cf] shadow-[0_0_6px_#a4e6cf]" title="Playing" />
              ) : null}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-[#8a8a9a]">
              <span>{isPlaying ? 'ACTIVE' : 'PAUSED'}</span>
              <span>·</span>
              <span>{formatTime(currentTime)}</span>
            </div>
          </div>

          {/* Next Track Switcher */}
          <button
            type="button"
            onClick={handleNext}
            className="p-1.5 rounded-lg text-[#8a8a9a] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title="Next Song (Switch between song1 and song2)"
            aria-label="Next track"
          >
            <SkipForward size={14} />
          </button>

          {/* Expand / Collapse Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg text-[#8a8a9a] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse player' : 'Expand player & settings'}
            aria-label={isExpanded ? 'Collapse player' : 'Expand player'}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>

        {/* Expanded Controls Panel */}
        {isExpanded && (
          <div className="px-3.5 pb-3 pt-1 border-t border-white/[0.06] space-y-3 min-w-[280px]">
            {/* Track Switch Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {TRACKS.map((t, idx) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setCurrentTrackIndex(idx);
                    if (!isPlaying) {
                      isUserPausedRef.current = false;
                      audioRef.current?.play().then(() => setIsPlaying(true)).catch(() => {});
                    }
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono transition-all text-left truncate flex items-center justify-between border cursor-pointer ${
                    currentTrackIndex === idx
                      ? 'bg-[#a68bff]/15 border-[#a68bff]/40 text-[#9cecff] shadow-[0_0_12px_rgba(166,139,255,0.15)]'
                      : 'bg-white/[0.03] border-white/5 text-[#8e8e9e] hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  <span className="truncate">{idx === 0 ? 'Song 1' : 'Song 2'}</span>
                  {currentTrackIndex === idx && <Disc size={11} className={isPlaying ? 'animate-spin' : ''} />}
                </button>
              ))}
            </div>

            {/* Volume & Mute Row */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={toggleMute}
                className="text-[#8e8e9e] hover:text-white transition-colors cursor-pointer p-1"
                title={isMuted ? 'Unmute' : 'Mute'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setVolume(val);
                  if (isMuted && val > 0) setIsMuted(false);
                }}
                className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#a68bff]"
                aria-label="Soundtrack Volume"
              />
              <span className="text-[10px] font-mono text-[#8a8a9a] w-8 text-right">
                {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
              </span>
            </div>

            {/* Background Protection & File Location Status */}
            <div className="flex items-center justify-between pt-1 border-t border-white/[0.06] text-[10px] font-mono">
              <div
                className="flex items-center gap-1.5 text-[#a4e6cf]"
                title="Page Visibility Guard: Automatically stops audio when tab is backgrounded or minimized"
              >
                <ShieldCheck size={12} />
                <span>TAB-GUARD ACTIVE</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFolderHelp((prev) => !prev)}
                className="text-[#9cecff] hover:underline flex items-center gap-1 cursor-pointer"
                title="View folder to place song1.mp3 and song2.mp3"
              >
                <Music size={11} />
                <span>/public/</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
