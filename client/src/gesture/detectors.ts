import type { Landmark } from './types';

// MediaPipe landmark indices (finger tip + PIP joint per finger).
const INDEX_TIP = 8;
const INDEX_PIP = 6;
const MIDDLE_TIP = 12;
const MIDDLE_PIP = 10;
const RING_TIP = 16;
const RING_PIP = 14;
const PINKY_TIP = 20;
const PINKY_PIP = 18;

// In MediaPipe normalized coords y increases downward, so an extended (upward) finger has its tip
// above (smaller y than) its PIP joint, and a curled finger has its tip below it.
function extended(landmarks: Landmark[], tip: number, pip: number): boolean {
  return landmarks[tip].y < landmarks[pip].y;
}

function curled(landmarks: Landmark[], tip: number, pip: number): boolean {
  return landmarks[tip].y > landmarks[pip].y;
}

// Index finger up, the other three fingers curled → previous slide.
export function detectIndex(landmarks: Landmark[]): boolean {
  return (
    extended(landmarks, INDEX_TIP, INDEX_PIP) &&
    curled(landmarks, MIDDLE_TIP, MIDDLE_PIP) &&
    curled(landmarks, RING_TIP, RING_PIP) &&
    curled(landmarks, PINKY_TIP, PINKY_PIP)
  );
}

// Pinky finger up, the other three fingers curled → next slide.
export function detectPinky(landmarks: Landmark[]): boolean {
  return (
    extended(landmarks, PINKY_TIP, PINKY_PIP) &&
    curled(landmarks, INDEX_TIP, INDEX_PIP) &&
    curled(landmarks, MIDDLE_TIP, MIDDLE_PIP) &&
    curled(landmarks, RING_TIP, RING_PIP)
  );
}
