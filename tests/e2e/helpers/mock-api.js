import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PAGE_PATH = path.resolve(__dirname, '..', 'fixtures', 'test-page.html');

export function createMockApi() {
  const queue = [];
  let defaultCorrection = 'I have a correct sentence.';
  let requestLog = [];

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const parsed = body ? safeParse(body) : null;
      requestLog.push({ method: req.method, url: req.url, body: parsed });

      setCorsHeaders(res);

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.url === '/' || req.url === '/test-page') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(fs.readFileSync(TEST_PAGE_PATH, 'utf8'));
        return;
      }

      if (queue.length > 0) {
        queue.shift()(req, res, parsed);
        return;
      }

      if (req.url === '/v1/models' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: [{ id: 'test-model' }, { id: 'gpt-4o-mini' }] }));
        return;
      }

      if (req.url === '/v1/chat/completions' && req.method === 'POST') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            choices: [{ message: { content: defaultCorrection } }],
          }),
        );
        return;
      }

      res.writeHead(404);
      res.end('Not Found');
    });
  });

  return {
    start() {
      return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve(server.address().port));
      });
    },

    stop() {
      return new Promise((resolve) => server.close(resolve));
    },

    get port() {
      return server.address()?.port;
    },

    get baseUrl() {
      return `http://127.0.0.1:${this.port}`;
    },

    get apiUrl() {
      return `${this.baseUrl}/v1`;
    },

    get testPageUrl() {
      return this.baseUrl;
    },

    setDefaultCorrection(text) {
      defaultCorrection = text;
    },

    enqueue(handler) {
      queue.push(handler);
    },

    enqueueResponse(corrected) {
      queue.push((_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ choices: [{ message: { content: corrected } }] }));
      });
    },

    enqueueError(statusCode, message) {
      queue.push((_req, res) => {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message } }));
      });
    },

    enqueueDelay(ms, corrected) {
      queue.push((_req, res) => {
        setTimeout(() => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ choices: [{ message: { content: corrected } }] }));
        }, ms);
      });
    },

    getRequests() {
      return [...requestLog];
    },

    clearRequests() {
      requestLog = [];
    },

    getGrammarRequests() {
      return requestLog.filter((r) => r.url === '/v1/chat/completions');
    },
  };
}

function setCorsHeaders(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access',
  );
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
