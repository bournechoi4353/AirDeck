// Base URL for the backend API.
//
// In local dev this is empty, so calls stay relative ("/api/...") and go through the Vite proxy
// in vite.config.ts. In production (e.g. the Vercel-hosted client), set VITE_API_URL to the
// backend's public origin (the Render service URL) so the browser talks to it directly. The
// server already sends permissive CORS headers, so a cross-origin base works without a proxy.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
