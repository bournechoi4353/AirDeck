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

(Thanks Claude for helping make this!)
