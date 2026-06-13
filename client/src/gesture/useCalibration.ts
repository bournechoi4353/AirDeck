import { useEffect, useRef, useState, type RefObject } from 'react';
import { DrawingUtils, type HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { startCamera, stopCamera } from './camera';
import { createHandLandmarker } from './handLandmarker';
import { drawHands } from './overlay';
import { filterHand } from './handFilter';
import { mirrorX } from './detectors';
import {
  DEFAULT_CALIBRATION,
  deriveSwipeThresholds,
  derivePinchThreshold,
  saveCalibration,
  type CalibrationProfile,
  type SwipeSample,
} from './calibration';
import type { Landmark } from './types';
import type { TrackingStatus } from './useHandTracking';

export type CalibrationStep = 'handedness' | 'swipe' | 'pinch' | 'done';

// MediaPipe landmark indices used here.
const WRIST = 0;
const THUMB_TIP = 4;
const INDEX_TIP = 8;

// Collection tuning.
const SWIPE_WINDOW_MS = 300;
const MIN_SWIPE_DISPLACEMENT = 0.06; // ignore tiny jitter when sampling swipe magnitude
const MAX_PINCH_SAMPLE = 0.12; // only count frames where the hand is roughly pinched

export type UseCalibration = {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  status: TrackingStatus;
  error: string | null;
  step: CalibrationStep;
  samples: number;
  handDetected: boolean;
  advance: () => void;
};

// Drives the guided calibration: runs its own camera + landmarker loop, collects samples for the
// current step, and on `advance` finalizes that step. The pinch step's advance saves the profile
// and calls onComplete. Pure derivations live in calibration.ts; this hook only collects + wires.
export function useCalibration(onComplete: (profile: CalibrationProfile) => void): UseCalibration {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<TrackingStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CalibrationStep>('handedness');
  const [samples, setSamples] = useState(0);
  const [handDetected, setHandDetected] = useState(false);

  // Latest step/callback available to the once-started rAF loop without restarting the camera.
  const stepRef = useRef<CalibrationStep>('handedness');
  stepRef.current = step;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Per-step collection buffers (refs — never trigger renders).
  const handednessVotes = useRef<Record<string, number>>({});
  const swipeSamples = useRef<SwipeSample[]>([]);
  const pinchDistances = useRef<number[]>([]);
  const swipeWin = useRef<Array<{ x: number; t: number }>>([]);
  const handDetectedRef = useRef(false);
  const samplesRef = useRef(0);
  const lastEmit = useRef(0);
  const draft = useRef<CalibrationProfile>({
    ...DEFAULT_CALIBRATION,
    swipe: { ...DEFAULT_CALIBRATION.swipe },
  });

  function resetCounters(): void {
    handednessVotes.current = {};
    swipeSamples.current = [];
    pinchDistances.current = [];
    swipeWin.current = [];
    samplesRef.current = 0;
    setSamples(0);
  }

  function advance(): void {
    const current = stepRef.current;
    if (current === 'handedness') {
      const winner = Object.entries(handednessVotes.current).sort((a, b) => b[1] - a[1])[0]?.[0];
      draft.current.handedness = winner === 'Left' || winner === 'Right' ? winner : null;
      resetCounters();
      setStep('swipe');
    } else if (current === 'swipe') {
      draft.current.swipe = deriveSwipeThresholds(swipeSamples.current);
      resetCounters();
      setStep('pinch');
    } else if (current === 'pinch') {
      draft.current.pinchThreshold = derivePinchThreshold(pinchDistances.current);
      const profile: CalibrationProfile = {
        handedness: draft.current.handedness,
        swipe: { ...draft.current.swipe },
        pinchThreshold: draft.current.pinchThreshold,
      };
      saveCalibration(profile);
      setStep('done');
      onCompleteRef.current(profile);
    }
  }

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    function dist(a: Landmark, b: Landmark): number {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function bump(): void {
      samplesRef.current += 1;
      const t = performance.now();
      if (t - lastEmit.current > 200) {
        lastEmit.current = t;
        setSamples(samplesRef.current);
      }
    }

    function collect(result: HandLandmarkerResult, hand: Landmark[], now: number): void {
      const current = stepRef.current;
      if (current === 'handedness') {
        const label = result.handednesses[0]?.[0]?.categoryName;
        if (label) {
          handednessVotes.current[label] = (handednessVotes.current[label] ?? 0) + 1;
          bump();
        }
      } else if (current === 'swipe') {
        const x = mirrorX(hand[WRIST].x);
        swipeWin.current = [...swipeWin.current, { x, t: now }].filter(
          (e) => now - e.t <= SWIPE_WINDOW_MS,
        );
        if (swipeWin.current.length >= 2) {
          const first = swipeWin.current[0];
          const last = swipeWin.current[swipeWin.current.length - 1];
          const dt = last.t - first.t;
          if (dt > 0) {
            const dx = Math.abs(last.x - first.x);
            if (dx > MIN_SWIPE_DISPLACEMENT) {
              swipeSamples.current.push({ velocity: dx / dt, displacement: dx });
              bump();
            }
          }
        }
      } else if (current === 'pinch') {
        const d = dist(hand[THUMB_TIP], hand[INDEX_TIP]);
        if (d < MAX_PINCH_SAMPLE) {
          pinchDistances.current.push(d);
          bump();
        }
      }
    }

    async function init(): Promise<void> {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      try {
        landmarker = await createHandLandmarker();
        if (cancelled) return;
        stream = await startCamera(video);
        if (cancelled) return;

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2D canvas context unavailable');
        const drawingUtils = new DrawingUtils(ctx);
        setStatus('running');

        let lastVideoTime = -1;
        const loop = (): void => {
          if (cancelled || !landmarker) return;
          const now = performance.now();
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const result = landmarker.detectForVideo(video, now);
            drawHands(ctx, drawingUtils, result, canvas.width, canvas.height);
            const hand = filterHand({
              landmarks: result.landmarks,
              handedness: result.handednesses,
            });
            const present = hand !== null;
            if (present !== handDetectedRef.current) {
              handDetectedRef.current = present;
              setHandDetected(present);
            }
            if (hand) collect(result, hand, now);
          }
          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    }

    void init();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      stopCamera(stream);
      landmarker?.close();
    };
  }, []);

  return { videoRef, canvasRef, status, error, step, samples, handDetected, advance };
}
