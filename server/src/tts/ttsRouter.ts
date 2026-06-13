import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Router } from 'express';
import text2wav from 'text2wav';

const execFileAsync = promisify(execFile);
const isMac = process.platform === 'darwin';

export const ttsRouter = Router();

const MAX_TEXT = 600;
const MAC_VOICE = /^[A-Za-z][A-Za-z0-9 ()]{0,40}$/; // macOS voice names (e.g. "Samantha", "Eddy (English (US))")
const ESPEAK_VOICE = /^[a-z]{2,3}(\+[a-z0-9]+)?$/i; // eSpeak voice ids (e.g. 'en', 'en+m3')

// macOS: natural built-in voices via the `say` command (offline, no key, no download).
async function synthMac(text: string, voice: string): Promise<Buffer> {
  const file = join(tmpdir(), `airdeck-cue-${randomUUID()}.wav`);
  const v = MAC_VOICE.test(voice) ? voice : 'Samantha';
  const base = ['-o', file, '--data-format=LEI16@22050'];
  try {
    try {
      await execFileAsync('say', ['-v', v, ...base, text]);
    } catch {
      // requested voice isn't installed — fall back to the system default voice
      await execFileAsync('say', [...base, text]);
    }
    return await readFile(file);
  } finally {
    await unlink(file).catch(() => {});
  }
}

// Anywhere else: eSpeak-NG compiled to WASM (robotic, but works on any platform).
async function synthEspeak(text: string, voice: string): Promise<Buffer> {
  const v = ESPEAK_VOICE.test(voice) ? voice : 'en';
  return Buffer.from(await text2wav(text, { voice: v }));
}

// POST /api/tts  Body: { text, voice? } -> audio/wav
ttsRouter.post('/', async (req, res) => {
  const { text, voice } = req.body as { text?: string; voice?: string };
  if (!text || !text.trim()) {
    res.status(400).json({ error: 'Missing text' });
    return;
  }
  const clipped = text.slice(0, MAX_TEXT);
  try {
    const wav = isMac
      ? await synthMac(clipped, voice ?? '')
      : await synthEspeak(clipped, voice ?? '');
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Cache-Control', 'no-store');
    res.send(wav);
  } catch (err) {
    console.error('[ttsRouter] synth error', err);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});
