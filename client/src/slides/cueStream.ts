import type { Slide, Deck } from './types.js';

export function connectCueStream(
  deckId: string,
  slideIndex: number,
  slide: Slide,
  deck: Deck,
  onToken: (token: string) => void,
  onDone: () => void,
): () => void {
  let closed = false;
  const controller = new AbortController();

  const run = async () => {
    const res = await fetch('/api/cue/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId, slideIndex, slide, deck }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) return;

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done || closed) break;

      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }
        onToken(data);
      }
    }
  };

  run().catch(() => {});

  return () => {
    closed = true;
    controller.abort();
  };
}