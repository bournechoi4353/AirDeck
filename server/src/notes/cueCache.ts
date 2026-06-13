import { streamCue } from './cueService.js';
import type { Slide, Deck } from './types.js';

const cache = new Map<string, Promise<string>>();

function cacheKey(deckId: string, slideIndex: number): string {
  return `${deckId}:${slideIndex}`;
}

export async function* getOrGenerate(
  deckId: string,
  slideIndex: number,
  slide: Slide,
  deck: Deck,
): AsyncGenerator<string> {
  const key = cacheKey(deckId, slideIndex);

  if (cache.has(key)) {
    const full = await cache.get(key)!;
    // Simulate token-by-token delivery from cached text
    for (const token of full.split(/(?<=\s)|(?=\s)/)) {
      if (token) yield token;
    }
    return;
  }

  // Cache miss: stream and collect simultaneously
  const tokens: string[] = [];
  let resolveCache!: (text: string) => void;
  const cachePromise = new Promise<string>(r => {
    resolveCache = r;
  });
  cache.set(key, cachePromise);

  for await (const token of streamCue(slide, deck)) {
    tokens.push(token);
    yield token;
  }

  resolveCache(tokens.join(''));

  // Lookahead: prefetch the next slide silently
  const nextSlide = deck.slides[slideIndex + 1];
  if (nextSlide) {
    const nextKey = cacheKey(deckId, slideIndex + 1);
    if (!cache.has(nextKey)) {
      let resolveNext!: (text: string) => void;
      const nextPromise = new Promise<string>(r => {
        resolveNext = r;
      });
      cache.set(nextKey, nextPromise);

      const collect = async () => {
        const parts: string[] = [];
        for await (const t of streamCue(nextSlide, deck)) parts.push(t);
        resolveNext(parts.join(''));
      };
      collect().catch(() => {
        cache.delete(nextKey);
      });
    }
  }
}

export function clearDeck(deckId: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(`${deckId}:`)) cache.delete(key);
  }
}