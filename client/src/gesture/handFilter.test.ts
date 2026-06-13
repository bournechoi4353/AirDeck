import { beforeEach, describe, expect, it } from 'vitest';
import {
  filterHand,
  getPreferredHandedness,
  setPreferredHandedness,
} from './handFilter';
import type { HandLandmarkerResults } from './handFilter';
import type { Landmark } from './types';

// Distinguishable landmark arrays — id encodes into x/y so we can tell them apart.
function makeLandmarks(id: number): Landmark[] {
  return Array.from({ length: 21 }, () => ({ x: id * 0.1, y: id * 0.1, z: 0 }));
}

function makeResults(
  hands: Array<{ landmarks: Landmark[]; handedness: string; score: number }>,
): HandLandmarkerResults {
  return {
    landmarks: hands.map(h => h.landmarks),
    handedness: hands.map(h => [{ categoryName: h.handedness, score: h.score }]),
  };
}

const LEFT_HAND = makeLandmarks(1);
const RIGHT_HAND = makeLandmarks(2);

beforeEach(() => {
  setPreferredHandedness(null);
});

// --- zero hands ---

describe('filterHand — zero hands', () => {
  it('returns null when no hands detected', () => {
    expect(filterHand({ landmarks: [], handedness: [] })).toBeNull();
  });
});

// --- one hand ---

describe('filterHand — one hand', () => {
  it('returns the only hand regardless of preference', () => {
    const results = makeResults([{ landmarks: LEFT_HAND, handedness: 'Left', score: 0.9 }]);
    expect(filterHand(results, 'Right')).toBe(LEFT_HAND);
  });

  it('returns the only hand when preference is null', () => {
    const results = makeResults([{ landmarks: RIGHT_HAND, handedness: 'Right', score: 0.8 }]);
    expect(filterHand(results, null)).toBe(RIGHT_HAND);
  });
});

// --- two hands, preference set ---

describe('filterHand — two hands, preference set', () => {
  it('returns the preferred Left hand', () => {
    const results = makeResults([
      { landmarks: LEFT_HAND, handedness: 'Left', score: 0.9 },
      { landmarks: RIGHT_HAND, handedness: 'Right', score: 0.8 },
    ]);
    expect(filterHand(results, 'Left')).toBe(LEFT_HAND);
  });

  it('returns the preferred Right hand', () => {
    const results = makeResults([
      { landmarks: LEFT_HAND, handedness: 'Left', score: 0.9 },
      { landmarks: RIGHT_HAND, handedness: 'Right', score: 0.8 },
    ]);
    expect(filterHand(results, 'Right')).toBe(RIGHT_HAND);
  });

  it('falls back to highest confidence when preferred handedness is not in frame', () => {
    // Two left hands, preference for Right — falls back to confidence
    const results = makeResults([
      { landmarks: LEFT_HAND, handedness: 'Left', score: 0.7 },
      { landmarks: RIGHT_HAND, handedness: 'Left', score: 0.95 },
    ]);
    expect(filterHand(results, 'Right')).toBe(RIGHT_HAND);
  });
});

// --- two hands, no preference ---

describe('filterHand — two hands, no preference', () => {
  it('returns the hand with the higher confidence score', () => {
    const results = makeResults([
      { landmarks: LEFT_HAND, handedness: 'Left', score: 0.7 },
      { landmarks: RIGHT_HAND, handedness: 'Right', score: 0.95 },
    ]);
    expect(filterHand(results, null)).toBe(RIGHT_HAND);
  });

  it('returns the first hand when confidence scores are equal', () => {
    const results = makeResults([
      { landmarks: LEFT_HAND, handedness: 'Left', score: 0.9 },
      { landmarks: RIGHT_HAND, handedness: 'Right', score: 0.9 },
    ]);
    expect(filterHand(results, null)).toBe(LEFT_HAND);
  });
});

// --- module-level preference state ---

describe('setPreferredHandedness / getPreferredHandedness', () => {
  it('stores and retrieves the preferred handedness', () => {
    setPreferredHandedness('Right');
    expect(getPreferredHandedness()).toBe('Right');
  });

  it('can be cleared to null', () => {
    setPreferredHandedness('Left');
    setPreferredHandedness(null);
    expect(getPreferredHandedness()).toBeNull();
  });

  it('filterHand uses module-level preference when no explicit arg passed', () => {
    setPreferredHandedness('Right');
    const results = makeResults([
      { landmarks: LEFT_HAND, handedness: 'Left', score: 0.9 },
      { landmarks: RIGHT_HAND, handedness: 'Right', score: 0.8 },
    ]);
    expect(filterHand(results)).toBe(RIGHT_HAND);
  });

  it('explicit preference arg overrides module-level state', () => {
    setPreferredHandedness('Right');
    const results = makeResults([
      { landmarks: LEFT_HAND, handedness: 'Left', score: 0.9 },
      { landmarks: RIGHT_HAND, handedness: 'Right', score: 0.8 },
    ]);
    expect(filterHand(results, 'Left')).toBe(LEFT_HAND);
  });
});