import type { Slide } from './types';

// Renders the current slide (an image when present, otherwise a styled placeholder) plus
// manual nav controls. Gestures drive the same next/prev/zoom handlers from App.
export function DeckViewer({
  title,
  current,
  total,
  slide,
  zoom,
  onPrev,
  onNext,
  onToggleZoom,
}: {
  title: string;
  current: number;
  total: number;
  slide: Slide;
  zoom: number;
  onPrev: () => void;
  onNext: () => void;
  onToggleZoom: () => void;
}) {
  return (
    <div>
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 720,
          aspectRatio: '16 / 9',
          overflow: 'hidden',
          borderRadius: 10,
          border: '1px solid #ddd',
          background: '#fff',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'transform 120ms ease',
          }}
        >
          {slide.imageUrl ? (
            <img
              src={slide.imageUrl}
              alt={slide.title}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                boxSizing: 'border-box',
                padding: '8% 9%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                gap: 16,
                background: 'linear-gradient(135deg, #0f172a, #1e293b)',
                color: '#f8fafc',
              }}
            >
              <h3 style={{ margin: 0, fontSize: 'clamp(20px, 4vw, 40px)' }}>{slide.title}</h3>
              <p style={{ margin: 0, fontSize: 'clamp(13px, 2.2vw, 22px)', lineHeight: 1.4, color: '#cbd5e1' }}>
                {slide.text}
              </p>
            </div>
          )}
        </div>

        <span
          style={{
            position: 'absolute',
            bottom: 8,
            right: 10,
            padding: '2px 8px',
            borderRadius: 6,
            background: 'rgba(0, 0, 0, 0.55)',
            color: '#fff',
            font: '12px system-ui, sans-serif',
          }}
        >
          {current + 1} / {total}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={onPrev} disabled={current === 0}>
          ◀ Prev
        </button>
        <button onClick={onNext} disabled={current === total - 1}>
          Next ▶
        </button>
        <button onClick={onToggleZoom}>{zoom > 1 ? 'Zoom out' : 'Zoom in'}</button>
        <span style={{ fontSize: 12, color: '#555' }}>{title}</span>
      </div>
    </div>
  );
}
