declare module 'text2wav' {
  interface Text2WavOptions {
    voice?: string; // espeak -v, e.g. 'en', 'en+m3', 'en+whisper'
  }
  export default function text2wav(text: string, options?: Text2WavOptions): Promise<Uint8Array>;
}
