import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

// Pin the WASM runtime to the installed @mediapipe/tasks-vision version (client/package.json)
// so the WASM matches the JS API. Phase 9: vendor these assets locally to drop the CDN dependency.
const TASKS_VISION_VERSION = '0.10.35';
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// One hand is enough for the presenter; fewer hands = faster inference.
export const MAX_HANDS = 1;

export async function createHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: HAND_MODEL_URL, delegate: 'GPU' },
    runningMode: 'VIDEO',
    numHands: MAX_HANDS,
  });
}
