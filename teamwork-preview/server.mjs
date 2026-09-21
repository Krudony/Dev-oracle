/**
 * รู้ทันหนังสือราชการ — HTTP Server & Localhost Proxy
 * Zero-dependency pure Node.js ESM server.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CONFIG, getConfig, isAllowedHost, isAllowedOrigin } from './lib/config.mjs';
import { fetchBridgeStatus, fetchBridgeModels, fetchBridgeCredits } from './lib/bridge-client.mjs';
import { runSerialPipeline, retryRole } from './lib/orchestrator.mjs';
import { formatSseFrame } from './lib/sse-parser.mjs';
import { formatRunToMarkdown, formatRunToJson } from './lib/exporter.mjs';
import { MOCK_STATUS, MOCK_MODELS } from './lib/mock-bridge.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

/**
 * Sets strict security headers.
 * Never uses Access-Control-Allow-Origin: *
 */
function setSecurityHeaders(res, origin = '') {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Vary', 'Origin');

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
}

/**
 * Reads request body as JSON with size limit (up to 10MB for base64 file payloads + envelope).
 */
async function readJsonBody(req, limitBytes = 10 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let bytes = 0;
    let rejected = false;

    req.on('data', (chunk) => {
      if (rejected) return;
      bytes += chunk.length;
      if (bytes > limitBytes) {
        rejected = true;
        req.pause();
        req.resume();
        const err = new Error('Payload too large (Exceeded payload limit)');
        err.statusCode = 413;
        reject(err);
        return;
      }
      body += chunk;
    });

    req.on('end', () => {
      if (rejected) return;
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        const parseErr = new Error('Invalid JSON');
        parseErr.statusCode = 400;
        reject(parseErr);
      }
    });

    req.on('error', (err) => {
      if (!rejected) reject(err);
    });
  });
}

/**
 * Validates goal input.
 * Enforces string type, max 10,000 characters, and presence unless attachment provided.
 * @param {string} [goal]
 * @param {boolean} [hasAttachment=false]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateGoal(goal, hasAttachment = false) {
  if (!goal && !hasAttachment) {
    return { valid: false, error: 'กรุณาระบุข้อความหรือแนบเอกสารราชการ (Goal or attachment required)' };
  }
  if (goal !== undefined && goal !== null) {
    if (typeof goal !== 'string') {
      return { valid: false, error: 'ข้อความเป้าหมายต้องเป็นข้อความตัวอักษร (Goal must be a string)' };
    }
    if (goal.length > 10000) {
      return { valid: false, error: 'ข้อความเป้าหมายยาวเกินกำหนด (สูงสุด 10,000 ตัวอักษร)' };
    }
  }
  return { valid: true };
}

/**
 * Validates uploaded attachment object.
 * Checks MIME type, dataUri format, and decoded base64 size (<= 5MB).
 * @param {Object} [attachment]
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateAttachment(attachment) {
  if (!attachment) return { valid: true };
  if (typeof attachment !== 'object' || Array.isArray(attachment)) {
    return { valid: false, error: 'ข้อมูลเอกสารแนบไม่ถูกต้อง (Attachment must be an object)' };
  }

  const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
  const rawMime = (attachment.mimeType || '').toLowerCase().trim();
  const normalizedMime = rawMime === 'image/jpg' ? 'image/jpeg' : rawMime;

  if (!allowedMimes.includes(rawMime)) {
    return { valid: false, error: `ประเภทไฟล์ไม่รองรับ (${attachment.mimeType || 'unknown'}) รองรับเฉพาะ PDF, PNG, JPG` };
  }

  if (typeof attachment.dataUri !== 'string') {
    return { valid: false, error: 'dataUri ของเอกสารแนบไม่ถูกต้อง' };
  }

  const commaIndex = attachment.dataUri.indexOf(',');
  if (commaIndex === -1) {
    return { valid: false, error: 'รูปแบบ Data-URI ของไฟล์แนบไม่ถูกต้อง (Missing data-uri separator)' };
  }

  const header = attachment.dataUri.slice(0, commaIndex).toLowerCase();
  if (!header.startsWith('data:') || !header.includes(';base64')) {
    return { valid: false, error: 'รูปแบบ Data-URI ของไฟล์แนบไม่ถูกต้อง ต้องเป็น base64 encoding' };
  }

  // Enforce MIME metadata matches data URI header
  const mimeMatch = header.match(/^data:([^;]+);base64/);
  if (!mimeMatch) {
    return { valid: false, error: 'รูปแบบ Data-URI ส่วนหัวไม่ถูกต้อง' };
  }
  const dataUriMime = mimeMatch[1].trim();
  const normalizedDataUriMime = dataUriMime === 'image/jpg' ? 'image/jpeg' : dataUriMime;

  if (normalizedDataUriMime !== normalizedMime) {
    return {
      valid: false,
      error: `MIME metadata (${attachment.mimeType}) ไม่ตรงกับ MIME ใน data URI (${dataUriMime})`,
    };
  }

  const base64Data = attachment.dataUri.slice(commaIndex + 1).replace(/\s/g, '');
  if (!base64Data) {
    return { valid: false, error: 'เนื้อหาไฟล์แนบว่างเปล่า' };
  }

  if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
    return { valid: false, error: 'ข้อมูล Base64 มีอักขระที่ไม่ถูกต้อง' };
  }

  const padding = base64Data.endsWith('==') ? 2 : base64Data.endsWith('=') ? 1 : 0;
  const decodedBytes = Math.floor((base64Data.length * 3) / 4) - padding;
  const maxBytes = 5 * 1024 * 1024; // 5MB

  if (decodedBytes > maxBytes) {
    return { valid: false, error: `ขนาดไฟล์เกินขีดจำกัด 5MB (ขนาดจริง: ${(decodedBytes / (1024 * 1024)).toFixed(2)} MB)` };
  }

  // Digital file signature (Magic bytes) inspection
  const sampleBuf = Buffer.from(base64Data.slice(0, 64), 'base64');
  if (normalizedMime === 'application/pdf') {
    if (sampleBuf.length < 5 || sampleBuf.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return { valid: false, error: 'เนื้อหาไฟล์ไม่ตรงกับลายเซ็นดิจิทัล (Magic bytes) ของไฟล์ PDF' };
    }
  } else if (normalizedMime === 'image/jpeg') {
    if (sampleBuf.length < 3 || sampleBuf[0] !== 0xFF || sampleBuf[1] !== 0xD8 || sampleBuf[2] !== 0xFF) {
      return { valid: false, error: 'เนื้อหาไฟล์ไม่ตรงกับลายเซ็นดิจิทัล (Magic bytes) ของไฟล์ JPEG' };
    }
  } else if (normalizedMime === 'image/png') {
    const isPng =
      sampleBuf.length >= 8 &&
      sampleBuf[0] === 0x89 &&
      sampleBuf[1] === 0x50 &&
      sampleBuf[2] === 0x4E &&
      sampleBuf[3] === 0x47 &&
      sampleBuf[4] === 0x0D &&
      sampleBuf[5] === 0x0A &&
      sampleBuf[6] === 0x1A &&
      sampleBuf[7] === 0x0A;
    if (!isPng) {
      return { valid: false, error: 'เนื้อหาไฟล์ไม่ตรงกับลายเซ็นดิจิทัล (Magic bytes) ของไฟล์ PNG' };
    }
  }

  return { valid: true };
}

/**
 * Serves static files safely from the public directory.
 */
function serveStaticFile(req, res, pathname) {
  setSecurityHeaders(res, req.headers.origin || '');
  const safePath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(PUBLIC_DIR, '.' + path.sep + path.normalize(safePath));
  const normalizedPublic = path.resolve(PUBLIC_DIR);

  if (!filePath.startsWith(normalizedPublic + path.sep) && filePath !== normalizedPublic) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Internal Server Error');
      }
      return;
    }

    setSecurityHeaders(res);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      // This local preview changes frequently; never leave the browser using
      // stale UI code after a fix or restart.
      'Cache-Control': 'no-store',
    });
    res.end(content);
  });
}

/**
 * Creates and starts the HTTP server.
 */
export function createServer(configOverrides = {}) {
  const runtimeConfig = getConfig(configOverrides);
  let isLiveLocked = false;

  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin || '';

    // Origin Enforcement & CSRF Preflight Guard: Reject untrusted external origins with 403 Forbidden
    if (origin && !isAllowedOrigin(origin)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Disallowed Origin' }));
      return;
    }

    setSecurityHeaders(res, origin);

    // DNS Rebinding Defense: Validate incoming Host and X-Forwarded-Host (both must be valid if present)
    const hostHeader = (req.headers.host || '').trim();
    const forwardedHost = (req.headers['x-forwarded-host'] || '').trim();

    if (!hostHeader || !isAllowedHost(hostHeader)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Invalid Host header' }));
      return;
    }

    if (forwardedHost && !isAllowedHost(forwardedHost)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden: Invalid Host header' }));
      return;
    }

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Bad Request: Malformed Host or URL' }));
      return;
    }
    const pathname = url.pathname;

    // CSRF Defense: Require Content-Type: application/json for all /api/ POST requests
    // Simple HTML forms cannot send application/json, blocking cross-origin CSRF exploits
    if (req.method === 'POST' && pathname.startsWith('/api/')) {
      const contentType = (req.headers['content-type'] || '').toLowerCase();
      if (!contentType.includes('application/json')) {
        res.writeHead(415, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unsupported Media Type: Content-Type must be application/json' }));
        return;
      }
    }

    try {
      // 1. Preflight status check
      if (req.method === 'GET' && (pathname === '/api/status' || pathname === '/api/readiness')) {
        const isDemo = url.searchParams.get('demo') === 'true';
        if (isDemo) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(MOCK_STATUS));
          return;
        }

        const status = await fetchBridgeStatus(runtimeConfig.AIPASS_BRIDGE_URL);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(status));
        return;
      }

      // 2. Models list
      if (req.method === 'GET' && pathname === '/api/models') {
        const isDemo = url.searchParams.get('demo') === 'true';
        if (isDemo) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(MOCK_MODELS));
          return;
        }

        const models = await fetchBridgeModels(runtimeConfig.AIPASS_BRIDGE_URL);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(models));
        return;
      }

      // 3. Credits
      if (req.method === 'GET' && pathname === '/api/credits') {
        const isDemo = url.searchParams.get('demo') === 'true';
        if (isDemo) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(MOCK_STATUS.credits));
          return;
        }

        const credits = await fetchBridgeCredits(runtimeConfig.AIPASS_BRIDGE_URL);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(credits));
        return;
      }

      // 4. Run Serial Multi-Role Pipeline (SSE streaming)
      if (req.method === 'POST' && (pathname === '/api/run' || pathname === '/api/analyze')) {
        const payload = await readJsonBody(req);
        const { goal, attachment, model, isDemo, simulateErrorAtRole, privacyConsent } = payload;

        const goalCheck = validateGoal(goal, !!attachment);
        if (!goalCheck.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: goalCheck.error }));
          return;
        }

        if (attachment) {
          const validation = validateAttachment(attachment);
          if (!validation.valid) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: validation.error }));
            return;
          }
        }

        if (privacyConsent !== true) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Privacy consent required: ผู้ใช้ต้องยืนยันความยินยอมด้านความเป็นส่วนตัวก่อนเริ่มวิเคราะห์',
          }));
          return;
        }

        const abortController = new AbortController();
        // Install this before the async readiness check. Otherwise a client
        // that disconnects during /status can leave the server running an
        // expensive pipeline with nobody listening for its response.
        res.once('close', () => {
          if (!res.writableEnded) {
            abortController.abort();
          }
        });

        const isLive = !(isDemo ?? false);
        if (isLive) {
          if (isLiveLocked) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Conflict: Another live analysis is currently running. AiPASS Bridge maintains a single global browser session. Please wait for the current analysis to finish.',
              code: 'CONCURRENT_LIVE_RUN_REJECTED',
            }));
            return;
          }
          isLiveLocked = true;

          const bridgeStatus = await fetchBridgeStatus(
            runtimeConfig.AIPASS_BRIDGE_URL,
            abortController.signal
          );
          if (abortController.signal.aborted) {
            isLiveLocked = false;
            return;
          }
          if (!bridgeStatus.ready) {
            isLiveLocked = false;
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: bridgeStatus.error || 'AiPASS Bridge is not ready with exactly one connected extension',
              code: bridgeStatus.code || 'AIPASS_NOT_READY',
              extensions: bridgeStatus.extensions,
            }));
            return;
          }
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        const sendEvent = (event, data) => {
          if (!res.writableEnded) {
            res.write(formatSseFrame(event, data));
          }
        };

        try {
          await runSerialPipeline({
            goal: goal || 'วิเคราะห์เอกสารราชการที่แนบมา',
            attachment: attachment || null,
            model,
            isDemo: isDemo ?? false,
            simulateErrorAtRole: simulateErrorAtRole || null,
            baseUrl: runtimeConfig.AIPASS_BRIDGE_URL,
            onEvent: sendEvent,
            signal: abortController.signal,
          });
        } catch (err) {
          sendEvent('error', { error: err.message, fatal: true });
        } finally {
          if (isLive) {
            isLiveLocked = false;
          }
          if (attachment && attachment.dataUri) {
            attachment.dataUri = null;
          }
          if (!res.writableEnded) {
            res.end();
          }
        }
        return;
      }

      // 5. Retry a specific role
      if (req.method === 'POST' && pathname === '/api/retry') {
        const payload = await readJsonBody(req);
        const { roleId, goal, attachment, stepsSoFar, model, isDemo, privacyConsent } = payload;

        if (!roleId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'roleId is required' }));
          return;
        }

        const goalCheck = validateGoal(goal, !!attachment);
        if (!goalCheck.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: goalCheck.error }));
          return;
        }

        if (attachment) {
          const validation = validateAttachment(attachment);
          if (!validation.valid) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: validation.error }));
            return;
          }
        }

        if (privacyConsent !== true) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: 'Privacy consent required: ผู้ใช้ต้องยืนยันความยินยอมด้านความเป็นส่วนตัวก่อนเริ่มวิเคราะห์',
          }));
          return;
        }

        const abortController = new AbortController();
        res.once('close', () => {
          if (!res.writableEnded) {
            abortController.abort();
          }
        });

        const isLive = !(isDemo ?? false);
        if (isLive) {
          if (isLiveLocked) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: 'Conflict: Another live analysis is currently running. AiPASS Bridge maintains a single global browser session. Please wait for the current analysis to finish.',
              code: 'CONCURRENT_LIVE_RUN_REJECTED',
            }));
            return;
          }
          isLiveLocked = true;

          const bridgeStatus = await fetchBridgeStatus(
            runtimeConfig.AIPASS_BRIDGE_URL,
            abortController.signal
          );
          if (abortController.signal.aborted) {
            isLiveLocked = false;
            return;
          }
          if (!bridgeStatus.ready) {
            isLiveLocked = false;
            res.writeHead(503, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: bridgeStatus.error || 'AiPASS Bridge is not ready with exactly one connected extension',
              code: bridgeStatus.code || 'AIPASS_NOT_READY',
              extensions: bridgeStatus.extensions,
            }));
            return;
          }
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        const sendEvent = (event, data) => {
          if (!res.writableEnded) {
            res.write(formatSseFrame(event, data));
          }
        };

        try {
          await retryRole({
            roleId,
            goal: goal || 'วิเคราะห์เอกสารราชการที่แนบมา',
            attachment: attachment || null,
            stepsSoFar: stepsSoFar || {},
            model,
            isDemo: isDemo ?? false,
            baseUrl: runtimeConfig.AIPASS_BRIDGE_URL,
            onEvent: sendEvent,
            signal: abortController.signal,
          });
        } catch (err) {
          sendEvent('error', { error: err.message, fatal: true });
        } finally {
          if (isLive) {
            isLiveLocked = false;
          }
          if (attachment && attachment.dataUri) {
            attachment.dataUri = null;
          }
          if (!res.writableEnded) {
            res.end();
          }
        }
        return;
      }

      // 6. Export report
      if (req.method === 'POST' && pathname === '/api/export') {
        const payload = await readJsonBody(req);
        const { run, format } = payload;

        if (!run) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Run payload is required' }));
          return;
        }

        if (format === 'json') {
          res.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Disposition': 'attachment; filename="official-doc-report.json"',
          });
          res.end(formatRunToJson(run));
        } else {
          res.writeHead(200, {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Content-Disposition': 'attachment; filename="official-doc-report.md"',
          });
          res.end(formatRunToMarkdown(run));
        }
        return;
      }

      // 7. Static file serving (Fallback to UI)
      if (req.method === 'GET') {
        serveStaticFile(req, res, pathname);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found' }));
    } catch (err) {
      if (!res.headersSent && !res.writableEnded) {
        const statusCode = err.statusCode || (
          err.message.includes('Payload too large')
            ? 413
            : err.message.includes('Invalid JSON')
            ? 400
            : 500
        );
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
      }
    }
  });

  server.isLiveLocked = () => isLiveLocked;
  server.getConfig = () => runtimeConfig;
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createServer();
  const conf = server.getConfig();
  server.listen(conf.PORT, conf.HOST, () => {
    console.log(`====================================================`);
    console.log(`📜 รู้ทันหนังสือราชการ (Thai Official Document Explainer)`);
    console.log(`👉 UI Address : http://${conf.HOST}:${conf.PORT}`);
    console.log(`🔗 Upstream   : ${conf.AIPASS_BRIDGE_URL}`);
    console.log(`🔒 Security   : Localhost-only (DNS Rebinding Guarded)`);
    console.log(`====================================================`);
  });
}
