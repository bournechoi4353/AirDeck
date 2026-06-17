# AirDeck

AirDeck is a presentation copilot that runs off your webcam. You drive your Google Slides with
hand gestures, and a Claude-powered assistant reads each slide as it comes up and speaks a short
cue into your earpiece. Right now the gestures are simple on purpose: raise your index finger to go back a slide, raise
your pinky to go forward. The cue audio goes only to the output device you pick, so the audience
never hears it. Before I tried to use hand-swipe, but it was not as robust as simple fingers.
The use of fingers is discrete enough so it should suffice in real-world presentations. 

If you just want to look around, the workspace ships with a demo deck, so you don't have to
connect Google Slides to try it. I am currently working on a solution so that you don't have to run
the app locally so that you can just connect Claude SDK through the browser (Vercel link). 

## Connecting Google Slides

Google Slides support is optional. To turn it on, drop your OAuth client ID into a file at
`client/.env`:

```
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```


The app is two pieces, and they live in different places. The client is a static site, so it goes
on Vercel with no trouble. The server is the part that talks to Claude: it uses the Claude Agent
SDK, which runs your subscription by launching the Claude Code CLI as a background process. That
needs a real, always-on Node process, which Vercel's serverless functions cannot provide.

1. Set your token once

Mint a subscription token with `claude setup-token`, then put it in a file at `server/.env`:

```
CLAUDE_CODE_OAUTH_TOKEN=your-token
```

The server loads this on startup, so you do not have to export it in every shell. The file is
gitignored and never leaves your machine.

2. Run the server and open a tunnel

```bash
npm run dev -w server                 # listens on http://localhost:8787
npm run tunnel                        # second terminal, prints a public https URL
```

`npm run tunnel` needs cloudflared installed once (`brew install cloudflared` on a Mac). It prints
a URL like `https://something-random.trycloudflare.com` that forwards straight to your local
server. This quick-tunnel URL changes every time you start it, so grab the current one each session.

The script forces the `http2` protocol because many networks (school and office Wi-Fi especially)
block the QUIC/UDP traffic cloudflared uses by default. If even that fails to connect, the network
is likely blocking cloudflared's port 7844 entirely, in which case ngrok (which runs over the
normal HTTPS port 443) is a more reliable free alternative.

3. Point the client at the tunnel

For the hosted client, set `VITE_API_URL` to the tunnel URL in your Vercel project settings (plus
`VITE_GOOGLE_CLIENT_ID` if you want Slides), then redeploy. To test the whole thing locally
instead, put the same `VITE_API_URL` in `client/.env` and run `npm run dev`.

If you would rather not depend on your machine being on, the same server runs on any always-on
host. `render.yaml` is included for Render if you ever want a hosted box (it asks for a card,
though); the only change is that you set `CLAUDE_CODE_OAUTH_TOKEN` in that host's dashboard instead
of in `server/.env`.

Project layout

This is an npm workspaces monorepo with two packages:

```
client/   React, TypeScript, Vite   (gesture tracking, slides, audio, app shell)
server/   Node, TypeScript, Express  (speaker notes, TTS proxy, auth)
```

The client dev server proxies anything under `/api` to the backend, so the browser never has to
deal with CORS.


(Thanks Claude for helping make this!)
