/**
 * SilentAudioEngine — zero UI ambient music player.
 * Plays song1.mp3 → song2.mp3 → loop on first user interaction.
 * Absolutely NO visible DOM output.
 */
import { useEffect, useRef } from 'react';

const TRACKS = ['/song1.mp3', '/song2.mp3'];
const DEFAULT_VOLUME = 0.35;

export const SilentAudioEngine: React.FC = () => {
  const audioRef       = useRef<HTMLAudioElement | null>(null);
  const trackIdxRef    = useRef(0);
  const hasInteracted  = useRef(false);
  const isTabHidden    = useRef(false);

  useEffect(() => {
    const audio = new Audio(TRACKS[0]);
    audio.preload = 'auto';
    audio.volume  = DEFAULT_VOLUME;
    audioRef.current = audio;

    // When a track ends, advance to the next one and play
    const onEnded = () => {
      trackIdxRef.current = (trackIdxRef.current + 1) % TRACKS.length;
      audio.src = TRACKS[trackIdxRef.current];
      audio.load();
      audio.play().catch(() => {/* autoplay policy — silently ignore */});
    };
    audio.addEventListener('ended', onEnded);

    // Pause when tab is hidden, resume when it becomes visible again
    const onVisibilityChange = () => {
      if (document.hidden) {
        isTabHidden.current = true;
        audio.pause();
      } else {
        isTabHidden.current = false;
        if (hasInteracted.current) {
          audio.play().catch(() => {});
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Start on first real user interaction (browser autoplay policy)
    const startAudio = () => {
      if (hasInteracted.current) return;
      hasInteracted.current = true;
      if (!document.hidden) {
        audio.play().catch(() => {/* blocked by autoplay policy */});
      }
    };
    window.addEventListener('click',   startAudio, { once: true });
    window.addEventListener('keydown', startAudio, { once: true });
    window.addEventListener('touchstart', startAudio, { once: true });

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('ended', onEnded);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('click',      startAudio);
      window.removeEventListener('keydown',    startAudio);
      window.removeEventListener('touchstart', startAudio);
    };
  }, []);

  return null; // intentionally no UI
};
