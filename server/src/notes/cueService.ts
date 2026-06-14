import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import type { Slide, Deck } from './types.js';

const CUE_SYSTEM_PROMPT = [
  "You are the presenter's silent teleprompter. You are shown a slide — as an image and/or its text — plus its speaker notes.",
  'Output ONLY the exact words the presenter should say out loud right now: one or two natural, confident spoken sentences, in first person, that they can repeat verbatim.',
  'ALWAYS produce a usable line by reading whatever is on the slide. If it is sparse, infer the point from what is there plus the deck topic and speak to it naturally.',
  'Never say there is not enough information, never ask for more, never apologize, never describe or refer to "the slide", never add coaching, labels, quotation marks, or stage directions. Output only the spoken words.',
].join(' ');

function buildPrompt(slide: Slide, deck: Deck): string {
  const lines = [`Presentation: "${deck.title}".`];
  if (slide.title?.trim()) lines.push(`Slide title: ${slide.title}`);
  if (slide.text?.trim()) lines.push(`Slide text: ${slide.text}`);
  if (slide.notes?.trim()) lines.push(`Speaker notes: ${slide.notes}`);
  lines.push('Say the one or two sentences the presenter should speak for this slide now.');
  return lines.join('\n');
}

// Extracts the base64 payload from a data URL like "data:image/png;base64,AAAA".
function base64FromDataUrl(url: string | undefined): string | null {
  if (!url) return null;
  const marker = 'base64,';
  const i = url.indexOf(marker);
  return i === -1 ? null : url.slice(i + marker.length);
}

const options = {
  systemPrompt: CUE_SYSTEM_PROMPT,
  model: 'claude-haiku-4-5',
  maxTurns: 1,
  allowedTools: [],
  settingSources: [],
  persistSession: false,
};

// Streaming-input form lets us attach the rendered slide image so Claude reads what's actually on
// screen (robust to any deck — text extraction can miss content, vision does not).
async function* imageInput(data: string, text: string): AsyncGenerator<SDKUserMessage> {
  yield {
    type: 'user',
    parent_tool_use_id: null,
    message: {
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data } },
        { type: 'text', text },
      ],
    },
  };
}

export async function* streamCue(slide: Slide, deck: Deck): AsyncGenerator<string> {
  const promptText = buildPrompt(slide, deck);
  const imageData = base64FromDataUrl(slide.imageUrl);

  const gen = imageData
    ? query({ prompt: imageInput(imageData, promptText), options })
    : query({ prompt: promptText, options });

  for await (const msg of gen) {
    if (msg.type !== 'assistant') continue;
    for (const block of msg.message.content) {
      if (block.type === 'text' && block.text) yield block.text;
    }
  }
}
