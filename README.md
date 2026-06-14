# AirDeck

AirDeck is a presentation copilot that runs off your webcam. You drive your Google Slides with
hand gestures, and a Claude-powered assistant reads each slide as it comes up and speaks a short
cue into your earpiece. Right now the gestures are simple on purpose: raise your index finger to go back a slide, raise
your pinky to go forward. The cue audio goes only to the output device you pick, so the audience
never hears it. Before I tried to use hand-swipe, but it was not as robust as simple fingers.
The use of fingers is discrete enough so it should suffice in real-world presentations. 

## Getting started

You'll need Node and npm already installed, and after that, run:

```bash
npm install
npm run dev
```

This starts both halves of the app at once: the client on http://localhost:5173 and the server on
http://localhost:8787. Open the client URL and you'll land on the home page. Click "Launch
presenter" to go into the workspace, where you can connect a deck, calibrate your gestures, and
present.

If you just want to look around, the workspace ships with a demo deck, so you don't have to
connect Google Slides to try it. I am currently working on a solution so that you don't have to run
the app locally so that you can just connect Claude SDK through the browser (Vercel link). 

## Connecting Google Slides

Google Slides support is optional. To turn it on, drop your OAuth client ID into a file at
`client/.env`:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

On the Google Cloud side, the OAuth client should be a Web application with
http://localhost:5173 listed as an authorized JavaScript origin, the Slides and Drive APIs
enabled, and (while the consent screen is still in testing) your own account added as a test user,
as I will not be able to provide my Google Cloud API key. 

Once that's in place, the present view shows a "Connect Google Slides" button that opens a popup to your Google acounts
and lets you pick one of your decks.

<<<<<<< Updated upstream
(Thanks Claude for helping make this!)
=======
## Deploying

The two packages deploy to two different places, and that split is not optional. The server uses
the Claude Agent SDK, which runs your Claude subscription by spawning the Claude Code CLI as a
background process. That needs a real, always-on Node host, so it cannot live on Vercel's
serverless functions. The plan is:

- The client (a static site) goes on Vercel.
- The server goes on Render, which gives you a persistent Node process.

### Server on Render

1. Create a new Web Service on Render and point it at this repo. The included `render.yaml`
   already sets the build and start commands and a health check.
2. Mint a subscription token on your own machine with `claude setup-token`, then paste it into the
   Render dashboard as the `CLAUDE_CODE_OAUTH_TOKEN` environment variable. This is what connects
   your Claude plan. No API key is involved, and the token is good for about a year, after which
   you run `claude setup-token` again.
3. Deploy. Render gives you a public URL like `https://airdeck-server.onrender.com`.

A couple of notes. The free Render plan sleeps after a stretch of inactivity, so the first cue
after a pause takes a few seconds to wake up. Also, as of June 15, 2026, Agent SDK usage on a
Claude subscription draws from a separate monthly Agent SDK allowance rather than your interactive
Claude Code limit.

### Client on Vercel

1. Import the repo into Vercel. The included `vercel.json` builds the client workspace and serves
   `client/dist`.
2. In the Vercel project settings, add two build-time environment variables:
   - `VITE_API_URL` set to your Render URL (so the browser calls the backend directly).
   - `VITE_GOOGLE_CLIENT_ID` if you want Google Slides (the same value you use locally).
3. Deploy. Open the Vercel URL and the app will talk to your Render backend.

If you connect Google Slides in production, remember to add your Vercel URL as an authorized
JavaScript origin on the OAuth client, the same way you added http://localhost:5173 for local dev.

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
>>>>>>> Stashed changes
