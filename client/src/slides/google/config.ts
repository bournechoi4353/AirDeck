// Read-only scopes: read presentation content + export to PDF via Drive. No client secret is
// needed for the browser implicit/token flow — only the (public) OAuth client ID.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/presentations.readonly https://www.googleapis.com/auth/drive.readonly';

export function isGoogleConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}
