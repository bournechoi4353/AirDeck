# AirDeck

Webcam-only presentation copilot — control Google Slides with hand gestures while a
Claude-powered assistant speaks a 1–2 sentence cue for each slide into your earpiece.

See **[CLAUDE.md](CLAUDE.md)** for architecture and **[PIPELINE.md](PIPELINE.md)** for the build plan.

## Develop

```bash
npm install
npm run dev        # client (http://localhost:5173) + server (http://localhost:8787)
```

Other scripts: `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`, `npm run format`.

## Layout

```
client/   React + TypeScript + Vite   (gesture, slides, laser, audio, app)
server/   Node + TypeScript + Express  (notes, tts, auth)
```

This is an npm-workspaces monorepo. The client dev server proxies `/api` to the backend.
