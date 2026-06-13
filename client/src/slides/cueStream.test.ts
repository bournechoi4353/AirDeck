import { describe, expect, it, vi, beforeEach } from 'vitest';
import { connectCueStream } from './cueStream.js';
import type { Slide, Deck } from './types.js';

const slide: Slide = { index: 0, title: 'T', text: 'B' };
const deck: Deck = { id: 'd1', title: 'Deck', slides: [slide] };

function sseBody(lines: string[]): ReadableStream<Uint8Array> {
  const text = lines.join('\n') + '\n';
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('connectCueStream', () => {
  it('calls onToken for each data line and onDone on [DONE]', async () => {
    const body = sseBody(['data: Hello', '', 'data: world', '', 'data: [DONE]', '']);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, body }),
    );

    const tokens: string[] = [];
    let done = false;

    connectCueStream('d1', 0, slide, deck, t => tokens.push(t), () => { done = true; });

    await new Promise(r => setTimeout(r, 50));
    expect(tokens).toEqual(['Hello', 'world']);
    expect(done).toBe(true);
  });

  it('cleanup function aborts the fetch', async () => {
    let aborted = false;
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url, opts) => {
      opts.signal.addEventListener('abort', () => { aborted = true; });
      return new Promise(() => {}); // never resolves
    }));

    const cleanup = connectCueStream('d1', 0, slide, deck, () => {}, () => {});
    cleanup();

    await new Promise(r => setTimeout(r, 10));
    expect(aborted).toBe(true);
  });
});