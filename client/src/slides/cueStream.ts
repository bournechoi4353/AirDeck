import { apiUrl } from '../api';
import type { Slide, Deck } from './types.js';

// Drop the (large, base64) rendered image from a slide.
function textOnly(slide: Slide): Slide {
  return { index: slide.index, title: slide.title, text: slide.text, notes: slide.notes };
}

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

  // The cue reads the rendered slide image (vision). Send the current slide's image (via `slide`)
  // and the NEXT slide's image (for the cache's lookahead prefetch); strip every other image so the
  // request body stays small.
  const slimDeck: Deck = {
    id: deck.id,
    title: deck.title,
    slides: deck.slides.map((s, i) => (i === slideIndex + 1 ? s : textOnly(s))),
  };

  const run = async () => {
    const res = await fetch(apiUrl('/api/cue/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId, slideIndex, slide, deck: slimDeck }),
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
