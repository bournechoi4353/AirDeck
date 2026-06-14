import type { UseGoogleDeck } from './useGoogleDeck';

// Presentational connect panel: all state lives in the useGoogleDeck hook passed in.
export function GoogleConnect({ google }: { google: UseGoogleDeck }) {
  const { configured, status, error, presentations, deck, connect, choose, reset } = google;

  if (!configured) {
    return (
      <p style={{ fontSize: 13, color: '#555' }}>
        Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>client/.env</code> to connect Google Slides.
        Until then, the demo deck below is shown.
      </p>
    );
  }

  return (
    <div style={{ marginBottom: 12, fontSize: 14 }}>
      {status === 'idle' && <button onClick={() => void connect()}>Connect Google Slides</button>}

      {status === 'connecting' && <span style={{ color: '#555' }}>connecting…</span>}

      {status === 'choosing' && (
        <div>
          <span style={{ fontWeight: 600 }}>Choose a presentation:</span>
          {presentations.length === 0 ? (
            <p style={{ color: '#555' }}>No Google Slides found in your Drive.</p>
          ) : (
            <ul style={{ paddingLeft: 18, margin: '6px 0' }}>
              {presentations.map((p) => (
                <li key={p.id} style={{ marginBottom: 4 }}>
                  <button onClick={() => void choose(p)}>{p.name}</button>
                </li>
              ))}
            </ul>
          )}
          <button onClick={reset}>Cancel</button>
        </div>
      )}

      {status === 'loading' && <span style={{ color: '#555' }}>loading deck…</span>}

      {status === 'ready' && deck && (
        <span>
          Loaded <strong>“{deck.title}”</strong> ({deck.slides.length} slides){' '}
          <button onClick={reset}>Use demo deck</button>
        </span>
      )}

      {status === 'error' && (
        <span style={{ color: 'crimson' }}>
          error: {error} <button onClick={reset}>Retry</button>
        </span>
      )}
    </div>
  );
}
