// Landing page: sharp, minimal entry point that funnels into the presenter workspace.
// Presentational only; `onLaunch` flips the App into present mode.

const FEATURES = [
  {
    title: 'Bare-hand control',
    body: 'Raise your index finger to go back, your pinky to go forward. The webcam is the only controller. No clicker, no notes.',
  },
  {
    title: 'AI speaker cues',
    body: 'Claude reads each slide the instant it appears and speaks a tight 1–2 sentence cue into your earpiece.',
  },
  {
    title: 'Presenter-only audio',
    body: 'Cues route to your chosen output device. The audience never hears them. A private prompter.',
  },
  {
    title: 'Pre-generated, real-time',
    body: 'The next slide’s cue is generated ahead of time, so audio starts the moment you change slides.',
  },
  {
    title: 'Google Slides ready',
    body: 'Connect your Google Slides deck and present it live, or try the built-in demo deck first.',
  },
  {
    title: 'Robust to real rooms',
    body: 'Calibrate once to your lighting and camera angle. Gestures won’t fire from normal hand motion.',
  },
];

export function Landing({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="landing">
      <nav className="nav">
        <div className="brand">AirDeck</div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <button className="btn-primary" onClick={onLaunch}>
            Launch presenter
          </button>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-main">
          <span className="eyebrow">Webcam-only presentation copilot</span>
          <h1>
            Present hands-free.
            <br />
            Never lose your place.
          </h1>
          <p className="lede">
            Control your slides with bare-hand gestures while a Claude-powered copilot reads each
            slide and speaks your next line into your ear. No clicker, no note cards, no
            memorization.
          </p>
          <div className="cta-row">
            <button className="btn-primary cta" onClick={onLaunch}>
              Start presenting
            </button>
            <a className="cta" href="#features" role="button" style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid var(--line-strong)' }}>
              See features
            </a>
          </div>
        </div>

        <aside className="hero-aside">
          <div className="spec">
            <div className="k">Input</div>
            <div className="v">Webcam only · mic optional</div>
          </div>
          <div className="spec">
            <div className="k">Gestures</div>
            <div className="v">Index → back · pinky → forward</div>
          </div>
          <div className="spec">
            <div className="k">Time to first cue</div>
            <div className="v">~1–2 seconds</div>
          </div>
          <div className="spec">
            <div className="k">Hardware</div>
            <div className="v">No clicker, no note cards</div>
          </div>
        </aside>
      </header>

      <section className="features" id="features">
        <div className="features-head">
          <span className="eyebrow">What it does</span>
          <h2>One camera. Four gestures. A copilot that knows what comes next.</h2>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f, i) => (
            <article className="feature" key={f.title}>
              <div className="num">{String(i + 1).padStart(2, '0')}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="cta-band">
        <div>
          <h2>Connect a deck. Calibrate. Present.</h2>
          <p>Link Google Slides or use the demo deck, then step into the spotlight.</p>
        </div>
        <button className="btn-primary cta" onClick={onLaunch}>
          Launch presenter
        </button>
      </section>

      <footer className="landing-foot">
        <span>AirDeck · Claude Agent SDK + MediaPipe Hands</span>
        <span>Your webcam, your stage</span>
      </footer>
    </div>
  );
}
