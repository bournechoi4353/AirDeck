import { useEffect, useRef, useState, type RefObject } from 'react';
import { DrawingUtils, type HandLandmarker } from '@mediapipe/tasks-vision';
import { startCamera, stopCamera } from './camera';
import { createHandLandmarker } from './handLandmarker';
import { drawHands } from './overlay';
import { filterHand } from './handFilter';
import { createFSMState, stepFSM, type FSMConfig } from './gestureFSM';
import type { GestureEvent } from './types';

export type TrackingStatus = 'loading' | 'running' | 'error';

export type UseHandTrackingOptions = {
  // Calibration-derived thresholds/cooldowns for the gesture FSM.
  fsmConfig?: FSMConfig;
  // Called once per recognized gesture (debounced by the FSM cooldown).
  onGesture?: (event: GestureEvent) => void;
};

export type HandTracking = {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  status: TrackingStatus;
  error: string | null;
  fps: number;
  lastGesture: GestureEvent | null;
};

// Wires camera + HandLandmarker + a requestAnimationFrame loop, then runs the (committed, pure)
// hand selector and gesture FSM over each frame and emits GestureEvents. Per-frame landmark data
// is drawn straight to the canvas and never goes through React state, so the 30fps loop causes no
// re-render jank — only status/error/fps and the (rare) lastGesture touch React state.
//
// Inference runs on the main thread in VIDEO mode (GPU delegate), as in MediaPipe's own web
// samples. Phase 9 can move it to a Web Worker + OffscreenCanvas if profiling shows jank.
export function useHandTracking(options: UseHandTrackingOptions = {}): HandTracking {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<TrackingStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [lastGesture, setLastGesture] = useState<GestureEvent | null>(null);

  // Keep latest options in a ref so the once-started loop always reads current values
  // (new fsmConfig / onGesture) without restarting the camera.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;
    const fsm = { state: createFSMState() };

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
        let frames = 0;
        let fpsClock = performance.now();

        const loop = (): void => {
          if (cancelled || !landmarker) return;
          const now = performance.now();
          // Only run inference on a fresh video frame; reusing a frame would waste GPU time
          // and feed MediaPipe a non-increasing timestamp.
          if (video.readyState >= 2 && video.currentTime !== lastVideoTime) {
            lastVideoTime = video.currentTime;
            const result = landmarker.detectForVideo(video, now);
            drawHands(ctx, drawingUtils, result, canvas.width, canvas.height);

            const hand = filterHand({
              landmarks: result.landmarks,
              handedness: result.handednesses,
            });
            if (hand) {
              const { next, event } = stepFSM(fsm.state, hand, now, optionsRef.current.fsmConfig);
              fsm.state = next;
              if (event) {
                setLastGesture(event);
                optionsRef.current.onGesture?.(event);
              }
            }
            frames += 1;
          }
          if (now - fpsClock >= 500) {
            setFps(Math.round((frames * 1000) / (now - fpsClock)));
            frames = 0;
            fpsClock = now;
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

  return { videoRef, canvasRef, status, error, fps, lastGesture };
}
