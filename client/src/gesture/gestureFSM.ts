import { updateSwipeWindow, detectSwipe, detectPinch, detectPoint, wristX } from './detectors';
import type { GestureEvent, GestureName, Landmark, SwipeWindow } from './types';
import type { SwipeThresholds } from './detectors';

type FSMState = 'idle' | 'cooldown';

export type CooldownDurations = {
  'swipe-left': number;
  'swipe-right': number;
  pinch: number;
  point: number;
};

const DEFAULT_COOLDOWNS: CooldownDurations = {
  'swipe-left': 800,
  'swipe-right': 800,
  pinch: 300,
  point: 300,
};

export type FSMConfig = {
  cooldowns?: Partial<CooldownDurations>;
  swipeThresholds?: Partial<SwipeThresholds>;
  pinchThreshold?: number;
};

export type FSMInternalState = {
  state: FSMState;
  cooldownUntil: number;
  swipeWindow: SwipeWindow;
};

export function createFSMState(): FSMInternalState {
  return { state: 'idle', cooldownUntil: 0, swipeWindow: [] };
}

// Pure: takes the current FSM state + landmarks + timestamp, returns the next FSM state
// and a gesture event if one fired. Priority: swipe > pinch > point.
export function stepFSM(
  current: FSMInternalState,
  landmarks: Landmark[],
  now: number,
  config: FSMConfig = {},
): { next: FSMInternalState; event: GestureEvent | null } {
  const cooldowns = { ...DEFAULT_COOLDOWNS, ...config.cooldowns };

  // Always update the swipe window so velocity history stays current even during cooldown.
  const swipeWindow = updateSwipeWindow(current.swipeWindow, wristX(landmarks), now);

  if (current.state === 'cooldown') {
    if (now < current.cooldownUntil) {
      return { next: { ...current, swipeWindow }, event: null };
    }
    // Cooldown expired — drop back to idle, but don't fire on this frame.
    return { next: { state: 'idle', cooldownUntil: 0, swipeWindow }, event: null };
  }

  // idle — run detectors in priority order
  let gesture: GestureName | null = null;

  const swipe = detectSwipe(swipeWindow, config.swipeThresholds);
  if (swipe) {
    gesture = swipe;
  } else if (detectPinch(landmarks, config.pinchThreshold)) {
    gesture = 'pinch';
  } else if (detectPoint(landmarks, config.pinchThreshold)) {
    gesture = 'point';
  }

  if (!gesture) {
    return { next: { state: 'idle', cooldownUntil: 0, swipeWindow }, event: null };
  }

  const event: GestureEvent = { type: gesture, timestamp: now };
  const next: FSMInternalState = {
    state: 'cooldown',
    cooldownUntil: now + cooldowns[gesture],
    swipeWindow: [], // clear window so the same motion can't re-fire after cooldown
  };

  return { next, event };
}