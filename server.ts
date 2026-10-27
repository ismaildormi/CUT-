import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import { processCompanionInteraction } from './server/gemini.js';
import { localVectorStore } from './server/vectorMemory.js';
import { executeOSCommand } from './server/tools.js';
import { setupGeminiLiveAudioServer } from './server/liveAudio.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = '0.0.0.0';

  // WebSocket Server for Gemini Live API Voice Stream
  const wss = new WebSocketServer({ server, path: '/live' });
  setupGeminiLiveAudioServer(wss);

  app.use(express.json({ limit: '25mb' }));

  // Health Checks
  app.get(['/healthz', '/_ah/health'], (_req, res) => {
    res.status(200).send('OK');
  });

  // 1. Multimodal Conversational Endpoint (Prompt + Vision + Tools + Memory)
  app.post('/api/gemini/interact', async (req, res) => {
    try {
      const { prompt, screenshotBase64, userMemoryQuery } = req.body || {};
      const queryPrompt = (prompt && String(prompt).trim()) || (screenshotBase64 ? 'Inspect my screen view and let me know what you see.' : '');
      
      if (!queryPrompt && !screenshotBase64) {
        return res.status(200).json({
          text: "I'm right here with you! Tell me what you'd like to do or ask me to inspect your screen.",
          companionMood: 'idle',
        });
      }

      const result = await processCompanionInteraction({
        prompt: queryPrompt,
        screenshotBase64,
        userMemoryQuery,
      });

      return res.status(200).json(result);
    } catch (err: any) {
      console.error('API Error /api/gemini/interact:', err);
      return res.status(200).json({
        text: "I'm listening and ready! What can I do for you on your desktop next?",
        error: err?.message || 'Internal error',
        companionMood: 'idle',
      });
    }
  });

  // 2. Direct OS Automation Command Dispatcher
  app.post('/api/os/execute', async (req, res) => {
    try {
      const { toolName, args } = req.body || {};
      if (!toolName) {
        return res.status(400).json({ success: false, error: 'toolName is required' });
      }
      const result = await executeOSCommand(toolName, args);
      return res.status(200).json(result);
    } catch (err: any) {
      console.error('API Error /api/os/execute:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Execution error' });
    }
  });

  // 3. ChromaDB Long-Term Memory Endpoints
  app.get('/api/memory', (_req, res) => {
    try {
      const memories = localVectorStore.getAll();
      return res.status(200).json({ memories });
    } catch (err: any) {
      return res.status(200).json({ memories: [] });
    }
  });

  app.post('/api/memory', async (req, res) => {
    try {
      const { key, content } = req.body || {};
      if (!key || !content) {
        return res.status(400).json({ success: false, error: 'key and content required' });
      }
      const item = await localVectorStore.store(key, content);
      return res.status(200).json({ success: true, item });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/memory/query', async (req, res) => {
    try {
      const { query } = req.body || {};
      const results = await localVectorStore.query(query || '');
      return res.status(200).json({ results });
    } catch (err: any) {
      return res.status(200).json({ results: [] });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';
  const DIST_DIR = path.join(__dirname, 'dist');

  if (!isProduction && !fs.existsSync(DIST_DIR)) {
    // In dev mode, attach Vite dev server middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(DIST_DIR, { index: false }));
    app.use((req, res) => {
      if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'Endpoint not found' });
      }
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[NEVEA Companion Server] Active on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
