import cors from 'cors';
import express from 'express';
import { cueRouter } from './notes/index.js';
import { ttsRouter } from './tts/index.js';

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/cue', cueRouter);
app.use('/api/tts', ttsRouter);

app.get('/', (_req, res) => {
  res
    .type('text')
    .send('AirDeck API. Open the app at http://localhost:5173 — this server only serves /api/*.');
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'airdeck-server',
    time: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`[airdeck-server] listening on http://localhost:${PORT}`);
});
