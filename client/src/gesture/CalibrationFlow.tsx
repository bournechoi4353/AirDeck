import { useCalibration, type CalibrationStep } from './useCalibration';
import type { CalibrationProfile } from './calibration';

const MIRROR = 'scaleX(-1)';

const INSTRUCTIONS: Record<CalibrationStep, string> = {
  handedness: 'Hold up the hand you’ll present with and keep it in view.',
  done: 'Calibration complete.',
};

export function CalibrationFlow({
  onComplete,
  onCancel,
}: {
  onComplete: (profile: CalibrationProfile) => void;
  onCancel: () => void;
}) {
  const { videoRef, canvasRef, status, error, step, samples, handDetected, advance } =
    useCalibration(onComplete);

  return (
    <div>
      <div style={{ position: 'relative', width: 640, maxWidth: '100%' }}>
        <video
          ref={videoRef}
          playsInline
          muted
          style={{ width: '100%', display: 'block', transform: MIRROR, borderRadius: 8, background: '#000' }}
        />
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            transform: MIRROR,
            pointerEvents: 'none',
          }}
        />
      </div>

      <div style={{ marginTop: 12 }}>
        <p style={{ fontWeight: 600, textTransform: 'capitalize', margin: '0 0 4px' }}>
          Step: {step}
        </p>
        <p style={{ margin: '0 0 8px' }}>{INSTRUCTIONS[step]}</p>

        {status === 'loading' && <p style={{ color: '#555' }}>loading camera…</p>}
        {status === 'error' && <p style={{ color: 'crimson' }}>error: {error}</p>}
        {status === 'running' && step !== 'done' && (
          <p style={{ fontSize: 13, color: handDetected ? '#0a7' : '#a40' }}>
            {handDetected ? `hand detected · ${samples} samples` : 'no hand detected — show your hand'}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {step !== 'done' && (
            <button onClick={advance} disabled={status !== 'running'}>
              Finish
            </button>
          )}
          <button onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
