# AirDeck

AirDeck is a presentation copilot that runs off your webcam. You drive your Google Slides with
hand gestures, and a Claude-powered assistant reads each slide as it comes up and speaks a short
cue into your earpiece. No clicker, no note cards, nothing to memorize.

Right now the gestures are simple on purpose: raise your index finger to go back a slide, raise
your pinky to go forward. The cue audio goes only to the output device you pick, so the audience
never hears it.

For the bigger picture, see [CLAUDE.md](CLAUDE.md) for the architecture and
[PIPELINE.md](PIPELINE.md) for the build plan.

## Getting started

You'll need Node and npm. Then:

```bash
npm install
npm run dev
```

That starts both halves of the app at once: the client on http://localhost:5173 and the server on
http://localhost:8787. Open the client URL and you'll land on the home page. Click "Launch
presenter" to go into the workspace, where you can connect a deck, calibrate your gestures, and
present.

If you just want to look around, the workspace ships with a demo deck, so you don't have to
connect Google Slides to try it.

## Connecting Google Slides

Google Slides support is optional. To turn it on, drop your OAuth client ID into a file at
`client/.env`:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

A couple of things worth knowing:

- The file has to live in `client/`, not the repo root. Vite only reads env files from the client
  folder, and it only reads them at startup, so restart `npm run dev` after you add it.
- Only the client ID goes here. There is no secret in the browser, so this value is safe to keep
  in a local env file (which is already gitignored).

On the Google Cloud side, the OAuth client should be a Web application with
http://localhost:5173 listed as an authorized JavaScript origin, the Slides and Drive APIs
enabled, and (while the consent screen is still in testing) your own account added as a test user.

Once that's in place, the present view shows a "Connect Google Slides" button that opens a popup
and lets you pick one of your decks.

## Project layout

This is an npm workspaces monorepo with two packages:

```
client/   React, TypeScript, Vite   (gesture tracking, slides, audio, app shell)
server/   Node, TypeScript, Express  (speaker notes, TTS proxy, auth)
```

The client dev server proxies anything under `/api` to the backend, so the browser never has to
deal with CORS.

## Useful scripts

| Command             | What it does                          |
| ------------------- | ------------------------------------- |
| `npm run dev`       | Run the client and server together    |
| `npm run build`     | Type-check and build both packages    |
| `npm test`          | Run the test suites                   |
| `npm run typecheck` | Type-check without emitting           |
| `npm run lint`      | Lint with ESLint                      |
| `npm run format`    | Format with Prettier                  |
