import { useRef, useState } from 'react';
import { isGoogleConfigured } from './google/config';
import { listPresentations, type DrivePresentation } from './google/driveApi';
import { getAccessToken } from './google/gis';
import { loadGoogleDeck } from './loadDeck';
import type { Deck } from './types';

export type GoogleDeckStatus = 'idle' | 'connecting' | 'choosing' | 'loading' | 'ready' | 'error';

export type UseGoogleDeck = {
  configured: boolean;
  status: GoogleDeckStatus;
  error: string | null;
  presentations: DrivePresentation[];
  deck: Deck | null;
  connect: () => Promise<void>;
  choose: (presentation: DrivePresentation) => Promise<void>;
  reset: () => void;
};

// Drives the connect → choose → load lifecycle for a Google Slides deck. The access token is kept
// in a ref (it's a secret, not render state); only status/list/deck/error are React state.
export function useGoogleDeck(): UseGoogleDeck {
  const [status, setStatus] = useState<GoogleDeckStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [presentations, setPresentations] = useState<DrivePresentation[]>([]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const tokenRef = useRef<string | null>(null);

  async function connect(): Promise<void> {
    setError(null);
    setStatus('connecting');
    try {
      const token = await getAccessToken();
      tokenRef.current = token;
      setPresentations(await listPresentations(token));
      setStatus('choosing');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  async function choose(presentation: DrivePresentation): Promise<void> {
    if (!tokenRef.current) {
      setError('not connected');
      setStatus('error');
      return;
    }
    setError(null);
    setStatus('loading');
    try {
      setDeck(await loadGoogleDeck(presentation, tokenRef.current));
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  function reset(): void {
    setDeck(null);
    setPresentations([]);
    setError(null);
    setStatus('idle');
  }

  return {
    configured: isGoogleConfigured(),
    status,
    error,
    presentations,
    deck,
    connect,
    choose,
    reset,
  };
}
