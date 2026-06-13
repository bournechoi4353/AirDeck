type SpeakingListener = (speaking: boolean) => void;

export class SpeechPlayer {
  private voice: SpeechSynthesisVoice | null = null;
  private listeners: SpeakingListener[] = [];

  speak(text: string): void {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = 1.1;
    utterance.onstart = () => this.notify(true);
    utterance.onend = () => this.notify(false);
    utterance.onerror = () => this.notify(false);
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    window.speechSynthesis.cancel();
    this.notify(false);
  }

  setVoice(voice: SpeechSynthesisVoice): void {
    this.voice = voice;
  }

  listVoices(): SpeechSynthesisVoice[] {
    return window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  }

  onSpeakingChange(cb: SpeakingListener): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notify(speaking: boolean): void {
    this.listeners.forEach((cb) => cb(speaking));
  }
}