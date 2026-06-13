// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpeechPlayer } from './speechPlayer';

class MockUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  onstart: ((e: Event) => void) | null = null;
  onend: ((e: Event) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;
  constructor(text: string) { this.text = text; }
}

const mockCancel = vi.fn();
const mockSpeak = vi.fn();
const mockGetVoices = vi.fn(() => [
  { name: 'Alex', lang: 'en-US' } as SpeechSynthesisVoice,
  { name: 'Amélie', lang: 'fr-FR' } as SpeechSynthesisVoice,
  { name: 'Samantha', lang: 'en-GB' } as SpeechSynthesisVoice,
]);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('SpeechSynthesisUtterance', MockUtterance);
  Object.defineProperty(window, 'speechSynthesis', {
    value: {
      speak: mockSpeak,
      cancel: mockCancel,
      getVoices: mockGetVoices,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
});

describe('SpeechPlayer', () => {
  it('cancels then speaks an utterance', () => {
    const player = new SpeechPlayer();
    player.speak('hello world');
    expect(mockCancel).toHaveBeenCalledOnce();
    expect(mockSpeak).toHaveBeenCalledWith(expect.any(MockUtterance));
  });

  it('cancels before each new utterance (barge-in)', () => {
    const player = new SpeechPlayer();
    player.speak('first');
    player.speak('second');
    expect(mockCancel).toHaveBeenCalledTimes(2);
    expect(mockSpeak).toHaveBeenCalledTimes(2);
  });

  it('stop cancels synthesis and notifies false', () => {
    const player = new SpeechPlayer();
    const cb = vi.fn();
    player.onSpeakingChange(cb);
    player.stop();
    expect(mockCancel).toHaveBeenCalledOnce();
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('listVoices returns only English voices', () => {
    const player = new SpeechPlayer();
    const voices = player.listVoices();
    expect(voices).toHaveLength(2);
    expect(voices.map((v) => v.name)).toEqual(['Alex', 'Samantha']);
  });

  it('onSpeakingChange cleanup removes listener', () => {
    const player = new SpeechPlayer();
    const cb = vi.fn();
    const cleanup = player.onSpeakingChange(cb);
    cleanup();
    player.stop();
    expect(cb).not.toHaveBeenCalled();
  });

  it('notifies true on utterance start, false on end', () => {
    const player = new SpeechPlayer();
    const cb = vi.fn();
    player.onSpeakingChange(cb);

    let captured: MockUtterance | null = null;
    mockSpeak.mockImplementation((u: MockUtterance) => { captured = u; });

    player.speak('hello');
    captured!.onstart?.(new Event('start'));
    expect(cb).toHaveBeenCalledWith(true);

    captured!.onend?.(new Event('end'));
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('notifies false on utterance error', () => {
    const player = new SpeechPlayer();
    const cb = vi.fn();
    player.onSpeakingChange(cb);

    let captured: MockUtterance | null = null;
    mockSpeak.mockImplementation((u: MockUtterance) => { captured = u; });

    player.speak('hello');
    captured!.onerror?.(new Event('error'));
    expect(cb).toHaveBeenCalledWith(false);
  });

  it('uses the set voice on the next utterance', () => {
    const player = new SpeechPlayer();
    const voice = { name: 'Alex', lang: 'en-US' } as SpeechSynthesisVoice;
    player.setVoice(voice);

    let captured: MockUtterance | null = null;
    mockSpeak.mockImplementation((u: MockUtterance) => { captured = u; });

    player.speak('test');
    expect(captured!.voice).toBe(voice);
  });
});