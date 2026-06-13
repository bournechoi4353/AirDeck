import type { Landmark } from './types';

export type Handedness = 'Left' | 'Right';

type HandCategory = { categoryName: string; score: number };

export type HandLandmarkerResults = {
  landmarks: Landmark[][];
  handedness: HandCategory[][];
};

const STORAGE_KEY = 'airdeck:preferredHandedness';

let preferred: Handedness | null = null;

try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'Left' || stored === 'Right') preferred = stored;
} catch {
  // node / test / SSR environments have no localStorage
}

export function getPreferredHandedness(): Handedness | null {
  return preferred;
}

export function setPreferredHandedness(h: Handedness | null): void {
  preferred = h;
  try {
    if (h === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, h);
    }
  } catch {
    // no-op
  }
}

// Pure: returns the landmark array for the single best hand in a MediaPipe result.
// preference overrides the module-level setting when provided explicitly.
export function filterHand(
  results: HandLandmarkerResults,
  preference: Handedness | null = preferred,
): Landmark[] | null {
  const { landmarks, handedness } = results;
  if (landmarks.length === 0) return null;
  if (landmarks.length === 1) return landmarks[0];

  // Two+ hands detected — try the preferred one first
  if (preference !== null) {
    for (let i = 0; i < handedness.length; i++) {
      if (handedness[i][0]?.categoryName === preference) return landmarks[i];
    }
  }

  // No preference (or preferred hand not present) — highest confidence wins
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < handedness.length; i++) {
    const score = handedness[i][0]?.score ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return landmarks[bestIdx];
}