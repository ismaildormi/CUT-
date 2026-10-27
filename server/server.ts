import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { processCompanionInteraction } from './gemini.js';
import { localVectorStore } from './vectorMemory.js';
import { executeOSCommand } from './tools.js';
import { setupGeminiLiveAudioServer } from './liveAudio.js';

const app = express();
const server = http.createServer(app);
const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

// WebSocket Server for Gemini Live API Voice Stream
const wss = new WebSocketServer({ server, path: '/live' });
setupGeminiLiveAudioServer(wss);

app.use(express.json({ limit: '25mb' }));

// Health Check
app.get(['/healthz', '/_ah/health'], (_req, res) => {
  res.status(200).send('OK');
});

// 1. Multimodal Conversational Endpoint (Prompt + Vision + Tools + Memory)
app.post('/api/gemini/interact', async (req, res) => {
  try {
    const { prompt, screenshotBase64, userMemoryQuery } = req.body;
    if (!prompt && !screenshotBase64) {
      return res.status(400).json({ error: 'Prompt or screenshot is required' });
    }

    const result = await processCompanionInteraction({
      prompt: prompt || 'Look at my screen and tell me how you can help.',
      screenshotBase64,
      userMemoryQuery,
    });

    res.json(result);
  } catch (err: any) {
    console.error('API Error /api/gemini/interact:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Direct OS Automation Command Dispatcher
app.post('/api/os/execute', async (req, res) => {
  try {
    const { toolName, args } = req.body;
    const result = await executeOSCommand(toolName, args);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. ChromaDB Long-Term Memory Endpoints
app.get('/api/memory', (_req, res) => {
  res.json({ memories: localVectorStore.getAll() });
});

app.post('/api/memory', async (req, res) => {
  try {
    const { key, content } = req.body;
    const item = await localVectorStore.store(key, content);
    res.json({ success: true, item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/memory/query', async (req, res) => {
  try {
    const { query } = req.body;
    const results = await localVectorStore.query(query || '');
    res.json({ results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Static files & SPA Fallback
const DIST_DIR = path.join(process.cwd(), 'dist');
const STATIC_DIR = fs.existsSync(DIST_DIR) ? DIST_DIR : process.cwd();

app.use(express.static(STATIC_DIR, { index: false }));

app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }
  const indexHtml = path.join(STATIC_DIR, 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.sendFile(path.join(process.cwd(), 'index.html'));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[Nevea Server] Online at http://${HOST}:${PORT}`);
});
