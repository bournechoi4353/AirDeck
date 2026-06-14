import type { Slide } from './types';

// Renders just the slide — a rendered page image when present, otherwise a styled placeholder —
// filling its parent. No counter or buttons, so it works both inline and fullscreen.
export function SlideView({ slide }: { slide: Slide }) {
  if (slide.imageUrl) {
    return (
      <img
        src={slide.imageUrl}
        alt={slide.title}
        style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        padding: '6% 8%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: '2.5vmin',
        background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        color: '#f8fafc',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 'clamp(22px, 5vw, 56px)', lineHeight: 1.1 }}>{slide.title}</h2>
      <p style={{ margin: 0, fontSize: 'clamp(13px, 2.6vw, 28px)', lineHeight: 1.4, color: '#cbd5e1' }}>
        {slide.text}
      </p>
    </div>
  );
}
