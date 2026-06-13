import { useEffect, useState } from 'react';
import { HandTrackingView } from '../gesture';

type Health = { status: string; service: string; time: string };

export function App() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data: Health) => setHealth(data))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', lineHeight: 1.5 }}>
      <h1>AirDeck</h1>
      <p>Webcam-only presentation copilot. Phase 1 — hand tracking.</p>

      <section>
        <h2>Hand tracking</h2>
        <HandTrackingView />
        <p style={{ fontSize: 13, color: '#555' }}>
          Allow camera access; you should see 21 landmarks tracking your hand at ~30fps.
        </p>
      </section>

      <section>
        <h2>Backend status</h2>
        {health && (
          <p style={{ color: 'green' }}>
            ✓ {health.service}: {health.status} ({health.time})
          </p>
        )}
        {error && <p style={{ color: 'crimson' }}>✗ cannot reach backend: {error}</p>}
        {!health && !error && <p>checking…</p>}
      </section>
    </main>
  );
}
