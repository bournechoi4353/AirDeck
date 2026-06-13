import { query } from '@anthropic-ai/claude-agent-sdk';
import type { Slide, Deck } from './types.js';

const CUE_SYSTEM_PROMPT =
  "You are a teleprompter whispering into the presenter's earpiece. " +
  "Given a slide's title, body, and speaker notes, write the exact words the presenter should say out loud — " +
  'one or two natural spoken sentences they can repeat verbatim. ' +
  'Write in first person as the presenter. No coaching, no meta-commentary, no stage directions. ' +
  'Just the words.';

function buildPrompt(slide: Slide, deck: Deck): string {
  const parts = [`Title: ${slide.title || '(no title)'}`, `Body: ${slide.text || '(no body text)'}`];
  if (slide.notes) parts.push(`Notes: ${slide.notes}`);
  parts.push(`Deck goal: ${deck.title}`);
  return parts.join('\n');
}

export async function* streamCue(slide: Slide, deck: Deck): AsyncGenerator<string> {
  const gen = query({
    prompt: buildPrompt(slide, deck),
    options: {
      systemPrompt: CUE_SYSTEM_PROMPT,
      model: 'claude-haiku-4-5',
      maxTurns: 1,
      allowedTools: [],
      settingSources: [],
      includePartialMessages: true,
      persistSession: false,
    },
  });

  for await (const msg of gen) {
    if (msg.type !== 'stream_event') continue;
    const event = msg.event;
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta' &&
      event.delta.text
    ) {
      yield event.delta.text;
    }
  }
}