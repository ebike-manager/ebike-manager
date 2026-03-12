import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Anthropic proxy plugin — keeps ANTHROPIC_API_KEY server-side (never exposed to browser).
// The frontend calls POST /api/ai and this plugin forwards it to api.anthropic.com.
// To enable AI features: create a .env file with ANTHROPIC_API_KEY=sk-ant-...
const anthropicProxy = {
  name: 'anthropic-proxy',
  configureServer(server) {
    server.middlewares.use('/api/ai', async (req, res) => {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.end();
        return;
      }

      // Collect request body
      const chunks = [];
      await new Promise((resolve) => {
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', resolve);
      });
      const body = Buffer.concat(chunks);

      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.statusCode = 503;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurado en .env' }));
        return;
      }

      try {
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body,
        });

        res.statusCode = anthropicRes.status;

        // Forward headers (skip ones that cause issues in Node streams)
        anthropicRes.headers.forEach((value, key) => {
          if (!['transfer-encoding', 'content-encoding', 'connection'].includes(key)) {
            try { res.setHeader(key, value); } catch { /* ignore */ }
          }
        });

        // Stream body to client
        if (anthropicRes.body) {
          const reader = anthropicRes.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
          }
        }
        res.end();
      } catch (err) {
        if (!res.headersSent) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      }
    });
  },
};

export default defineConfig({
  plugins: [react(), anthropicProxy],
});
