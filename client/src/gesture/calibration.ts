import { setPreferredHandedness, type Handedness } from './handFilter';
import type { FSMConfig } from './gestureFSM';

// A persisted, per-user tuning of the gesture engine. Maps onto FSMConfig (see toFSMConfig).
export type CalibrationProfile = {
  handedness: Handedness | null;
  swipe: { minVelocity: number; minDisplacement: number };
  pinchThreshold: number;
};

export const DEFAULT_CALIBRATION: CalibrationProfile = {
  handedness: null,
  swipe: { minVelocity: 0.0008, minDisplacement: 0.12 },
  pinchThreshold: 0.08,
};

const STORAGE_KEY = 'airdeck:calibration';

export function loadCalibration(): CalibrationProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CALIBRATION;
    const parsed = JSON.parse(raw) as Partial<CalibrationProfile>;
    return {
      handedness: parsed.handedness ?? null,
      swipe: {
        minVelocity: parsed.swipe?.minVelocity ?? DEFAULT_CALIBRATION.swipe.minVelocity,
        minDisplacement: parsed.swipe?.minDisplacement ?? DEFAULT_CALIBRATION.swipe.minDisplacement,
      },
      pinchThreshold: parsed.pinchThreshold ?? DEFAULT_CALIBRATION.pinchThreshold,
    };
  } catch {
    return DEFAULT_CALIBRATION;
  }
}

export function saveCalibration(profile: CalibrationProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // private mode / SSR / node — keep the in-memory profile only
  }
  // Keep the runtime hand selector in sync with the saved preference.
  setPreferredHandedness(profile.handedness);
}

export function clearCalibration(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  setPreferredHandedness(null);
}

export function toFSMConfig(profile: CalibrationProfile): FSMConfig {
  return {
    swipeThresholds: {
      minVelocity: profile.swipe.minVelocity,
      minDisplacement: profile.swipe.minDisplacement,
    },
    pinchThreshold: profile.pinchThreshold,
  };
}

// --- pure derivations (unit-tested) ---

const CLAMP = {
  minVelocity: { min: 0.0003, max: 0.004 },
  minDisplacement: { min: 0.05, max: 0.35 },
  pinchThreshold: { min: 0.03, max: 0.14 },
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function median(xs: number[]): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export type SwipeSample = { velocity: number; displacement: number };

// Set the swipe thresholds to a fraction of the user's typical (median) swipe, so a natural
// swipe clears them comfortably, then clamp to sane bounds. Falls back to defaults with no data.
export function deriveSwipeThresholds(
  samples: SwipeSample[],
  factor = 0.5,
): { minVelocity: number; minDisplacement: number } {
  const vMed = median(samples.map((s) => s.velocity));
  const dMed = median(samples.map((s) => s.displacement));
  if (vMed === null || dMed === null) return { ...DEFAULT_CALIBRATION.swipe };
  return {
    minVelocity: clamp(vMed * factor, CLAMP.minVelocity.min, CLAMP.minVelocity.max),
    minDisplacement: clamp(dMed * factor, CLAMP.minDisplacement.min, CLAMP.minDisplacement.max),
  };
}

// The user's pinched thumb-index distance (median of samples) times a slack factor, clamped, so
// a slightly looser pinch still triggers. Falls back to the default with no data.
export function derivePinchThreshold(distances: number[], factor = 1.4): number {
  const med = median(distances);
  if (med === null) return DEFAULT_CALIBRATION.pinchThreshold;
  return clamp(med * factor, CLAMP.pinchThreshold.min, CLAMP.pinchThreshold.max);
}
