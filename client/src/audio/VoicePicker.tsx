import { useEffect, useState } from 'react';
import type { SpeechPlayer } from './speechPlayer';

interface Props {
  player: SpeechPlayer;
}

export function VoicePicker({ player }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedName, setSelectedName] = useState<string>('');

  useEffect(() => {
    const load = () => {
      const v = player.listVoices();
      setVoices(v);
      setSelectedName((prev) => {
        if (prev && v.some((voice) => voice.name === prev)) return prev;
        if (v.length > 0) {
          player.setVoice(v[0]);
          return v[0].name;
        }
        return '';
      });
    };
    load();
    window.speechSynthesis.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
  }, [player]);

  if (voices.length === 0) return null;

  return (
    <select
      value={selectedName}
      onChange={(e) => {
        const voice = voices.find((v) => v.name === e.target.value);
        if (voice) {
          player.setVoice(voice);
          setSelectedName(voice.name);
        }
      }}
      style={{ fontSize: 13 }}
      aria-label="Cue voice"
    >
      {voices.map((v) => (
        <option key={v.name} value={v.name}>
          {v.name} ({v.lang})
        </option>
      ))}
    </select>
  );
}