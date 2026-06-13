import { setPreferredHandedness, type Handedness } from './handFilter';
import type { FSMConfig } from './gestureFSM';

// A persisted, per-user tuning of the gesture engine. With finger-pose gestures there are no
// per-frame thresholds to tune, so this is just the preferred presenting hand.
export type CalibrationProfile = {
  handedness: Handedness | null;
};

export const DEFAULT_CALIBRATION: CalibrationProfile = {
  handedness: null,
};

// v4: gestures changed to index/pinky finger poses; the profile no longer stores swipe thresholds.
const STORAGE_KEY = 'airdeck:calibration:v4';

export function loadCalibration(): CalibrationProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CALIBRATION;
    const parsed = JSON.parse(raw) as Partial<CalibrationProfile>;
    return { handedness: parsed.handedness ?? null };
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

// No per-frame thresholds to configure for finger poses (yet); kept as a seam for future tuning.
export function toFSMConfig(_profile: CalibrationProfile): FSMConfig {
  return {};
}
