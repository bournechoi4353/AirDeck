import { useEffect, useMemo, useState } from 'react';
import {
  CalibrationFlow,
  HandTrackingView,
  clearCalibration,
  loadCalibration,
  toFSMConfig,
  type CalibrationProfile,
  type GestureEvent,
} from '../gesture';
import {
  DeckViewer,
  GoogleConnect,
  SAMPLE_DECK,
  useDeck,
  useGoogleDeck,
  type SlideChangeEvent,
} from '../slides';

type Health = { status: string; service: string; time: string };
type Mode = 'present' | 'calibrate';

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('present');
  const [profile, setProfile] = useState<CalibrationProfile>(() => loadCalibration());
  const [log, setLog] = useState<GestureEvent[]>([]);
  const [slideEvent, setSlideEvent] = useState<SlideChangeEvent | null>(null);

  const fsmConfig = useMemo(() => toFSMConfig(profile), [profile]);

  const google = useGoogleDeck();
  const activeDeck = google.deck ?? SAMPLE_DECK;
  const deck = useDeck(activeDeck, { onSlideChange: setSlideEvent });

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data: Health) => setHealth(data))
      .catch((e: unknown) => setHealthError(String(e)));
  }, []);

  const handleGesture = (event: GestureEvent) => {
    setLog((prev) => [event, ...prev].slice(0, 8));
    deck.handleGesture(event);
  };

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', lineHeight: 1.5, maxWidth: 820 }}>
      <h1>AirDeck</h1>
      <p>Webcam-only presentation copilot. Phase 4 — Google Slides + gesture-driven deck.</p>

      {mode === 'calibrate' ? (
        <section>
          <h2>Calibrate</h2>
          <CalibrationFlow
            onComplete={(p) => {
              setProfile(p);
              setMode('present');
            }}
            onCancel={() => setMode('present')}
          />
        </section>
      ) : (
        <>
          <section>
            <h2>Present</h2>
            <GoogleConnect google={google} />
            <DeckViewer
              title={activeDeck.title}
              current={deck.current}
              total={deck.total}
              slide={deck.slide}
              onPrev={deck.prev}
              onNext={deck.next}
            />
            <p style={{ fontSize: 13, color: '#555', marginTop: 8 }}>
              Speaker notes (placeholder until Phase 5):{' '}
              <em>{deck.slide.notes ?? deck.slide.text}</em>
            </p>
            {slideEvent && (
              <p style={{ fontSize: 12, color: '#777', margin: 0 }}>
                slidechange → #{slideEvent.index + 1} “{slideEvent.slide.title}” (content ready for Claude)
              </p>
            )}
          </section>

          <section>
            <h2>Camera &amp; gestures</h2>
            <div style={{ width: 320 }}>
              <HandTrackingView options={{ fsmConfig, onGesture: handleGesture }} />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => setMode('calibrate')}>Calibrate gestures</button>
              <button
                onClick={() => {
                  clearCalibration();
                  setProfile(loadCalibration());
                }}
              >
                Reset calibration
              </button>
              <span style={{ fontSize: 12, color: '#555' }}>
                hand: {profile.handedness ?? 'auto'} · index finger → prev · pinky finger → next
              </span>
            </div>

            <div style={{ marginTop: 12 }}>
              <strong>Gesture log</strong>
              {log.length === 0 ? (
                <p style={{ fontSize: 13, color: '#555' }}>raise your index finger to go back, pinky to go forward…</p>
              ) : (
                <ul style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13, paddingLeft: 18 }}>
                  {log.map((g, i) => (
                    <li key={`${g.timestamp}-${i}`}>
                      {g.type} @ {Math.round(g.timestamp)}ms
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      <section>
        <h2>Backend status</h2>
        {health && (
          <p style={{ color: 'green' }}>
            ✓ {health.service}: {health.status} ({health.time})
          </p>
        )}
        {healthError && <p style={{ color: 'crimson' }}>✗ cannot reach backend: {healthError}</p>}
        {!health && !healthError && <p>checking…</p>}
      </section>
    </main>
  );
}
