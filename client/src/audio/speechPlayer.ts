import { apiUrl } from '../api';

export type TtsVoice = { id: string; label: string };

// Natural macOS voices (synthesized server-side via `say`; see /api/tts). On non-macOS hosts the
// server falls back to robotic eSpeak and ignores these names.
const VOICES: TtsVoice[] = [
  { id: 'Samantha', label: 'Samantha (US)' },
  { id: 'Karen', label: 'Karen (AU)' },
  { id: 'Moira', label: 'Moira (IE)' },
  { id: 'Tessa', label: 'Tessa (ZA)' },
  { id: 'Daniel', label: 'Daniel (UK)' },
  { id: 'Rishi', label: 'Rishi (IN)' },
];

type SpeakingListener = (speaking: boolean) => void;

// Plays cue audio synthesized server-side by eSpeak-NG (WASM). Uses Web Audio, so playback is
// reliable regardless of OS voices, unlocks on a user gesture, and can later be routed to a chosen
// output device. Each speak() supersedes the previous one (barge-in).
export class SpeechPlayer {
  private voiceId = 'Samantha';
  private ctx: AudioContext | null = null;
  private current: AudioBufferSourceNode | null = null;
  private reqId = 0;
  private listeners: SpeakingListener[] = [];

  voices(): TtsVoice[] {
    return VOICES;
  }

  getVoice(): string {
    return this.voiceId;
  }

  setVoice(id: string): void {
    this.voiceId = id;
  }

  // Call from a real user gesture so the AudioContext is allowed to produce sound afterwards.
  unlock(): void {
    try {
      const ctx = this.audioContext();
      if (ctx.state === 'suspended') void ctx.resume();
    } catch {
      // ignore
    }
  }

  async speak(text: string): Promise<void> {
    if (!text.trim()) return;
    const id = ++this.reqId;
    this.stopCurrent();
    try {
      const res = await fetch(apiUrl('/api/tts'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: this.voiceId }),
      });
      if (!res.ok || id !== this.reqId) return;
      const data = await res.arrayBuffer();
      if (id !== this.reqId) return;

      const ctx = this.audioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      const buffer = await ctx.decodeAudioData(data);
      if (id !== this.reqId) return;

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => {
        if (this.current === source) {
          this.current = null;
          this.notify(false);
        }
      };
      this.current = source;
      this.notify(true);
      source.start(0);
    } catch {
      this.notify(false);
    }
  }

  stop(): void {
    this.stopCurrent();
    this.notify(false);
  }

  onSpeakingChange(cb: SpeakingListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private audioContext(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    return this.ctx;
  }

  private stopCurrent(): void {
    if (this.current) {
      this.current.onended = null;
      try {
        this.current.stop();
      } catch {
        // already stopped — fine
      }
      this.current = null;
    }
  }

  private notify(speaking: boolean): void {
    this.listeners.forEach((cb) => cb(speaking));
  }
}
