import { describe, it, expect } from 'vitest';
import {
  mirrorX,
  updateSwipeWindow,
  detectSwipe,
  wristX,
  detectPinch,
  detectPoint,
} from './detectors';
import type { Landmark, SwipeWindow } from './types';

// Builds a flat 21-landmark array. All landmarks default to (0.5, 0.5, 0) unless overridden.
function makeLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  return Array.from({ length: 21 }, (_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    ...overrides[i],
  }));
}

// Builds a swipe window from an array of [x, t] pairs.
function makeWindow(entries: [number, number][]): SwipeWindow {
  return entries.map(([x, t]) => ({ x, t }));
}

// --- mirrorX ---

describe('mirrorX', () => {
  it('flips 0 to 1 and 1 to 0', () => {
    expect(mirrorX(0)).toBe(1);
    expect(mirrorX(1)).toBe(0);
  });

  it('flips 0.3 to 0.7', () => {
    expect(mirrorX(0.3)).toBeCloseTo(0.7);
  });
});

// --- updateSwipeWindow ---

describe('updateSwipeWindow', () => {
  it('appends an entry to an empty window', () => {
    const result = updateSwipeWindow([], 0.5, 100);
    expect(result).toEqual([{ x: 0.5, t: 100 }]);
  });

  it('evicts entries older than maxAge', () => {
    const window = makeWindow([[0.3, 0], [0.4, 100], [0.5, 200]]);
    // now = 350, maxAge = 300 → entry at t=0 is 350ms old, should be evicted
    const result = updateSwipeWindow(window, 0.6, 350, 300);
    expect(result.every(e => 350 - e.t <= 300)).toBe(true);
    expect(result.some(e => e.t === 0)).toBe(false);
  });

  it('keeps all entries within maxAge', () => {
    const window = makeWindow([[0.4, 100], [0.5, 200]]);
    const result = updateSwipeWindow(window, 0.6, 350, 300);
    expect(result.length).toBe(3);
  });
});

// --- detectSwipe ---

describe('detectSwipe', () => {
  it('returns null for an empty window', () => {
    expect(detectSwipe([])).toBeNull();
  });

  it('returns null for a single entry', () => {
    expect(detectSwipe(makeWindow([[0.5, 0]]))).toBeNull();
  });

  it('detects swipe-right on fast rightward motion', () => {
    // dx = 0.3 over 200ms → velocity = 0.0015 (above default 0.0008)
    const window = makeWindow([[0.2, 0], [0.5, 200]]);
    expect(detectSwipe(window)).toBe('swipe-right');
  });

  it('detects swipe-left on fast leftward motion', () => {
    const window = makeWindow([[0.7, 0], [0.4, 200]]);
    expect(detectSwipe(window)).toBe('swipe-left');
  });

  it('returns null when velocity is too low (slow drift)', () => {
    // dx = 0.15 over 500ms → velocity = 0.0003 (below 0.0008)
    const window = makeWindow([[0.3, 0], [0.45, 500]]);
    expect(detectSwipe(window)).toBeNull();
  });

  it('returns null when displacement is too small even at high velocity', () => {
    // dx = 0.05 over 50ms → velocity = 0.001 (above threshold) but displacement < 0.12
    const window = makeWindow([[0.4, 0], [0.45, 50]]);
    expect(detectSwipe(window)).toBeNull();
  });

  it('respects custom thresholds', () => {
    // Would fail default thresholds but passes with lower ones
    const window = makeWindow([[0.4, 0], [0.5, 500]]);
    expect(detectSwipe(window, { minVelocity: 0.0001, minDisplacement: 0.05 })).toBe('swipe-right');
  });
});

// --- wristX ---

describe('wristX', () => {
  it('returns mirror-flipped wrist x', () => {
    const landmarks = makeLandmarks({ 0: { x: 0.3 } });
    expect(wristX(landmarks)).toBeCloseTo(0.7);
  });
});

// --- detectPinch ---

describe('detectPinch', () => {
  it('returns true when thumb tip and index tip are close', () => {
    // Both at the same position → distance 0
    const landmarks = makeLandmarks({
      4: { x: 0.5, y: 0.5 },
      8: { x: 0.5, y: 0.5 },
    });
    expect(detectPinch(landmarks)).toBe(true);
  });

  it('returns false when thumb tip and index tip are far apart', () => {
    const landmarks = makeLandmarks({
      4: { x: 0.2, y: 0.5 },
      8: { x: 0.8, y: 0.5 },
    });
    expect(detectPinch(landmarks)).toBe(false);
  });

  it('respects a custom threshold', () => {
    // distance ≈ 0.1
    const landmarks = makeLandmarks({
      4: { x: 0.4, y: 0.5 },
      8: { x: 0.5, y: 0.5 },
    });
    expect(detectPinch(landmarks, 0.05)).toBe(false);
    expect(detectPinch(landmarks, 0.15)).toBe(true);
  });
});

// --- detectPoint ---

describe('detectPoint', () => {
  // Helper: landmark positions for a clear pointing hand.
  // Index tip above its PIP (tip.y < pip.y); all others curled (tip.y > pip.y).
  function pointingHand(): Partial<Record<number, Partial<Landmark>>> {
    return {
      4:  { x: 0.5, y: 0.5 }, // thumb tip — far from index tip (no pinch)
      8:  { x: 0.3, y: 0.2 }, // index tip — high up (extended)
      6:  { x: 0.3, y: 0.4 }, // index PIP — below tip ✓
      12: { x: 0.5, y: 0.7 }, // middle tip — low (curled)
      10: { x: 0.5, y: 0.5 }, // middle PIP — above tip ✓
      16: { x: 0.5, y: 0.7 }, // ring tip — low (curled)
      14: { x: 0.5, y: 0.5 }, // ring PIP
      20: { x: 0.5, y: 0.7 }, // pinky tip — low (curled)
      18: { x: 0.5, y: 0.5 }, // pinky PIP
    };
  }

  it('returns true for a clear pointing gesture', () => {
    expect(detectPoint(makeLandmarks(pointingHand()))).toBe(true);
  });

  it('returns false when middle finger is also extended', () => {
    const overrides = {
      ...pointingHand(),
      12: { x: 0.5, y: 0.2 }, // middle tip now above its PIP
      10: { x: 0.5, y: 0.4 },
    };
    expect(detectPoint(makeLandmarks(overrides))).toBe(false);
  });

  it('returns false when pinching (overrides point check)', () => {
    const overrides = {
      ...pointingHand(),
      4: { x: 0.3, y: 0.2 }, // thumb tip on top of index tip → pinch
      8: { x: 0.3, y: 0.2 },
    };
    expect(detectPoint(makeLandmarks(overrides))).toBe(false);
  });

  it('returns false when index finger is curled', () => {
    const overrides = {
      ...pointingHand(),
      8: { x: 0.3, y: 0.6 }, // index tip below its PIP
      6: { x: 0.3, y: 0.4 },
    };
    expect(detectPoint(makeLandmarks(overrides))).toBe(false);
  });
});