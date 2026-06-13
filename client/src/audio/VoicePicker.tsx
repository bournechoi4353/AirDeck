import { useState } from 'react';
import type { SpeechPlayer } from './speechPlayer';

export function VoicePicker({ player }: { player: SpeechPlayer }) {
  const [voice, setVoice] = useState(player.getVoice());

  return (
    <select
      value={voice}
      onChange={(e) => {
        player.setVoice(e.target.value);
        setVoice(e.target.value);
      }}
      style={{ fontSize: 13 }}
      aria-label="Cue voice"
    >
      {player.voices().map((v) => (
        <option key={v.id} value={v.id}>
          {v.label}
        </option>
      ))}
    </select>
  );
}
