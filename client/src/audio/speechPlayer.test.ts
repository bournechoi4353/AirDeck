// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpeechPlayer } from './speechPlayer';

class MockSource {
  buffer: unknown = null;
  onended: (() => void) | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  state = 'running';
  destination = {};
  resume = vi.fn(async () => {});
  decodeAudioData = vi.fn(async () => ({}) as AudioBuffer);
  createBufferSource = vi.fn(() => new MockSource());
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('AudioContext', MockAudioContext);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(16) })),
  );
});

describe('SpeechPlayer', () => {
  it('exposes voice variants and lets you pick one', () => {
    const p = new SpeechPlayer();
    expect(p.voices().length).toBeGreaterThan(0);
    expect(p.getVoice()).toBe('en');
    p.setVoice('en+m3');
    expect(p.getVoice()).toBe('en+m3');
  });

  it('POSTs the text and selected voice to /api/tts', async () => {
    const p = new SpeechPlayer();
    p.setVoice('en+f3');
    await p.speak('hello world');
    expect(fetch).toHaveBeenCalledWith('/api/tts', expect.objectContaining({ method: 'POST' }));
    const init = vi.mocked(fetch).mock.calls[0][1];
    expect(JSON.parse(String(init?.body))).toEqual({ text: 'hello world', voice: 'en+f3' });
  });

  it('ignores empty text', async () => {
    const p = new SpeechPlayer();
    await p.speak('   ');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('notifies speaking true on start, false on stop', async () => {
    const p = new SpeechPlayer();
    const cb = vi.fn();
    p.onSpeakingChange(cb);
    await p.speak('hi');
    expect(cb).toHaveBeenCalledWith(true);
    p.stop();
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('onSpeakingChange cleanup removes the listener', () => {
    const p = new SpeechPlayer();
    const cb = vi.fn();
    const off = p.onSpeakingChange(cb);
    off();
    p.stop();
    expect(cb).not.toHaveBeenCalled();
  });
});
