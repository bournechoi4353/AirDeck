import { useEffect, useMemo, useRef, useState } from 'react';
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
  GoogleConnect,
  SAMPLE_DECK,
  SlideView,
  connectCueStream,
  useDeck,
  useGoogleDeck,
  type SlideChangeEvent,
} from '../slides';
import { VoicePicker, useTTS } from '../audio';
import { apiUrl } from '../api';
import { Landing } from './Landing';

type Health = { status: string; service: string; time: string };
type Mode = 'present' | 'calibrate';
type View = 'landing' | 'app';

export function App() {
  const [view, setView] = useState<View>('landing');
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('present');
  const [profile, setProfile] = useState<CalibrationProfile>(() => loadCalibration());
  const [log, setLog] = useState<GestureEvent[]>([]);
  const [slideEvent, setSlideEvent] = useState<SlideChangeEvent | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const fsmConfig = useMemo(() => toFSMConfig(profile), [profile]);

  const google = useGoogleDeck();
  const activeDeck = google.deck ?? SAMPLE_DECK;
  const deck = useDeck(activeDeck, { onSlideChange: setSlideEvent });

  const { speak, isSpeaking, player } = useTTS();
  const activeDeckRef = useRef(activeDeck);
  activeDeckRef.current = activeDeck;
  const stageRef = useRef<HTMLDivElement>(null);

  // Only generate/speak cues while actually presenting, and skip the slide that's already on screen
  // when present mode opens, otherwise the deck's mount-time slide-change event would make the voice
  // speak the moment the site (still on the landing page) loads.
  const presenting = view === 'app' && mode === 'present';
  const armedRef = useRef(false);

  useEffect(() => {
    if (!presenting) {
      armedRef.current = false;
      return;
    }
    // First run after entering present mode just arms the effect for the current slide.
    if (!armedRef.current) {
      armedRef.current = true;
      return;
    }
    if (!slideEvent) return;
    let cueText = '';
    const cleanup = connectCueStream(
      activeDeckRef.current.id,
      slideEvent.index,
      slideEvent.slide,
      activeDeckRef.current,
      (token) => {
        cueText += token;
      },
      () => {
        if (cueText.trim()) speak(cueText);
      },
    );
    return cleanup;
  }, [slideEvent, speak, presenting]);

  useEffect(() => {
    fetch(apiUrl('/api/health'))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Health) => setHealth(data))
      .catch((e: unknown) => setHealthError(String(e)));
  }, []);

  // Track fullscreen so the stage can restyle itself; Esc / browser exit updates this too.
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const startSlideshow = () => {
    void stageRef.current?.requestFullscreen();
  };
  const exitSlideshow = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
  };

  const handleGesture = (event: GestureEvent) => {
    setLog((prev) => [event, ...prev].slice(0, 8));
    deck.handleGesture(event);
  };

  if (view === 'landing') {
    return (
      <div className="app-shell">
        <Landing onLaunch={() => setView('app')} />
      </div>
    );
  }

  const backendStatus = health ? 'ok' : healthError ? 'bad' : '';
  const backendLabel = health
    ? 'backend online'
    : healthError
      ? 'backend offline'
      : 'checking backend…';

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">AirDeck</div>
        <div className="right">
          <span className={`status-dot ${backendStatus}`}>
            <i />
            {backendLabel}
          </span>
          <button onClick={() => setView('landing')}>Home</button>
        </div>
      </header>

      {mode === 'calibrate' ? (
        <div className="workspace" style={{ gridTemplateColumns: '1fr' }}>
          <section className="card">
            <h2 className="card-title">
              Calibrate gestures
              <span className="tag">setup</span>
            </h2>
            <CalibrationFlow
              onComplete={(p) => {
                setProfile(p);
                setMode('present');
              }}
              onCancel={() => setMode('present')}
            />
          </section>
        </div>
      ) : (
        <div className="workspace">
          <div className="col">
            <section className="card">
              <h2 className="card-title">
                Present
                <span className="tag">live deck</span>
              </h2>
              <GoogleConnect google={google} />

              {/* Slideshow stage — the SAME element goes fullscreen, so the camera loop keeps running. */}
              <div
                ref={stageRef}
                style={
                  isFullscreen
                    ? { position: 'relative', width: '100vw', height: '100vh', background: '#000', overflow: 'hidden' }
                    : {
                        position: 'relative',
                        width: '100%',
                        aspectRatio: '16 / 9',
                        background: '#000',
                        overflow: 'hidden',
                        borderRadius: 8,
                      }
                }
              >
                <div style={{ position: 'absolute', inset: 0 }}>
                  <SlideView slide={deck.slide} />
                </div>

                {/* Camera PiP (setup only). Hidden during the slideshow with opacity 0 rather than
                    display:none, so the video keeps decoding and gestures still fire. */}
                <div
                  style={{
                    position: 'absolute',
                    right: 10,
                    bottom: 10,
                    width: 150,
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.55)',
                    opacity: isFullscreen ? 0 : 0.92,
                    pointerEvents: isFullscreen ? 'none' : 'auto',
                  }}
                >
                  <HandTrackingView options={{ fsmConfig, onGesture: handleGesture }} />
                </div>

                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 10,
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(0, 0, 0, 0.6)',
                    color: '#fff',
                    font: '12px ui-monospace, monospace',
                  }}
                >
                  {deck.current + 1} / {deck.total}
                </span>

                {isFullscreen && (
                  <button
                    onClick={exitSlideshow}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      padding: '6px 12px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Exit ✕
                  </button>
                )}
              </div>

              <div className="toolbar" style={{ marginTop: 14 }}>
                <button onClick={deck.prev} disabled={deck.current === 0}>
                  ◀ Prev
                </button>
                <button onClick={deck.next} disabled={deck.current === deck.total - 1}>
                  Next ▶
                </button>
                <button className="btn-primary" onClick={startSlideshow}>
                  ▶ Start slideshow
                </button>
              </div>

              <div className="cue-box">
                <div className="label">Speaker cue</div>
                <div className="text">{deck.slide.notes ?? deck.slide.text}</div>
              </div>

              <div className="toolbar" style={{ marginTop: 14 }}>
                <span className="muted">Cue voice:</span>
                <VoicePicker player={player} />
                <button onClick={() => speak('AirDeck voice test. You should hear this.')}>
                  Test voice
                </button>
                {isSpeaking && <span className="muted">speaking…</span>}
              </div>

              {slideEvent && (
                <p className="muted" style={{ margin: '10px 0 0' }}>
                  slide #{slideEvent.index + 1} · “{slideEvent.slide.title}”
                </p>
              )}
            </section>
          </div>

          <div className="col">
            <section className="card">
              <h2 className="card-title">
                Gestures
                <span className="tag">{profile.handedness ?? 'auto'} hand</span>
              </h2>

              <div className="toolbar">
                <button className="btn-primary" onClick={() => setMode('calibrate')}>
                  Calibrate
                </button>
                <button
                  onClick={() => {
                    clearCalibration();
                    setProfile(loadCalibration());
                  }}
                >
                  Reset
                </button>
              </div>
              <p className="muted" style={{ marginTop: 10 }}>
                index finger → prev · pinky finger → next
              </p>

              <div style={{ marginTop: 16 }}>
                <strong style={{ fontSize: 13 }}>Gesture log</strong>
                {log.length === 0 ? (
                  <p className="muted" style={{ marginTop: 6 }}>
                    raise your index finger to go back, pinky to go forward…
                  </p>
                ) : (
                  <ul className="log-list">
                    {log.map((g, i) => (
                      <li key={`${g.timestamp}-${i}`}>
                        {g.type} @ {Math.round(g.timestamp)}ms
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
