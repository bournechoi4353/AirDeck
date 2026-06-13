# AirDeck

Webcam-only presentation copilot. The presenter controls Google Slides with bare-hand
gestures (swipe to advance/go back, pinch to zoom, point to drop a laser highlight) while a
Claude-powered assistant silently reads each slide as it appears and speaks a concise 1–2
sentence cue into the presenter's earpiece via TTS. No clicker, no note cards, no memorization.

## Core principles

- **Input is the webcam only** (mic optional). No clicker or external control hardware.
- **The cue must feel real-time.** Optimize time-to-first-audio when a slide changes.
- **Presenter-only audio.** Cues go to the presenter's earpiece; the audience never hears them.
- **Don't false-fire.** Gestures must not trigger from normal hand movement mid-sentence.
- **Robust to real rooms.** Tolerate varied lighting and camera positions.

## Architecture

```
Browser (client)                                   Backend (Node)
┌───────────────────────────────┐                 ┌──────────────────────────────┐
│ Webcam → MediaPipe Hands       │  slide content  │ Speaker-note service         │
│   → gesture engine (FSM)       │ ───────────────▶│   Claude Agent SDK query()   │
│   → laser overlay (canvas)     │   cue text (SSE)│   (subscription auth, no key)│
│ Google Slides (connect+control)│ ◀───────────────│ TTS proxy (key stays server) │
│ TTS playback → earpiece        │                 │ Google OAuth token exchange  │
└───────────────────────────────┘                 └──────────────────────────────┘
```

Subsystems:

- **Gesture engine** (client): webcam capture + MediaPipe `HandLandmarker` at ~30fps → a finite
  state machine that classifies swipe-left/right, pinch, and point, with a cooldown to debounce
  slide changes. Emits gesture events to the app.
- **Google Slides** (client + backend): Google OAuth via Google Identity Services; read per-slide
  text/notes to feed Claude; advance/rewind the live deck. **The live-advance mechanism is the
  riskiest open decision** (Slides has no official "next slide" API) — see Open questions.
- **Speaker-note service** (backend): takes the current slide's content (and optionally a
  screenshot) and returns a 1–2 sentence cue. Streams output. Pre-generates the next slide's cue
  so it's instant on swipe.
- **TTS + audio** (client + backend): streams the cue to speech and routes it to the presenter's
  chosen output device (`setSinkId`); barges in / interrupts if the slide changes again.
- **Laser overlay** (client): maps fingertip landmark → screen coordinates, smooths the path, and
  draws a dot on a transparent always-on-top canvas that the audience sees on the shared screen.

## Key decisions

- **Speaker notes use the Claude Agent SDK, NOT a raw Anthropic API key.** Use
  `@anthropic-ai/claude-agent-sdk` (`query()`), authenticated with the Claude Code / Claude
  subscription login so no `ANTHROPIC_API_KEY` is required. For a headless backend, mint a token
  with `claude setup-token` and provide it via `CLAUDE_CODE_OAUTH_TOKEN` (or rely on the `~/.claude`
  login state). Caveats to keep in mind: it spawns the Claude Code process, the OAuth token can
  expire/needs refresh, and automation should respect subscription terms.
- **Keep `query()` minimal for latency:** `maxTurns: 1`, no tools (`allowedTools: []`), a tight
  custom `systemPrompt`, and do not load filesystem config (`settingSources: []`) so it ignores
  this CLAUDE.md and project settings at runtime.
- **Model:** start the live cue path on a fast model (`claude-haiku-4-5`, or the `haiku` alias);
  move to `claude-sonnet-4-6` if cue quality needs it. Reserve `claude-opus-4-8` for richer,
  pre-computed notes generated before the talk, if we add that.
- **Stack:** React + TypeScript + Vite (client), Node + TypeScript (backend). MediaPipe Tasks
  Vision for hands, Web Audio for playback. See PIPELINE.md for the build order.

## Proposed repo structure

```
airdeck/
  client/                 # React + TS + Vite
    src/
      gesture/            # MediaPipe wiring, gesture FSM, calibration
      slides/             # Google OAuth, content extraction, deck control
      laser/              # coordinate mapping + overlay canvas
      audio/              # TTS playback + output-device routing
      app/                # state machine (idle→connect→calibrate→present), HUD
  server/                 # Node + TS
    src/
      notes/              # Claude Agent SDK speaker-note service
      tts/                # TTS provider proxy
      auth/               # Google OAuth token exchange
  CLAUDE.md
  PIPELINE.md
```

## Dev commands

To be filled in once Phase 0 scaffolds the project. Expected: `pnpm dev` (client + server),
`pnpm test` (gesture math unit tests), `pnpm lint`.

## Conventions

- TypeScript everywhere. Keep gesture/laser math pure and unit-tested.
- Secrets (TTS key, Google client secret, Claude OAuth token) live on the backend only; never
  ship them to the client.
- Subsystems communicate through typed events; slide content and cues stream over SSE.

## Open questions (confirm before/at build)

1. **Live Slides control mechanism** — embed + `postMessage`, drive the present-mode tab, a browser
   extension, or render slides ourselves from the API. This is the biggest risk; pick one early.
2. **TTS provider** — streaming quality vs latency vs cost (e.g. ElevenLabs / OpenAI / Google /
   Azure), with browser `SpeechSynthesis` as an offline fallback.
3. **Deck sources** — Google Slides only at first, or also uploaded PPTX/PDF?

See **PIPELINE.md** for the phased build plan.
