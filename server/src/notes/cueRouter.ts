import { Router } from 'express';
import { getOrGenerate, clearDeck } from './cueCache.js';
import type { Slide, Deck } from './types.js';

export const cueRouter = Router();

// POST /api/cue/stream
// Body: { deckId, slideIndex, slide, deck }
cueRouter.post('/stream', async (req, res) => {
  const { deckId, slideIndex, slide, deck } = req.body as {
    deckId: string;
    slideIndex: number;
    slide: Slide;
    deck: Deck;
  };

  if (!deckId || slideIndex == null || !slide || !deck) {
    res.status(400).json({ error: 'Missing required fields: deckId, slideIndex, slide, deck' });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    for await (const token of getOrGenerate(deckId, slideIndex, slide, deck)) {
      res.write(`data: ${token}\n\n`);
    }
  } catch (err) {
    console.error('[cueRouter] streamCue error', err);
  }

  res.write('data: [DONE]\n\n');
  res.end();
});

// POST /api/cue/clear
// Body: { deckId }
cueRouter.post('/clear', (req, res) => {
  const { deckId } = req.body as { deckId: string };
  if (deckId) clearDeck(deckId);
  res.json({ ok: true });
});