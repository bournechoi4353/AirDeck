import { Router } from 'express';
import text2wav from 'text2wav';

export const ttsRouter = Router();

const MAX_TEXT = 600;
// Whitelist the voice param (it becomes an espeak -v argument) — e.g. 'en', 'en+m3', 'en+whisper'.
const ALLOWED_VOICE = /^[a-z]{2,3}(\+[a-z0-9]+)?$/i;

// POST /api/tts  Body: { text, voice? } -> audio/wav
// Speech is synthesized by eSpeak-NG compiled to WASM (offline, no API key, no OS voices needed).
ttsRouter.post('/', async (req, res) => {
  const { text, voice } = req.body as { text?: string; voice?: string };
  if (!text || !text.trim()) {
    res.status(400).json({ error: 'Missing text' });
    return;
  }
  const safeVoice = voice && ALLOWED_VOICE.test(voice) ? voice : 'en';
  try {
    const wav = await text2wav(text.slice(0, MAX_TEXT), { voice: safeVoice });
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.send(Buffer.from(wav));
  } catch (err) {
    console.error('[ttsRouter] synth error', err);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});
