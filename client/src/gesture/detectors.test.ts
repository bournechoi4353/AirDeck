import { describe, it, expect } from 'vitest';
import { detectIndex, detectPinky } from './detectors';
import type { Landmark } from './types';

// A closed fist: every finger tip below its PIP joint (curled).
const FIST: Partial<Record<number, Partial<Landmark>>> = {
  8: { y: 0.6 }, // index tip below PIP
  6: { y: 0.4 }, // index PIP
  12: { y: 0.6 }, // middle tip
  10: { y: 0.4 }, // middle PIP
  16: { y: 0.6 }, // ring tip
  14: { y: 0.4 }, // ring PIP
  20: { y: 0.6 }, // pinky tip
  18: { y: 0.4 }, // pinky PIP
};

// Raising a finger = moving its tip above its PIP (smaller y).
function makeLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  return Array.from({ length: 21 }, (_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    ...FIST[i],
    ...overrides[i],
  }));
}

describe('detectIndex', () => {
  it('is true when only the index finger is up', () => {
    expect(detectIndex(makeLandmarks({ 8: { y: 0.2 } }))).toBe(true);
  });

  it('is false for a closed fist', () => {
    expect(detectIndex(makeLandmarks())).toBe(false);
  });

  it('is false when the pinky is also up', () => {
    expect(detectIndex(makeLandmarks({ 8: { y: 0.2 }, 20: { y: 0.2 } }))).toBe(false);
  });

  it('is false when the index is down (pinky up)', () => {
    expect(detectIndex(makeLandmarks({ 20: { y: 0.2 } }))).toBe(false);
  });
});

describe('detectPinky', () => {
  it('is true when only the pinky finger is up', () => {
    expect(detectPinky(makeLandmarks({ 20: { y: 0.2 } }))).toBe(true);
  });

  it('is false for a closed fist', () => {
    expect(detectPinky(makeLandmarks())).toBe(false);
  });

  it('is false when the index is also up', () => {
    expect(detectPinky(makeLandmarks({ 20: { y: 0.2 }, 8: { y: 0.2 } }))).toBe(false);
  });

  it('is false when the pinky is down (index up)', () => {
    expect(detectPinky(makeLandmarks({ 8: { y: 0.2 } }))).toBe(false);
  });
});
