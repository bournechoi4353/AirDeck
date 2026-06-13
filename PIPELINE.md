# AirDeck — Build Pipeline

Phased build plan. Each phase has a goal, deliverables, and an exit criterion you can demo before
moving on. Phases are ordered so each one is testable on its own.

**End-to-end latency target** (slide change → first audio in earpiece): ~700–1200ms.
Rough budget: gesture detect ~50ms · slide advance ~100ms · cue generation first token ~250–500ms
(mitigated to ~0 by Phase 5 lookahead prefetch) · TTS first audio ~200–400ms.

---

## Phase 0 — Project scaffolding
**Goal:** A running dev environment.
- `client/` (React + TypeScript + Vite) and `server/` (Node + TypeScript) workspaces.
- Lint/format/test config; `.env.example`; npm scripts (`dev`, `test`, `lint`).
- Empty subsystem folders per the structure in CLAUDE.md.

**Exit:** `npm run dev` runs client and server; a placeholder page loads and hits a health endpoint.

## Phase 1 — Webcam + hand tracking
**Goal:** Live hand landmarks from the webcam.
- `getUserMedia` capture; MediaPipe `HandLandmarker` (Tasks Vision) running ~30fps off the main
  thread.
- Debug overlay drawing the 21 hand landmarks on the video.

**Exit:** Landmarks track the hand smoothly with no UI jank.

## Phase 2A — Gesture detectors (pure functions)
**Goal:** Correct per-frame gesture classification with no side effects.
- Pure functions in `detectors.ts` that take a landmark array and return a gesture name or `null`.
- **Swipe:** rolling X-position window with time-based velocity (pixels/ms via `performance.now()`);
  stale entries older than ~300ms are evicted so a hand leaving frame mid-swipe doesn't fire late.
- **Mirror-flip compensation:** flip landmark X as `1.0 - x` before all swipe math so
  left/right directions match the user's POV, not the raw camera space.
- **Pinch:** Euclidean distance between thumb tip (landmark 4) and index tip (landmark 8) below
  a configurable threshold.
- **Point:** index finger extended (tip Y < PIP Y), all other fingers curled, no active pinch.
- Unit tests in `detectors.test.ts` with synthetic landmark arrays (no browser APIs); covers
  clear fire, no-fire on small drift, and boundary conditions for each detector.

**Exit:** All four detectors pass unit tests; swipe direction matches user intent in manual smoke test.

## Phase 2B — Finite state machine + cooldown
**Goal:** Each intentional gesture fires exactly once; idle movement never fires.
- `gestureFSM.ts` with three states: `idle → gesture → cooldown → idle`.
- Transitions on detector output; emits a typed `GestureEvent` exactly once per gesture.
- Per-gesture cooldown durations (e.g. 800ms swipe, 300ms pinch/point) configurable so
  Phase 3 calibration can tighten or loosen them.
- **Detector priority enforced here:** swipe checked first, then pinch, then point — first match
  wins per frame, preventing gesture bleed.
- Unit tests: FSM emits exactly once, cooldown blocks re-fire, priority order is respected.

**Exit:** FSM tests pass; tapping the same gesture repeatedly in the console log shows one event
per intentional motion with no duplicates during the lockout window.

## Phase 2C — Hand pre-filter ✓
**Goal:** The correct hand is tracked when multiple hands are in frame.
- `handFilter.ts` accepts the full MediaPipe results (all detected hands + handedness labels)
  and returns the single landmark array to feed into detectors.
- Config: `preferredHandedness: "Left" | "Right" | null`.
  - If one hand detected: use it regardless of preference.
  - If two hands detected and preference is set: use the matching one.
  - If two hands and no preference: use the one with the higher MediaPipe confidence score.
- Exports a `setPreferredHandedness()` setter so Phase 3 calibration can write the value;
  persists to `localStorage`.
- Unit tests: correct hand selected under each scenario (one hand, two hands + pref, two hands
  no pref).

**Exit:** With two hands in frame, only the preferred hand's gestures register; the non-gesture
hand causes no events.

## Phase 2D — Integration into the RAF loop
**Goal:** Live gesture events wired into the existing hook and surfaced to the app.
- Add `GestureEvent` type (`{ type: 'swipe-left' | 'swipe-right' | 'pinch' | 'point',
  timestamp: number }`) to a shared `types.ts`.
- Extend `useHandTracking` to accept an optional `onGesture` callback; each RAF frame runs
  hand-filter → detectors → FSM and calls `onGesture` when an event fires.
- No new React state — the callback fires synchronously in the RAF loop, same as the canvas draw.
- `HandTrackingView` logs gesture events to the console for manual verification.

**Exit:** Opening the app and performing each gesture logs the correct event type once per motion;
normal talking hand movement logs nothing.

## Phase 3 — Calibration flow (~30s)
**Goal:** Per-user tuning.
- Guided flow that captures the user's swipe speed/range and pinch/point shape, derives
  thresholds, and persists them locally.
- **Hand selection:** user designates their gesture hand (left or right) during calibration;
  persisted as `preferredHandedness` so Phase 2's hand pre-filter locks onto the correct hand
  for the rest of the session.

**Exit:** Calibration measurably improves detection; hand selection is locked in; settings
persist across reloads.

## Phase 4 — Google Slides connect + control
**Goal:** Gestures drive a real deck, and slide content is available.
- Google OAuth (Google Identity Services); load a presentation; extract per-slide text/notes.
- **Live-advance mechanism: browser extension.** A small Chrome extension injects into the
  `slides.google.com` tab, listens for `postMessage` events from the AirDeck client (same
  browser, different origin), and sends `ArrowRight` / `ArrowLeft` key events to advance or
  rewind the active presentation. The extension needs only `activeTab` + `scripting` permissions.
- AirDeck client calls `window.postMessage` (or a dedicated extension messaging port) to trigger
  next/prev; the extension relays it as a keydown into the Slides tab.
- Emit slide-change events carrying the new slide's content.
- Extension lives in `extension/` at the repo root; `manifest.json` targets Chrome/Edge (MV3).

**Exit:** Swiping advances/reverses the actual presentation in the open Slides tab; current slide
content is readable by the app; extension installs via "Load unpacked" in Chrome dev mode.

## Phase 5 — Claude speaker-note service (Agent SDK)
**Goal:** A fast 1–2 sentence cue per slide.
- Backend service using `@anthropic-ai/claude-agent-sdk` `query()` with **subscription auth (no
  API key)**, `maxTurns: 1`, tools off, `settingSources: []`, tight `systemPrompt`, fast model
  (`haiku`).
- Stream the cue to the client over SSE for low time-to-first-token.
- **Lookahead:** pre-generate the next slide's cue on each change so it's instant on swipe.
- The full deck + the user's talk goal are provided as context.

**Exit:** On a slide change, a relevant 1–2 sentence cue is produced quickly; next-slide cue is
already prefetched.

## Phase 6 — TTS + earpiece audio
**Goal:** The presenter hears the cue, the audience doesn't.
- Stream the cue text to TTS; play via Web Audio with low latency.
- Route output to a presenter-selected device with `setSinkId`.
- Barge-in: interrupt the current cue if the slide changes again.
- Offline fallback via browser `SpeechSynthesis`.

**Exit:** Slide change → cue plays in the chosen earpiece within the latency target; switching
slides mid-cue interrupts cleanly.

## Phase 7 — Laser highlight overlay
**Goal:** A laser dot the audience sees, tracking the finger.
- Map fingertip landmark → screen/slide coordinates (with the needed camera↔screen calibration).
- Smooth the path (One-Euro or EMA filter); render on a transparent, always-on-top canvas.
- Show on point gesture, hide otherwise; subtle trail/glow.

**Exit:** Pointing drops a smooth laser dot on the shared screen where the finger aims.

## Phase 8 — Presenter UX + integration
**Goal:** One coherent live flow.
- App state machine: idle → connect deck → calibrate → present.
- Presenter HUD (current cue text, gesture/connection status, device pickers).
- Error states and recovery for camera, OAuth, network.

**Exit:** A full talk runs end to end from a single screen with no manual wiring.

## Phase 9 — Hardening & deploy
**Goal:** Demo-ready and robust.
- Tune latency; reduce false fires across lighting/camera positions.
- Graceful degradation: slow cue generation, TTS outage, lost auth.
- Package and deploy (static client + Node backend).

**Exit:** Stable run in a realistic room; recovers from the common failure modes.

---

### Confirm before building
1. **Slides live-advance mechanism** (CLAUDE.md Open Q1) — the riskiest piece; decide first.
2. **TTS provider** (Open Q2).
3. **Deck sources** — Google Slides only, or also uploaded PPTX/PDF (Open Q3).
