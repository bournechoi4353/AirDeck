import { describe, it, expect } from 'vitest';
import { createFSMState, stepFSM } from './gestureFSM';
import type { Landmark } from './types';

// Builds a 21-landmark array representing a neutral closed fist: all tips below their PIPs
// (curled), thumb tip far from index tip (no pinch). Safe default — fires no gesture.
const NEUTRAL: Partial<Record<number, Partial<Landmark>>> = {
  0:  { x: 0.5,  y: 0.8 }, // wrist
  4:  { x: 0.2,  y: 0.8 }, // thumb tip — far from index tip
  8:  { x: 0.6,  y: 0.7 }, // index tip — below PIP (curled)
  6:  { x: 0.55, y: 0.5 }, // index PIP
  12: { x: 0.5,  y: 0.7 }, // middle tip — curled
  10: { x: 0.5,  y: 0.5 }, // middle PIP
  16: { x: 0.45, y: 0.7 }, // ring tip — curled
  14: { x: 0.45, y: 0.5 }, // ring PIP
  20: { x: 0.4,  y: 0.7 }, // pinky tip — curled
  18: { x: 0.4,  y: 0.5 }, // pinky PIP
};

function makeLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  return Array.from({ length: 21 }, (_, i) => ({
    x: 0.5, y: 0.5, z: 0,
    ...NEUTRAL[i],
    ...overrides[i],
  }));
}

// Landmarks that produce a clear point gesture
function pointingLandmarks(): Landmark[] {
  return makeLandmarks({
    4:  { x: 0.5, y: 0.5 },
    8:  { x: 0.3, y: 0.2 },
    6:  { x: 0.3, y: 0.4 },
    12: { x: 0.5, y: 0.7 },
    10: { x: 0.5, y: 0.5 },
    16: { x: 0.5, y: 0.7 },
    14: { x: 0.5, y: 0.5 },
    20: { x: 0.5, y: 0.7 },
    18: { x: 0.5, y: 0.5 },
  });
}

// Landmarks that produce a clear pinch
function pinchLandmarks(): Landmark[] {
  return makeLandmarks({ 4: { x: 0.5, y: 0.5 }, 8: { x: 0.5, y: 0.5 } });
}

// Feeds the FSM a wrist X sequence over 5 frames and returns the first gesture event that fires.
// User swipes right → mirrored view moves right → raw camera X decreases (mirror inverts).
function runSwipe(direction: 'right' | 'left') {
  let state = createFSMState();
  const startX = direction === 'right' ? 0.8 : 0.2;
  const endX   = direction === 'right' ? 0.2 : 0.8;
  const steps = 5;

  for (let i = 0; i < steps; i++) {
    const x = startX + (endX - startX) * (i / (steps - 1));
    const t = i * (150 / (steps - 1));
    const frame = makeLandmarks({ 0: { x, y: 0.5 } });
    const result = stepFSM(state, frame, t);
    state = result.next;
    if (result.event) return result;
  }
  return { next: state, event: null };
}

describe('createFSMState', () => {
  it('starts in idle with empty window', () => {
    const s = createFSMState();
    expect(s.state).toBe('idle');
    expect(s.swipeWindow).toEqual([]);
    expect(s.cooldownUntil).toBe(0);
  });
});

describe('stepFSM — idle state', () => {
  it('returns null event when no gesture is present', () => {
    const { event } = stepFSM(createFSMState(), makeLandmarks(), 0);
    expect(event).toBeNull();
  });

  it('emits a pinch event when pinch is detected', () => {
    const { event, next } = stepFSM(createFSMState(), pinchLandmarks(), 1000);
    expect(event?.type).toBe('pinch');
    expect(next.state).toBe('cooldown');
  });

  it('emits a point event when pointing', () => {
    const { event, next } = stepFSM(createFSMState(), pointingLandmarks(), 1000);
    expect(event?.type).toBe('point');
    expect(next.state).toBe('cooldown');
  });

  it('emits swipe-right on fast rightward motion', () => {
    const { event } = runSwipe('right');
    expect(event?.type).toBe('swipe-right');
  });

  it('emits swipe-left on fast leftward motion', () => {
    const { event } = runSwipe('left');
    expect(event?.type).toBe('swipe-left');
  });
});

describe('stepFSM — fires exactly once', () => {
  it('does not re-fire during cooldown', () => {
    const state0 = createFSMState();
    const { next: state1, event: e1 } = stepFSM(state0, pinchLandmarks(), 1000);
    expect(e1?.type).toBe('pinch');

    // Same pinch gesture one frame later — still in cooldown
    const { next: state2, event: e2 } = stepFSM(state1, pinchLandmarks(), 1016);
    expect(e2).toBeNull();
    expect(state2.state).toBe('cooldown');

    // Still in cooldown 200ms later (default pinch cooldown is 300ms)
    const { event: e3 } = stepFSM(state2, pinchLandmarks(), 1200);
    expect(e3).toBeNull();
  });

  it('can fire again after cooldown expires', () => {
    const state0 = createFSMState();
    const { next: state1 } = stepFSM(state0, pinchLandmarks(), 1000);
    // Jump past the 300ms pinch cooldown
    const { next: state2 } = stepFSM(state1, makeLandmarks(), 1400);
    expect(state2.state).toBe('idle');
    // Now pinch again
    const { event } = stepFSM(state2, pinchLandmarks(), 1401);
    expect(event?.type).toBe('pinch');
  });
});

describe('stepFSM — detector priority (swipe > pinch > point)', () => {
  it('prefers swipe over pinch when both would fire', () => {
    // Build swipe history (no pinch) using a high minDisplacement so it doesn't fire early.
    // Final frame: wrist crosses threshold AND pinch is active — swipe must win.
    const config = { swipeThresholds: { minDisplacement: 0.55 } };
    let state = createFSMState();
    for (let i = 0; i < 4; i++) {
      // raw camera x 0.9→0.3 (mirrored: 0.1→0.7), displacement stays below 0.55 until final
      const x = 0.9 - i * 0.15;
      const frame = makeLandmarks({ 0: { x, y: 0.5 } }); // no pinch
      const result = stepFSM(state, frame, i * 50, config);
      state = result.next;
    }
    // Final frame: wrist at raw 0.1 (mirrored 0.9, total mirrored dx ≈ 0.8 > 0.55) AND pinch
    const finalFrame = makeLandmarks({ 0: { x: 0.1, y: 0.5 }, 4: { x: 0.5, y: 0.5 }, 8: { x: 0.5, y: 0.5 } });
    const { event } = stepFSM(state, finalFrame, 200, config);
    expect(event?.type).toMatch(/swipe/);
  });

  it('prefers pinch over point when both would fire', () => {
    // Pointing hand but with thumb and index touching (pinch overrides point)
    const overrides: Partial<Record<number, Partial<Landmark>>> = {
      4:  { x: 0.3, y: 0.2 }, // thumb on top of index tip → pinch
      8:  { x: 0.3, y: 0.2 }, // index tip (same position)
      6:  { x: 0.3, y: 0.4 }, // index PIP — below tip, so index is "extended"
      12: { x: 0.5, y: 0.7 },
      10: { x: 0.5, y: 0.5 },
      16: { x: 0.5, y: 0.7 },
      14: { x: 0.5, y: 0.5 },
      20: { x: 0.5, y: 0.7 },
      18: { x: 0.5, y: 0.5 },
    };
    const { event } = stepFSM(createFSMState(), makeLandmarks(overrides), 1000);
    expect(event?.type).toBe('pinch');
  });
});

describe('stepFSM — cooldown duration', () => {
  it('uses custom cooldown durations from config', () => {
    const state0 = createFSMState();
    const { next: state1, event: e1 } = stepFSM(state0, pinchLandmarks(), 1000, {
      cooldowns: { pinch: 1000 },
    });
    expect(e1?.type).toBe('pinch');
    // 500ms later — would be idle with default 300ms cooldown, but custom is 1000ms
    const { next: state2 } = stepFSM(state1, makeLandmarks(), 1500);
    expect(state2.state).toBe('cooldown');
    // 1001ms later — now expired
    const { next: state3 } = stepFSM(state1, makeLandmarks(), 2001);
    expect(state3.state).toBe('idle');
  });
});

describe('stepFSM — event timestamp', () => {
  it('stamps the event with the current timestamp', () => {
    const { event } = stepFSM(createFSMState(), pinchLandmarks(), 9999);
    expect(event?.timestamp).toBe(9999);
  });
});