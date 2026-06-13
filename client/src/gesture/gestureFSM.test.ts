import { describe, it, expect } from 'vitest';
import { createFSMState, stepFSM } from './gestureFSM';
import type { Landmark } from './types';

// Closed fist (no finger up) — fires no gesture.
const FIST: Partial<Record<number, Partial<Landmark>>> = {
  8: { y: 0.6 },
  6: { y: 0.4 },
  12: { y: 0.6 },
  10: { y: 0.4 },
  16: { y: 0.6 },
  14: { y: 0.4 },
  20: { y: 0.6 },
  18: { y: 0.4 },
};

function makeLandmarks(overrides: Partial<Record<number, Partial<Landmark>>> = {}): Landmark[] {
  return Array.from({ length: 21 }, (_, i) => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    ...FIST[i],
    ...overrides[i],
  }));
}

const indexUp = (): Landmark[] => makeLandmarks({ 8: { y: 0.2 } });
const pinkyUp = (): Landmark[] => makeLandmarks({ 20: { y: 0.2 } });

// Feed a pose across a list of timestamps; return the first event that fires.
function hold(landmarks: Landmark[], times: number[], holdMs?: number) {
  let state = createFSMState();
  for (const t of times) {
    const r = stepFSM(state, landmarks, t, holdMs == null ? {} : { holdMs });
    state = r.next;
    if (r.event) return { state, event: r.event };
  }
  return { state, event: null };
}

describe('createFSMState', () => {
  it('starts with no held poses', () => {
    const s = createFSMState();
    expect(s.index).toEqual({ since: null, fired: false });
    expect(s.pinky).toEqual({ since: null, fired: false });
  });
});

describe('hold-to-confirm', () => {
  it('does not fire before the pose is held long enough', () => {
    expect(hold(indexUp(), [0, 100, 200]).event).toBeNull(); // < 350ms default
  });

  it('fires index once the pose is held past the threshold', () => {
    expect(hold(indexUp(), [0, 100, 200, 300, 400]).event?.type).toBe('index');
  });

  it('fires pinky after holding', () => {
    expect(hold(pinkyUp(), [0, 200, 400]).event?.type).toBe('pinky');
  });

  it('a brief pose does not fire (no accidental slide change)', () => {
    let s = createFSMState();
    s = stepFSM(s, indexUp(), 0).next;
    s = stepFSM(s, indexUp(), 150).next;
    const r = stepFSM(s, makeLandmarks(), 200); // released before threshold
    expect(r.event).toBeNull();
    expect(r.next.index).toEqual({ since: null, fired: false });
  });

  it('does not re-fire while held; re-fires after release and re-hold', () => {
    const fired = hold(indexUp(), [0, 200, 400]);
    expect(fired.event?.type).toBe('index');

    // still holding → no re-fire
    let s = fired.state;
    s = stepFSM(s, indexUp(), 600).next;
    expect(stepFSM(s, indexUp(), 1000).event).toBeNull();

    // release, then re-hold → fires again
    s = stepFSM(s, makeLandmarks(), 1100).next;
    let again = null;
    for (const t of [1200, 1400, 1600]) {
      const r = stepFSM(s, indexUp(), t);
      s = r.next;
      if (r.event) {
        again = r.event;
        break;
      }
    }
    expect(again?.type).toBe('index');
  });

  it('respects a custom holdMs', () => {
    expect(hold(indexUp(), [0, 60, 120], 100).event?.type).toBe('index');
  });
});

describe('stepFSM — event timestamp', () => {
  it('stamps the event with the firing timestamp', () => {
    expect(hold(pinkyUp(), [0, 200, 400]).event?.timestamp).toBe(400);
  });
});
