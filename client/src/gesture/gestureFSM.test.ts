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

describe('createFSMState', () => {
  it('starts idle with no latched fingers', () => {
    const s = createFSMState();
    expect(s.cooldownUntil).toBe(0);
    expect(s.indexActive).toBe(false);
    expect(s.pinkyActive).toBe(false);
  });
});

describe('stepFSM — basic detection', () => {
  it('returns null for a closed fist', () => {
    expect(stepFSM(createFSMState(), makeLandmarks(), 0).event).toBeNull();
  });

  it('emits an index event when the index finger goes up', () => {
    const { event, next } = stepFSM(createFSMState(), indexUp(), 1000);
    expect(event?.type).toBe('index');
    expect(next.indexActive).toBe(true);
  });

  it('emits a pinky event when the pinky finger goes up', () => {
    const { event, next } = stepFSM(createFSMState(), pinkyUp(), 1000);
    expect(event?.type).toBe('pinky');
    expect(next.pinkyActive).toBe(true);
  });
});

describe('finger poses are edge-triggered', () => {
  it('fires once on raise and again only after lowering', () => {
    let s = createFSMState();
    let r = stepFSM(s, indexUp(), 1000);
    s = r.next;
    expect(r.event?.type).toBe('index');

    r = stepFSM(s, indexUp(), 1100); // still in the short cooldown
    s = r.next;
    expect(r.event).toBeNull();

    r = stepFSM(s, indexUp(), 2000); // past cooldown, but finger still held up
    s = r.next;
    expect(r.event).toBeNull();

    r = stepFSM(s, makeLandmarks(), 2300); // lower the finger
    s = r.next;
    expect(r.event).toBeNull();
    expect(s.indexActive).toBe(false);

    r = stepFSM(s, indexUp(), 2600); // raise again
    expect(r.event?.type).toBe('index');
  });
});

describe('stepFSM — event timestamp', () => {
  it('stamps the event with the current timestamp', () => {
    expect(stepFSM(createFSMState(), pinkyUp(), 9999).event?.timestamp).toBe(9999);
  });
});
