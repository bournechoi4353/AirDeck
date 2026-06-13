import { useEffect, useRef, useState, type RefObject } from 'react';
import { DrawingUtils, type HandLandmarker, type HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { startCamera, stopCamera } from './camera';
import { createHandLandmarker } from './handLandmarker';
import { drawHands } from './overlay';
import { filterHand } from './handFilter';
import { saveCalibration, type CalibrationProfile } from './calibration';
import type { TrackingStatus } from './useHandTracking';

export type CalibrationStep = 'handedness' | 'done';

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

// Drives the (now single-step) calibration: runs its own camera + landmarker loop, votes on which
// hand the user holds up, and on `advance` saves the preferred handedness and calls onComplete.
export function useCalibration(onComplete: (profile: CalibrationProfile) => void): UseCalibration {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<TrackingStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CalibrationStep>('handedness');
  const [samples, setSamples] = useState(0);
  const [handDetected, setHandDetected] = useState(false);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handednessVotes = useRef<Record<string, number>>({});
  const handDetectedRef = useRef(false);
  const samplesRef = useRef(0);
  const lastEmit = useRef(0);

  function advance(): void {
    const winner = Object.entries(handednessVotes.current).sort((a, b) => b[1] - a[1])[0]?.[0];
    const profile: CalibrationProfile = {
      handedness: winner === 'Left' || winner === 'Right' ? winner : null,
    };
    saveCalibration(profile);
    setStep('done');
    onCompleteRef.current(profile);
  }

  useEffect(() => {
    let landmarker: HandLandmarker | null = null;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    function bump(): void {
      samplesRef.current += 1;
      const t = performance.now();
      if (t - lastEmit.current > 200) {
        lastEmit.current = t;
        setSamples(samplesRef.current);
      }
    }

    function collect(result: HandLandmarkerResult): void {
      const label = result.handednesses[0]?.[0]?.categoryName;
      if (label) {
        handednessVotes.current[label] = (handednessVotes.current[label] ?? 0) + 1;
        bump();
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
            if (hand) collect(result);
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
