/**
 * Test Harness for AiPASS Teamwork Studio
 * Provides ephemeral ports, server lifecycles, and mock bridge servers.
 */
import net from 'node:net';
import http from 'node:http';
import { createServer } from '../server.mjs';

/**
 * Finds an available random port on localhost.
 * @returns {Promise<number>}
 */
export function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/**
 * Starts the Studio HTTP server on a free ephemeral port.
 * @returns {Promise<{ server: http.Server, port: number, base: string, stop: () => Promise<void> }>}
 */
export async function startStudioServer(configOverrides = {}) {
  const port = await getFreePort();
  const overrides = {
    PORT: port,
    HOST: '127.0.0.1',
    ...configOverrides,
  };
  const server = createServer(overrides);
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));

  const base = `http://127.0.0.1:${port}`;

  return {
    server,
    port,
    base,
    async stop() {
      await new Promise((r) => server.close(r));
    },
  };
}

/**
 * Starts a minimal fake AiPASS Bridge server for integration testing.
 * @param {Object} [handlers]
 * @returns {Promise<{ server: http.Server, port: number, base: string, stop: () => Promise<void> }>}
 */
export async function startFakeBridge(handlers = {}) {
  const port = await getFreePort();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);

    if (url.pathname === '/status') {
      if (handlers.onStatus) {
        handlers.onStatus(req, res);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(handlers.status ? handlers.status() : {
        ok: true,
        extensions: 1,
        defaultModel: 'gemini-3.1-flash-lite',
        credits: { available: 500, limit: 1000, remaining: 500, total: 1000 },
      }));
      return;
    }

    if (url.pathname === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(handlers.models ? handlers.models() : {
        data: [{ id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', kind: 'chat', free_credit: true }],
      }));
      return;
    }

    if (url.pathname === '/credits') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(handlers.credits ? handlers.credits() : { available: 500, limit: 1000, remaining: 500, total: 1000 }));
      return;
    }

    if (url.pathname === '/conversations/new' && req.method === 'POST') {
      let bodyStr = '';
      req.on('data', (c) => (bodyStr += c));
      req.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(bodyStr);
        } catch {}

        if (handlers.onConversationNew) {
          handlers.onConversationNew(req, res, parsed);
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, id: `temp-${Date.now()}`, temporary: true }));
        }
      });
      return;
    }

    if (url.pathname === '/v1/chat/completions' && req.method === 'POST') {
      if (handlers.onChat) {
        handlers.onChat(req, res);
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        });
        res.write('data: {"choices":[{"delta":{"content":"ข้อความทดสอบจาก Fake Bridge"}}]}\n\n');
        res.write('data: [DONE]\n\n');
        res.end();
      }
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${port}`;

  return {
    server,
    port,
    base,
    async stop() {
      await new Promise((r) => server.close(r));
    },
  };
}
