import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => {
    return player.onSpeakingChange(setIsSpeaking);
  }, [player]);

  return {
    speak: (text) => player.speak(text),
    stop: () => player.stop(),
    isSpeaking,
    player,
  };
}