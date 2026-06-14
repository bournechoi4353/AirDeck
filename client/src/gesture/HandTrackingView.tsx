import { useHandTracking, type UseHandTrackingOptions } from './useHandTracking';

// Mirror the preview so it reads like a mirror to the presenter. The overlay canvas gets the
// same transform, so the drawn landmarks stay aligned with the video.
const MIRROR = 'scaleX(-1)';

export function HandTrackingView({ options }: { options?: UseHandTrackingOptions }) {
  const { videoRef, canvasRef, status, error, fps, lastGesture } = useHandTracking(options);

  return (
    <div style={{ position: 'relative', width: 640, maxWidth: '100%' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: '100%', display: 'block', transform: MIRROR, border: '1px solid #0a0a0a', background: '#000' }}
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
      <span
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          padding: '2px 8px',
          background: 'rgba(0, 0, 0, 0.7)',
          color: '#fff',
          font: '12px ui-monospace, monospace',
        }}
      >
        {status === 'loading' && 'loading model + camera…'}
        {status === 'running' && `tracking · ${fps} fps`}
        {status === 'error' && `error: ${error}`}
      </span>
      {lastGesture && (
        <span
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            padding: '2px 8px',
            background: '#047857',
            color: '#fff',
            font: '12px ui-monospace, monospace',
          }}
        >
          ✋ {lastGesture.type}
        </span>
      )}
    </div>
  );
}
