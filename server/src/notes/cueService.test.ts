import { describe, expect, it, vi, beforeEach } from 'vitest';

// The Claude Agent SDK is not available in unit tests (requires ~/.claude login). We mock it so the
// tests verify the generator wiring without live API calls.
vi.mock('@anthropic-ai/claude-agent-sdk', () => ({ query: vi.fn() }));

import { query } from '@anthropic-ai/claude-agent-sdk';
import { streamCue } from './cueService.js';
import type { Slide, Deck } from './types.js';

const slide: Slide = { index: 0, title: 'Intro', text: 'Welcome everyone.', notes: 'Keep it short.' };
const deck: Deck = { id: 'deck1', title: 'My Talk', slides: [slide] };

function assistantMsg(text: string) {
  return {
    type: 'assistant',
    message: { role: 'assistant', content: [{ type: 'text', text }] },
    parent_tool_use_id: null,
    session_id: 's',
  };
}

async function* fakeQuery(...msgs: unknown[]) {
  for (const m of msgs) yield m;
}
const asQuery = (g: AsyncGenerator<unknown>) => g as unknown as ReturnType<typeof query>;

beforeEach(() => vi.clearAllMocks());

describe('streamCue', () => {
  it('yields text from assistant message content blocks', async () => {
    vi.mocked(query).mockReturnValue(asQuery(fakeQuery(assistantMsg('Hello presenter.'))));

    const out: string[] = [];
    for await (const t of streamCue(slide, deck)) out.push(t);

    expect(out.join('')).toBe('Hello presenter.');
  });

  it('skips non-assistant messages', async () => {
    vi.mocked(query).mockReturnValue(asQuery(fakeQuery({ type: 'system' }, assistantMsg('Token'))));

    const out: string[] = [];
    for await (const t of streamCue(slide, deck)) out.push(t);

    expect(out.join('')).toBe('Token');
  });

  it('passes the correct options to query()', async () => {
    vi.mocked(query).mockReturnValue(asQuery(fakeQuery()));

    for await (const _ of streamCue(slide, deck)) {
      /* drain */
    }

    const call = vi.mocked(query).mock.calls[0][0];
    expect(call.options?.maxTurns).toBe(1);
    expect(call.options?.allowedTools).toEqual([]);
    expect(call.options?.settingSources).toEqual([]);
    expect(call.options?.model).toBe('claude-haiku-4-5');
  });

  it('uses an image (vision) prompt when the slide has an imageUrl', async () => {
    vi.mocked(query).mockReturnValue(asQuery(fakeQuery(assistantMsg('vision cue'))));

    const out: string[] = [];
    for await (const t of streamCue({ ...slide, imageUrl: 'data:image/png;base64,AAAA' }, deck)) {
      out.push(t);
    }

    expect(out.join('')).toBe('vision cue');
    // Vision mode sends an async-iterable prompt, not a plain string.
    expect(typeof vi.mocked(query).mock.calls[0][0].prompt).not.toBe('string');
  });
});
