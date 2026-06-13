import { useCallback, useEffect, useRef, useState } from 'react';
import { SpeechPlayer } from './speechPlayer';

export interface UseTTS {
  speak: (text: string) => void;
  stop: () => void;
  isSpeaking: boolean;
  player: SpeechPlayer;
}

export function useTTS(): UseTTS {
  const playerRef = useRef<SpeechPlayer | null>(null);
  if (!playerRef.current) playerRef.current = new SpeechPlayer();
  const player = playerRef.current;

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => player.onSpeakingChange(setIsSpeaking), [player]);

  // Unlock the AudioContext on the first user interaction so later (gesture-less) cues can play.
  useEffect(() => {
    const unlock = () => player.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [player]);

  // Stable identities — the player is stable, so these must be too, or effects that depend on
  // `speak` (e.g. the per-slide cue effect) would re-run on every render and re-speak the cue.
  const speak = useCallback((text: string) => void player.speak(text), [player]);
  const stop = useCallback(() => player.stop(), [player]);

  return { speak, stop, isSpeaking, player };
}
