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

## Phase 2 — Gesture recognition engine
**Goal:** Reliable gesture events.
- Detectors for swipe-left (prev), swipe-right (next), pinch (zoom), point (laser).
- A finite state machine + cooldown so a single intentional gesture fires once and idle movement
  doesn't fire at all.
- Emits typed gesture events; pure detection logic is unit-tested.

**Exit:** Each gesture logs correctly and reliably; no false fires during normal talking gestures.

## Phase 3 — Calibration flow (~30s)
**Goal:** Per-user tuning.
- Guided flow that captures the user's swipe speed/range and pinch/point shape, derives
  thresholds, and persists them locally.

**Exit:** Calibration measurably improves detection; settings persist across reloads.

## Phase 4 — Google Slides connect + control
**Goal:** Gestures drive a real deck, and slide content is available.
- Google OAuth (Google Identity Services); load a presentation; extract per-slide text/notes.
- Implement the chosen live-advance mechanism (see CLAUDE.md Open Q1) for next/prev.
- Emit slide-change events carrying the new slide's content.

**Exit:** Swiping advances/reverses the actual presentation; current slide content is readable by
the app.

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
