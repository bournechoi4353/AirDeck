import { detectIndex, detectPinky } from './detectors';
import type { GestureEvent, Landmark } from './types';

// Short debounce after a pose fires, to absorb landmark jitter at the moment of engagement.
const GESTURE_COOLDOWN = 250;

export type FSMConfig = {
  cooldown?: number;
};

export type FSMInternalState = {
  cooldownUntil: number;
  indexActive: boolean; // latch — true while the index finger is up
  pinkyActive: boolean; // latch — true while the pinky finger is up
};

export function createFSMState(): FSMInternalState {
  return { cooldownUntil: 0, indexActive: false, pinkyActive: false };
}

// Pure: the index and pinky finger poses are EDGE-triggered — each fires once when the finger goes
// up, and won't fire again until it goes back down (so holding it up doesn't repeat). A short
// cooldown debounces landmark jitter. The two poses are mutually exclusive, so order doesn't matter.
export function stepFSM(
  current: FSMInternalState,
  landmarks: Landmark[],
  now: number,
  config: FSMConfig = {},
): { next: FSMInternalState; event: GestureEvent | null } {
  const cooldown = config.cooldown ?? GESTURE_COOLDOWN;

  const indexNow = detectIndex(landmarks);
  let indexActive = current.indexActive;
  let indexEdge = false;
  if (!indexActive && indexNow) {
    indexActive = true;
    indexEdge = true;
  } else if (indexActive && !indexNow) {
    indexActive = false;
  }

  const pinkyNow = detectPinky(landmarks);
  let pinkyActive = current.pinkyActive;
  let pinkyEdge = false;
  if (!pinkyActive && pinkyNow) {
    pinkyActive = true;
    pinkyEdge = true;
  } else if (pinkyActive && !pinkyNow) {
    pinkyActive = false;
  }

  // Latches always carry forward, even during cooldown (so an edge mid-cooldown is absorbed).
  const base: FSMInternalState = { cooldownUntil: current.cooldownUntil, indexActive, pinkyActive };

  if (now < current.cooldownUntil) {
    return { next: base, event: null };
  }
  if (indexEdge) {
    return {
      next: { ...base, cooldownUntil: now + cooldown },
      event: { type: 'index', timestamp: now },
    };
  }
  if (pinkyEdge) {
    return {
      next: { ...base, cooldownUntil: now + cooldown },
      event: { type: 'pinky', timestamp: now },
    };
  }

  return { next: base, event: null };
}
