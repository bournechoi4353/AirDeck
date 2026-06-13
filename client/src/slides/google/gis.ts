import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from './config';
import type { TokenClient, TokenResponse } from './types';

const GIS_SRC = 'https://accounts.google.com/gsi/client';

let scriptPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${GIS_SRC}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

let tokenClient: TokenClient | null = null;

// Prompts the user (popup) and resolves with a short-lived OAuth access token for the read scopes.
export async function getAccessToken(): Promise<string> {
  const clientId = GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('VITE_GOOGLE_CLIENT_ID is not set');

  await loadGis();
  const google = window.google;
  if (!google) throw new Error('Google Identity Services unavailable');

  return new Promise<string>((resolve, reject) => {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: (response: TokenResponse) => {
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error ?? 'no access token returned'));
      },
      error_callback: (error) => reject(new Error(error.message ?? error.type ?? 'OAuth error')),
    });
    tokenClient.requestAccessToken();
  });
}
