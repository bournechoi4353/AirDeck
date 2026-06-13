import type { Landmark, SwipeWindow } from './types';

// MediaPipe landmark indices
const THUMB_TIP = 4;
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;

// Webcam video is rendered mirrored (selfie view) but landmark coords are raw camera space.
// Flip X so that a rightward swipe in the user's view is positive dx in our math.
export function mirrorX(x: number): number {
  return 1.0 - x;
}

function dist(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Swipe (stateless over the window) ---

export type SwipeThresholds = {
  minVelocity: number;   // normalized units / ms
  minDisplacement: number; // normalized units
  maxAge: number;        // ms — evict entries older than this
};

const SWIPE_DEFAULTS: SwipeThresholds = {
  minVelocity: 0.0008,
  minDisplacement: 0.12,
  maxAge: 300,
};

// Appends the current wrist X (already mirror-flipped) and evicts stale entries.
// Returns the new window — call this before detectSwipe every frame.
export function updateSwipeWindow(
  window: SwipeWindow,
  x: number,
  t: number,
  maxAge = SWIPE_DEFAULTS.maxAge,
): SwipeWindow {
  return [...window, { x, t }].filter(e => t - e.t <= maxAge);
}

// Pure: reads the window and returns which swipe fired, or null.
export function detectSwipe(
  window: SwipeWindow,
  thresholds: Partial<SwipeThresholds> = {},
): 'swipe-left' | 'swipe-right' | null {
  const { minVelocity, minDisplacement } = { ...SWIPE_DEFAULTS, ...thresholds };
  if (window.length < 2) return null;

  const first = window[0];
  const last = window[window.length - 1];
  const dt = last.t - first.t;
  if (dt === 0) return null;

  const dx = last.x - first.x;
  const velocity = Math.abs(dx) / dt;
  const displacement = Math.abs(dx);

  if (velocity < minVelocity || displacement < minDisplacement) return null;
  // After mirror-flip: positive dx = user moved hand right → advance slide
  return dx > 0 ? 'swipe-right' : 'swipe-left';
}

// Convenience: returns the wrist X from landmarks, mirror-flipped, ready for updateSwipeWindow.
export function wristX(landmarks: Landmark[]): number {
  return mirrorX(landmarks[0].x);
}

// --- Pinch ---

export function detectPinch(landmarks: Landmark[], threshold = 0.08): boolean {
  return dist(landmarks[THUMB_TIP], landmarks[INDEX_TIP]) < threshold;
}

// --- Point ---

// Index finger extended, all other fingers curled, and no active pinch.
// In MediaPipe normalized coords y increases downward, so "above" means smaller y.
export function detectPoint(landmarks: Landmark[], pinchThreshold = 0.08): boolean {
  if (detectPinch(landmarks, pinchThreshold)) return false;

  const indexExtended = landmarks[INDEX_TIP].y < landmarks[INDEX_PIP].y;
  const middleCurled = landmarks[MIDDLE_TIP].y > landmarks[MIDDLE_PIP].y;
  const ringCurled = landmarks[RING_TIP].y > landmarks[RING_PIP].y;
  const pinkyCurled = landmarks[PINKY_TIP].y > landmarks[PINKY_PIP].y;

  return indexExtended && middleCurled && ringCurled && pinkyCurled;
}