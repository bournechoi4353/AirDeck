import { describe, expect, it, vi, beforeEach } from 'vitest';

// The Claude Agent SDK is not available in unit tests (requires ~/.claude login).
// We mock it so the unit tests verify the generator wiring without live API calls.

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

import { query } from '@anthropic-ai/claude-agent-sdk';
import { streamCue } from './cueService.js';
import type { Slide, Deck } from './types.js';

const slide: Slide = { index: 0, title: 'Intro', text: 'Welcome everyone.', notes: 'Keep it short.' };
const deck: Deck = { id: 'deck1', title: 'My Talk', slides: [slide] };

function makeStreamEvent(text: string) {
  return {
    type: 'stream_event',
    event: { type: 'content_block_delta', delta: { type: 'text_delta', text } },
    parent_tool_use_id: null,
    uuid: 'uuid' as any,
    session_id: 'session1',
  };
}

async function* fakeQuery(tokens: string[]) {
  for (const t of tokens) yield makeStreamEvent(t);
  yield { type: 'result', subtype: 'success', session_id: 'session1', uuid: 'uuid' as any };
}

beforeEach(() => vi.clearAllMocks());

describe('streamCue', () => {
  it('yields text tokens from stream_event messages', async () => {
    vi.mocked(query).mockReturnValue(fakeQuery(['Hello', ' presenter']) as any);

    const tokens: string[] = [];
    for await (const t of streamCue(slide, deck)) tokens.push(t);

    expect(tokens).toEqual(['Hello', ' presenter']);
  });

  it('skips non-stream_event messages', async () => {
    async function* gen() {
      yield { type: 'system', subtype: 'init', session_id: 's', uuid: 'u' as any };
      yield makeStreamEvent('Token');
    }
    vi.mocked(query).mockReturnValue(gen() as any);

    const tokens: string[] = [];
    for await (const t of streamCue(slide, deck)) tokens.push(t);

    expect(tokens).toEqual(['Token']);
  });

  it('passes the correct options to query()', async () => {
    vi.mocked(query).mockReturnValue(fakeQuery([]) as any);

    for await (const _ of streamCue(slide, deck)) { /* drain */ }

    expect(query).toHaveBeenCalledOnce();
    const call = vi.mocked(query).mock.calls[0][0];
    expect(call.options?.maxTurns).toBe(1);
    expect(call.options?.allowedTools).toEqual([]);
    expect(call.options?.settingSources).toEqual([]);
    expect(call.options?.model).toBe('claude-haiku-4-5');
  });
});