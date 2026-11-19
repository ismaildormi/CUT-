import { runServer } from './server/start.js';

runServer().catch((err) => {
  console.error('[HEYUKA Desktop Server] Fatal boot error:', err);
  process.exit(1);
});
