import { apiUrl } from '../api';
import type { Slide, Deck } from './types.js';

// The cue service only needs slide text. Strip the (large, base64) rendered page images before
// sending — a full imported deck's images blow past the server's JSON body limit, which is why
// cues worked for the sample deck (no images) but not for imported Google decks.
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

  // Keep slide text (the lookahead prefetch needs the next slide's text), drop the images.
  const slimDeck: Deck = { id: deck.id, title: deck.title, slides: deck.slides.map(textOnly) };

  const run = async () => {
    const res = await fetch(apiUrl('/api/cue/stream'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deckId, slideIndex, slide: textOnly(slide), deck: slimDeck }),
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
