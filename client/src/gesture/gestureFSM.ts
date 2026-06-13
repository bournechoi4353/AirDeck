import { detectIndex, detectPinky } from './detectors';
import type { GestureEvent, Landmark } from './types';

// A finger pose must be held continuously for this long (ms) before it fires. This is the main
// guard against accidental slide changes from fleeting poses during normal hand movement.
const HOLD_MS = 350;

export type FSMConfig = {
  holdMs?: number;
};

type PoseState = { since: number | null; fired: boolean };

export type FSMInternalState = {
  index: PoseState;
  pinky: PoseState;
};

export function createFSMState(): FSMInternalState {
  return { index: { since: null, fired: false }, pinky: { since: null, fired: false } };
}

// Advance one pose latch: start a timer when the pose appears, fire once it's been held past the
// threshold, and reset (re-arm) the moment the pose is released.
function advancePose(
  pose: PoseState,
  detected: boolean,
  now: number,
  holdMs: number,
): { next: PoseState; fire: boolean } {
  if (!detected) return { next: { since: null, fired: false }, fire: false };
  const since = pose.since ?? now;
  if (now - since >= holdMs && !pose.fired) {
    return { next: { since, fired: true }, fire: true };
  }
  return { next: { since, fired: pose.fired }, fire: false };
}

// Pure: index/pinky finger poses must be HELD for holdMs before firing once; releasing re-arms
// them. The two poses are mutually exclusive in practice; index wins if both somehow match.
export function stepFSM(
  current: FSMInternalState,
  landmarks: Landmark[],
  now: number,
  config: FSMConfig = {},
): { next: FSMInternalState; event: GestureEvent | null } {
  const holdMs = config.holdMs ?? HOLD_MS;

  const index = advancePose(current.index, detectIndex(landmarks), now, holdMs);
  const pinky = advancePose(current.pinky, detectPinky(landmarks), now, holdMs);
  const next: FSMInternalState = { index: index.next, pinky: pinky.next };

  if (index.fire) return { next, event: { type: 'index', timestamp: now } };
  if (pinky.fire) return { next, event: { type: 'pinky', timestamp: now } };
  return { next, event: null };
}
