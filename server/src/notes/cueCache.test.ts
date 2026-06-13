import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('./cueService.js', () => ({
  streamCue: vi.fn(),
}));

import { streamCue } from './cueService.js';
import { getOrGenerate, clearDeck } from './cueCache.js';
import type { Slide, Deck } from './types.js';

const slide0: Slide = { index: 0, title: 'Slide 0', text: 'Body 0' };
const slide1: Slide = { index: 1, title: 'Slide 1', text: 'Body 1' };
const deck: Deck = { id: 'test-deck', title: 'Test Deck', slides: [slide0, slide1] };

async function* tokens(...words: string[]) {
  for (const w of words) yield w;
}

beforeEach(() => {
  vi.clearAllMocks();
  clearDeck(deck.id);
});

describe('getOrGenerate', () => {
  it('streams tokens on cache miss', async () => {
    vi.mocked(streamCue).mockReturnValue(tokens('Hello', ' world') as any);

    const result: string[] = [];
    for await (const t of getOrGenerate(deck.id, 0, slide0, deck)) result.push(t);

    expect(result).toContain('Hello');
    expect(result).toContain(' world');
  });

  it('returns cached text on second call without re-invoking streamCue', async () => {
    vi.mocked(streamCue).mockReturnValue(tokens('cached text') as any);

    // First call — fills the cache
    for await (const _ of getOrGenerate(deck.id, 0, slide0, deck)) { /* drain */ }

    // Allow lookahead promise to settle
    await new Promise(r => setTimeout(r, 50));

    // Second call — should not call streamCue again for slide 0
    const callCount = vi.mocked(streamCue).mock.calls.length;
    const result: string[] = [];
    for await (const t of getOrGenerate(deck.id, 0, slide0, deck)) result.push(t);

    const newCalls = vi.mocked(streamCue).mock.calls.length - callCount;
    expect(newCalls).toBe(0);
    expect(result.join('')).toBe('cached text');
  });

  it('prefetches slide N+1 after generating slide N', async () => {
    vi.mocked(streamCue).mockReturnValue(tokens('first', 'second') as any);

    for await (const _ of getOrGenerate(deck.id, 0, slide0, deck)) { /* drain */ }
    await new Promise(r => setTimeout(r, 100));

    // streamCue should have been called for slide 0 (generation) + slide 1 (lookahead)
    expect(vi.mocked(streamCue).mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});