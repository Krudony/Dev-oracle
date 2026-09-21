import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

import { startStudioServer, startFakeBridge } from '../harness.mjs';
import { isAllowedHost, isAllowedOrigin } from '../../lib/config.mjs';
import { validateAttachment, validateGoal } from '../../server.mjs';

/**
 * Helper to make a raw HTTP request with exact headers preserved over the wire.
 * This avoids fetch/undici silently stripping/overriding forbidden headers like 'Host'.
 */
function rawHttpRequest({ hostname, port, path = '/', headers = {} }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname,
        port,
        path,
        method: 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(body);
          } catch {}
          resolve({ status: res.statusCode, headers: res.headers, body, json });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

test('proxy - isAllowedHost unit validation', () => {
  // Allowed loopback hosts
  assert.equal(isAllowedHost('127.0.0.1'), true);
  assert.equal(isAllowedHost('127.0.0.1:8788'), true);
  assert.equal(isAllowedHost('localhost'), true);
  assert.equal(isAllowedHost('localhost:8788'), true);
  assert.equal(isAllowedHost('::1'), true);
  assert.equal(isAllowedHost('[::1]:8788'), true);

  // Rejected external / rebinding domains
  assert.equal(isAllowedHost('evil-attacker.com'), false);
  assert.equal(isAllowedHost('evil-attacker.com:8788'), false);
  assert.equal(isAllowedHost('attacker.org'), false);
  assert.equal(isAllowedHost('192.168.1.1'), false);
  assert.equal(isAllowedHost('10.0.0.1'), false);
  assert.equal(isAllowedHost('localhost.attacker.com'), false);
  assert.equal(isAllowedHost(''), false);
  assert.equal(isAllowedHost(null), false);

  // Rejected malformed hosts with non-numeric ports or invalid bracket syntax
  assert.equal(isAllowedHost('localhost:evil'), false);
  assert.equal(isAllowedHost('[::1]evil'), false);
  assert.equal(isAllowedHost('[::1]:evil'), false);
  assert.equal(isAllowedHost('[::1]:99999'), false);
  assert.equal(isAllowedHost('127.0.0.1:0'), false);
  assert.equal(isAllowedHost('127.0.0.1:evil'), false);
});

test('proxy - DNS Rebinding Defense rejects unauthorized Host headers over raw HTTP', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // Test 1: Raw Host header set to evil-attacker.com
  const res1 = await rawHttpRequest({
    hostname: '127.0.0.1',
    port: studio.port,
    path: '/api/status',
    headers: {
      Host: 'evil-attacker.com',
    },
  });

  assert.equal(res1.status, 403, 'Must reject unauthorized Host with 403 Forbidden');
  assert.match(res1.json?.error || res1.body, /Invalid Host/);

  // Test 2: Raw Host header with port set to attacker.org:8788
  const res2 = await rawHttpRequest({
    hostname: '127.0.0.1',
    port: studio.port,
    path: '/api/status',
    headers: {
      Host: `attacker.org:${studio.port}`,
    },
  });

  assert.equal(res2.status, 403, 'Must reject unauthorized Host with port with 403 Forbidden');

  // Test 3: X-Forwarded-Host injection attempt
  const res3 = await rawHttpRequest({
    hostname: '127.0.0.1',
    port: studio.port,
    path: '/api/status',
    headers: {
      Host: `127.0.0.1:${studio.port}`,
      'X-Forwarded-Host': 'evil-attacker.com',
    },
  });

  assert.equal(res3.status, 403, 'Must reject spoofed X-Forwarded-Host with 403 Forbidden');

  // Test 4: Attacker tries bypass with Host: evil-attacker.com and X-Forwarded-Host: localhost
  const res4 = await rawHttpRequest({
    hostname: '127.0.0.1',
    port: studio.port,
    path: '/api/status',
    headers: {
      Host: 'evil-attacker.com',
      'X-Forwarded-Host': 'localhost',
    },
  });

  assert.equal(res4.status, 403, 'Must reject evil Host even if X-Forwarded-Host is localhost');

  // Test 5: Malformed Host header with non-numeric port (localhost:evil)
  const res5 = await rawHttpRequest({
    hostname: '127.0.0.1',
    port: studio.port,
    path: '/api/status',
    headers: {
      Host: 'localhost:evil',
    },
  });
  assert.equal(res5.status === 400 || res5.status === 403, true, 'Must reject malformed host localhost:evil');

  // Test 6: Malformed IPv6 bracket syntax ([::1]evil)
  const res6 = await rawHttpRequest({
    hostname: '127.0.0.1',
    port: studio.port,
    path: '/api/status',
    headers: {
      Host: '[::1]evil',
    },
  });
  assert.equal(res6.status === 400 || res6.status === 403, true, 'Must reject malformed host [::1]evil');
});

test('proxy - Valid Host header passes through successfully', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await rawHttpRequest({
    hostname: '127.0.0.1',
    port: studio.port,
    path: '/api/status?demo=true',
    headers: {
      Host: `127.0.0.1:${studio.port}`,
    },
  });

  assert.equal(res.status, 200);
  assert.equal(res.json?.ok, true);
  assert.equal(res.json?.mode, 'demo');
});

test('proxy - isAllowedOrigin unit validation', () => {
  assert.equal(isAllowedOrigin('http://localhost:8788'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1:8788'), true);
  assert.equal(isAllowedOrigin('http://localhost'), true);
  assert.equal(isAllowedOrigin('http://127.0.0.1'), true);
  assert.equal(isAllowedOrigin('http://[::1]:8788'), true);

  // Spoofing attempts must be rejected
  assert.equal(isAllowedOrigin('http://localhost.attacker.com'), false);
  assert.equal(isAllowedOrigin('http://127.0.0.1.attacker.com'), false);
  assert.equal(isAllowedOrigin('http://malicious-site.com'), false);
  assert.equal(isAllowedOrigin('https://attacker.org'), false);
  assert.equal(isAllowedOrigin(''), false);
  assert.equal(isAllowedOrigin(null), false);
});

test('proxy - CORS policy never uses wildcard * and blocks origin spoofing', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // 1. Completely untrusted domain
  const res1 = await fetch(`${studio.base}/api/status?demo=true`, {
    headers: { Origin: 'http://malicious-site.com' },
  });
  const cors1 = res1.headers.get('access-control-allow-origin');
  assert.notEqual(cors1, '*', 'Must never return wildcard CORS');
  assert.equal(cors1, null, 'Must not set CORS header for untrusted origin');

  // 2. Subdomain spoofing attempt (localhost.attacker.com)
  const res2 = await fetch(`${studio.base}/api/status?demo=true`, {
    headers: { Origin: 'http://localhost.attacker.com' },
  });
  const cors2 = res2.headers.get('access-control-allow-origin');
  assert.notEqual(cors2, '*', 'Must never return wildcard CORS');
  assert.equal(cors2, null, 'Must not set CORS header for spoofed localhost subdomain');

  // 3. IP prefix spoofing attempt (127.0.0.1.attacker.com)
  const res3 = await fetch(`${studio.base}/api/status?demo=true`, {
    headers: { Origin: 'http://127.0.0.1.attacker.com' },
  });
  const cors3 = res3.headers.get('access-control-allow-origin');
  assert.equal(cors3, null, 'Must not set CORS header for spoofed IP subdomain');

  // 4. Legitimate local origin passes with Vary: Origin
  const res4 = await fetch(`${studio.base}/api/status?demo=true`, {
    headers: { Origin: `http://127.0.0.1:${studio.port}` },
  });
  const cors4 = res4.headers.get('access-control-allow-origin');
  assert.equal(cors4, `http://127.0.0.1:${studio.port}`);
  assert.match(res4.headers.get('vary') || '', /Origin/);
});

test('proxy - /api/models returns model catalog in demo mode', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/models?demo=true`);
  assert.equal(res.status, 200);
  const models = await res.json();

  assert.ok(Array.isArray(models));
  assert.ok(models.length > 0);
  assert.ok(models.some((m) => m.id === 'gemini-3.1-flash-lite'));
});

test('proxy - /api/credits returns credit allocation in demo mode', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/credits?demo=true`);
  assert.equal(res.status, 200);
  const credits = await res.json();

  assert.ok(credits.remaining > 0);
});

test('proxy - Static file serving serves HTML, CSS, and JS safely', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // Root index.html
  const htmlRes = await fetch(`${studio.base}/`);
  assert.equal(htmlRes.status, 200);
  assert.match(htmlRes.headers.get('content-type'), /text\/html/);
  const htmlText = await htmlRes.text();
  assert.match(htmlText, /รู้ทันหนังสือราชการ/);

  // CSS
  const cssRes = await fetch(`${studio.base}/style.css`);
  assert.equal(cssRes.status, 200);
  assert.match(cssRes.headers.get('content-type'), /text\/css/);

  // JS
  const jsRes = await fetch(`${studio.base}/app.js`);
  assert.equal(jsRes.status, 200);
  assert.match(jsRes.headers.get('content-type'), /application\/javascript/);
});

test('proxy - Directory traversal attack is blocked', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/../../package.json`);
  assert.equal(res.status === 403 || res.status === 404, true);
});

test('proxy - validateAttachment unit validation', () => {
  // Empty/null is allowed
  assert.equal(validateAttachment(null).valid, true);
  assert.equal(validateAttachment(undefined).valid, true);

  // Invalid types
  assert.equal(validateAttachment('string').valid, false);
  assert.equal(validateAttachment([]).valid, false);

  // Disallowed MIME types
  assert.equal(validateAttachment({ mimeType: 'text/html', dataUri: 'data:text/html;base64,PHA+' }).valid, false);
  assert.equal(validateAttachment({ mimeType: 'application/x-sh', dataUri: 'data:application/x-sh;base64,ZWNobyAx' }).valid, false);
  assert.equal(validateAttachment({ mimeType: 'application/octet-stream', dataUri: 'data:application/octet-stream;base64,AAAA' }).valid, false);

  // Malformed dataUri
  assert.equal(validateAttachment({ mimeType: 'application/pdf', dataUri: 'not-a-data-uri' }).valid, false);
  assert.equal(validateAttachment({ mimeType: 'application/pdf', dataUri: 'data:application/pdf;utf8,hello' }).valid, false);
  assert.equal(validateAttachment({ mimeType: 'application/pdf', dataUri: 'data:application/pdf;base64,' }).valid, false);
  assert.equal(validateAttachment({ mimeType: 'application/pdf', dataUri: 'data:application/pdf;base64,@@@invalid@@@' }).valid, false);

  // Oversized decoded data (> 5MB)
  // Prepend valid PDF signature so it passes magic bytes and tests the size check
  const hugeBuffer = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.alloc(5 * 1024 * 1024 + 10, 'A'),
  ]);
  const hugeBase64 = hugeBuffer.toString('base64');
  const oversizedAttachment = {
    mimeType: 'application/pdf',
    dataUri: `data:application/pdf;base64,${hugeBase64}`,
  };
  const oversizedResult = validateAttachment(oversizedAttachment);
  assert.equal(oversizedResult.valid, false);
  assert.match(oversizedResult.error, /5MB/);

  // MIME metadata mismatch with data URI prefix
  const mismatchResult = validateAttachment({
    mimeType: 'application/pdf',
    dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  });
  assert.equal(mismatchResult.valid, false);
  assert.match(mismatchResult.error, /ไม่ตรงกับ MIME/);

  // Invalid file signature (Magic bytes)
  const fakePdfResult = validateAttachment({
    mimeType: 'application/pdf',
    dataUri: 'data:application/pdf;base64,bm90LXByZi1maWxlCg==', // does not start with %PDF-
  });
  assert.equal(fakePdfResult.valid, false);
  assert.match(fakePdfResult.error, /ลายเซ็นดิจิทัล/);

  const fakeJpgResult = validateAttachment({
    mimeType: 'image/jpeg',
    dataUri: 'data:image/jpeg;base64,bm90LWpwZwo=',
  });
  assert.equal(fakeJpgResult.valid, false);
  assert.match(fakeJpgResult.error, /ลายเซ็นดิจิทัล/);

  const fakePngResult = validateAttachment({
    mimeType: 'image/png',
    dataUri: 'data:image/png;base64,bm90LXBuZwo=',
  });
  assert.equal(fakePngResult.valid, false);
  assert.match(fakePngResult.error, /ลายเซ็นดิจิทัล/);

  // Valid PDF
  const validPdf = {
    mimeType: 'application/pdf',
    dataUri: 'data:application/pdf;base64,JVBERi0xLjQKJXRlc3QK',
  };
  assert.equal(validateAttachment(validPdf).valid, true);

  // Valid PNG & JPEG
  assert.equal(validateAttachment({
    mimeType: 'image/png',
    dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  }).valid, true);
  assert.equal(validateAttachment({
    mimeType: 'image/jpeg',
    dataUri: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  }).valid, true);
});

test('proxy - /api/run rejects invalid attachment MIME type with HTTP 400', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'ทดสอบอัปโหลดไฟล์ HTML อันตราย',
      attachment: {
        filename: 'malicious.html',
        mimeType: 'text/html',
        dataUri: 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
      },
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /ประเภทไฟล์ไม่รองรับ/);
});

test('proxy - /api/run rejects malformed dataUri with HTTP 400', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'ทดสอบ Data-URI ผิดรูปแบบ',
      attachment: {
        filename: 'broken.pdf',
        mimeType: 'application/pdf',
        dataUri: 'http://evil.com/fake.pdf',
      },
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /Data-URI/);
});

test('proxy - /api/run rejects oversized attachment (> 5MB) with HTTP 400', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const hugeBase64 = Buffer.concat([
    Buffer.from('%PDF-1.4\n'),
    Buffer.alloc(5 * 1024 * 1024 + 50, 'Z'),
  ]).toString('base64');
  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'ทดสอบไฟล์ขนาดเกิน 5MB',
      attachment: {
        filename: 'huge.pdf',
        mimeType: 'application/pdf',
        dataUri: `data:application/pdf;base64,${hugeBase64}`,
      },
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /5MB/);
});

test('proxy - /api/run rejects attachment with MIME metadata mismatch over HTTP with HTTP 400', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'ทดสอบ MIME mismatch',
      privacyConsent: true,
      attachment: {
        filename: 'fake.pdf',
        mimeType: 'application/pdf',
        dataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      },
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /ไม่ตรงกับ MIME/);
});

test('proxy - /api/run rejects attachment with invalid digital file signature (magic bytes) over HTTP with HTTP 400', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'ทดสอบ fake signature',
      privacyConsent: true,
      attachment: {
        filename: 'fake.pdf',
        mimeType: 'application/pdf',
        dataUri: 'data:application/pdf;base64,bm90LXByZi1maWxlCg==',
      },
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /ลายเซ็นดิจิทัล/);
});

test('proxy - /api/retry also enforces attachment validation', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleId: 'interpreter',
      goal: 'ทดสอบ retry พร้อมไฟล์ผิดประเภท',
      attachment: {
        filename: 'shell.sh',
        mimeType: 'application/x-sh',
        dataUri: 'data:application/x-sh;base64,cm0gLXJmIC8=',
      },
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /ประเภทไฟล์ไม่รองรับ/);
});

test('proxy - /api/run and /api/retry reject untrusted Origin header with HTTP 403', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // Subdomain spoofing attempt
  const res1 = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://localhost.attacker.com',
    },
    body: JSON.stringify({ goal: 'ทดสอบ', isDemo: true, privacyConsent: true }),
  });

  assert.equal(res1.status, 403, 'Must reject untrusted Origin with 403');
  const data1 = await res1.json();
  assert.match(data1.error, /Origin/);

  // External malicious origin attempt on retry
  const res2 = await fetch(`${studio.base}/api/retry`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'http://malicious.org',
    },
    body: JSON.stringify({ roleId: 'interpreter', goal: 'ทดสอบ', isDemo: true, privacyConsent: true }),
  });

  assert.equal(res2.status, 403, 'Must reject untrusted Origin on retry with 403');

  // Preflight OPTIONS with disallowed origin must also be rejected with 403
  const resOptions = await fetch(`${studio.base}/api/run`, {
    method: 'OPTIONS',
    headers: { Origin: 'http://evil-attacker.com' },
  });
  assert.equal(resOptions.status, 403, 'Preflight OPTIONS with disallowed Origin must return 403');
});

test('proxy - CSRF Defense: /api/* POST requires application/json and rejects other media types with HTTP 415', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // 1. Form submission (application/x-www-form-urlencoded) CSRF attack attempt
  const res1 = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'goal=hack&privacyConsent=true',
  });
  assert.equal(res1.status, 415, 'Must reject form-urlencoded with 415 Unsupported Media Type');
  const data1 = await res1.json();
  assert.match(data1.error, /application\/json/);

  // 2. text/plain CSRF attack attempt
  const res2 = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: '{"goal":"hack"}',
  });
  assert.equal(res2.status, 415, 'Must reject text/plain with 415 Unsupported Media Type');

  // 3. Missing Content-Type
  const res3 = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    body: '{"goal":"hack"}',
  });
  assert.equal(res3.status, 415, 'Must reject missing Content-Type with 415');
});

test('proxy - validateGoal unit validation and limit checks', async (t) => {
  assert.equal(validateGoal('ข้อความปกติ', false).valid, true);
  assert.equal(validateGoal('', true).valid, true, 'Empty goal is allowed if attachment is provided');
  assert.equal(validateGoal('', false).valid, false, 'Empty goal disallowed if no attachment');
  assert.equal(validateGoal(12345, false).valid, false, 'Non-string disallowed');

  const longGoal = 'ก'.repeat(10001);
  assert.equal(validateGoal(longGoal, false).valid, false, 'Goal > 10,000 characters disallowed');
});

test('proxy - /api/run rejects goal exceeding 10,000 characters with HTTP 400', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  const longGoal = 'ก'.repeat(10005);
  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: longGoal,
      privacyConsent: true,
      isDemo: true,
    }),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.match(data.error, /10,000/);
});

test('proxy - /api/run and /api/retry enforce privacy consent with HTTP 400', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // 1. Missing privacyConsent on /api/run
  const res1 = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'ทดสอบ', isDemo: true }),
  });
  assert.equal(res1.status, 400);
  const data1 = await res1.json();
  assert.match(data1.error, /Privacy consent required/);

  // 2. privacyConsent: false on /api/run
  const res2 = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal: 'ทดสอบ', isDemo: true, privacyConsent: false }),
  });
  assert.equal(res2.status, 400);
  const data2 = await res2.json();
  assert.match(data2.error, /Privacy consent required/);

  // 3. Missing privacyConsent on /api/retry
  const res3 = await fetch(`${studio.base}/api/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId: 'interpreter', goal: 'ทดสอบ', isDemo: true }),
  });
  assert.equal(res3.status, 400);
  const data3 = await res3.json();
  assert.match(data3.error, /Privacy consent required/);
});

test('proxy - Request body exceeding 10MB returns HTTP 413 Payload Too Large as clean JSON', async (t) => {
  const studio = await startStudioServer();
  t.after(() => studio.stop());

  // Construct payload > 10MB
  const hugeData = 'A'.repeat(10 * 1024 * 1024 + 1024);
  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: hugeData,
      privacyConsent: true,
      isDemo: true,
    }),
  });

  assert.equal(res.status, 413, 'Must return HTTP 413 without destroying socket');
  const data = await res.json();
  assert.match(data.error, /Payload too large/);
});

test('proxy - live run fails closed before streaming when duplicate AiPASS extensions are connected', async (t) => {
  let conversationCalls = 0;
  let chatCalls = 0;
  const fakeBridge = await startFakeBridge({
    status: () => ({ ok: true, extensions: 2 }),
    onConversationNew: () => { conversationCalls += 1; },
    onChat: () => { chatCalls += 1; },
  });
  t.after(() => fakeBridge.stop());

  const studio = await startStudioServer({ AIPASS_BRIDGE_URL: fakeBridge.base });
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'ทดสอบไม่ให้ข้อความจาก extension ซ้ำ',
      isDemo: false,
      privacyConsent: true,
    }),
  });

  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.code, 'MULTIPLE_AIPASS_EXTENSIONS');
  assert.equal(data.extensions, 2);
  assert.equal(conversationCalls, 0, 'Must reject before creating a conversation');
  assert.equal(chatCalls, 0, 'Must reject before consuming credits');
  assert.equal(studio.server.isLiveLocked(), false, 'Must release the live mutex');
});

test('proxy - live retry also fails closed when duplicate AiPASS extensions are connected', async (t) => {
  let conversationCalls = 0;
  const fakeBridge = await startFakeBridge({
    status: () => ({ ok: true, extensions: 2 }),
    onConversationNew: () => { conversationCalls += 1; },
  });
  t.after(() => fakeBridge.stop());

  const studio = await startStudioServer({ AIPASS_BRIDGE_URL: fakeBridge.base });
  t.after(() => studio.stop());

  const res = await fetch(`${studio.base}/api/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleId: 'interpreter',
      goal: 'ลองวิเคราะห์ใหม่',
      stepsSoFar: {},
      isDemo: false,
      privacyConsent: true,
    }),
  });

  assert.equal(res.status, 503);
  const data = await res.json();
  assert.equal(data.code, 'MULTIPLE_AIPASS_EXTENSIONS');
  assert.equal(conversationCalls, 0);
  assert.equal(studio.server.isLiveLocked(), false);
});

test('proxy - disconnect during delayed readiness aborts run/retry before any upstream work', async () => {
  for (const pathname of ['/api/run', '/api/retry']) {
    let markStatusStarted;
    const statusStarted = new Promise((resolve) => { markStatusStarted = resolve; });
    let conversationCalls = 0;
    let chatCalls = 0;

    const fakeBridge = await startFakeBridge({
      onStatus: (req, res) => {
        markStatusStarted();
        setTimeout(() => {
          if (res.destroyed) return;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, extensions: 1 }));
        }, 300);
      },
      onConversationNew: (req, res) => {
        conversationCalls += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: 'must-not-exist', temporary: true }));
      },
      onChat: (req, res) => {
        chatCalls += 1;
        res.writeHead(500);
        res.end();
      },
    });
    const studio = await startStudioServer({ AIPASS_BRIDGE_URL: fakeBridge.base });

    const body = {
      goal: 'ยกเลิกระหว่างตรวจความพร้อม',
      isDemo: false,
      privacyConsent: true,
      ...(pathname === '/api/retry' ? { roleId: 'interpreter', stepsSoFar: {} } : {}),
    };
    const req = http.request(`${studio.base}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    req.on('error', () => {});
    req.end(JSON.stringify(body));

    await statusStarted;
    assert.equal(studio.server.isLiveLocked(), true, `${pathname} must hold the mutex during readiness`);
    req.destroy();

    const deadline = Date.now() + 1000;
    while (studio.server.isLiveLocked() && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    // Wait beyond the delayed response to prove it cannot resume the pipeline.
    await new Promise((resolve) => setTimeout(resolve, 350));

    assert.equal(studio.server.isLiveLocked(), false, `${pathname} must release the mutex after disconnect`);
    assert.equal(conversationCalls, 0, `${pathname} must not create a conversation after disconnect`);
    assert.equal(chatCalls, 0, `${pathname} must not call chat after disconnect`);

    await studio.stop();
    await fakeBridge.stop();
  }
});

test('proxy - rejects concurrent live /api/run with HTTP 409 Conflict', async (t) => {
  let releaseFirstCall;
  let markConversationStarted;
  const conversationStarted = new Promise((resolve) => { markConversationStarted = resolve; });
  const fakeBridge = await startFakeBridge({
    onConversationNew: async (req, res) => {
      markConversationStarted();
      await new Promise((r) => { releaseFirstCall = r; });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: 'temp-1', temporary: true }));
    },
  });
  t.after(() => fakeBridge.stop());

  const studio = await startStudioServer({ AIPASS_BRIDGE_URL: fakeBridge.base });
  t.after(() => studio.stop());

  // 1. Send first live run request (hangs waiting for fakeBridge)
  const req1Promise = fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'งานวิเคราะห์ที่ 1 (Live)',
      isDemo: false,
      privacyConsent: true,
    }),
  });

  // Await deterministic entry into bridge handler holding live lock
  await conversationStarted;

  assert.equal(studio.server.isLiveLocked(), true, 'Live lock must be active');

  // 2. Send second live run request while first is still running
  const res2 = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'งานวิเคราะห์ที่ 2 (Live Concurrent)',
      isDemo: false,
      privacyConsent: true,
    }),
  });

  assert.equal(res2.status, 409, 'Second concurrent live run must be rejected with 409 Conflict');
  const errData = await res2.json();
  assert.match(errData.error, /Conflict: Another live analysis is currently running/);
  assert.equal(errData.code, 'CONCURRENT_LIVE_RUN_REJECTED');

  // 3. Release first request and let it finish
  releaseFirstCall();
  const res1 = await req1Promise;
  assert.equal(res1.status, 200);
  await res1.text();

  // 4. Verify lock is released
  assert.equal(studio.server.isLiveLocked(), false, 'Live lock must be released after completion');
});

test('proxy - rejects concurrent live /api/retry while live run is in progress with HTTP 409', async (t) => {
  let releaseFirstCall;
  let markConversationStarted;
  const conversationStarted = new Promise((resolve) => { markConversationStarted = resolve; });
  const fakeBridge = await startFakeBridge({
    onConversationNew: async (req, res) => {
      markConversationStarted();
      await new Promise((r) => { releaseFirstCall = r; });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: 'temp-retry-1', temporary: true }));
    },
  });
  t.after(() => fakeBridge.stop());

  const studio = await startStudioServer({ AIPASS_BRIDGE_URL: fakeBridge.base });
  t.after(() => studio.stop());

  const req1Promise = fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'งานวิเคราะห์ที่ 1 (Live)',
      isDemo: false,
      privacyConsent: true,
    }),
  });

  await conversationStarted;

  // Try to call /api/retry live while run is running
  const resRetry = await fetch(`${studio.base}/api/retry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roleId: 'interpreter',
      goal: 'ลองใหม่ขั้นตอนแรก',
      isDemo: false,
      privacyConsent: true,
    }),
  });

  assert.equal(resRetry.status, 409, 'Live retry must be rejected with 409 while live run is running');
  const errData = await resRetry.json();
  assert.match(errData.error, /Conflict: Another live analysis is currently running/);

  releaseFirstCall();
  const res1 = await req1Promise;
  await res1.text();
  assert.equal(studio.server.isLiveLocked(), false, 'Live lock must be released');
});

test('proxy - mock runs (isDemo: true) are not blocked by live lock', async (t) => {
  let releaseFirstCall;
  let markConversationStarted;
  const conversationStarted = new Promise((resolve) => { markConversationStarted = resolve; });
  const fakeBridge = await startFakeBridge({
    onConversationNew: async (req, res) => {
      markConversationStarted();
      await new Promise((r) => { releaseFirstCall = r; });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, id: 'temp-demo-test', temporary: true }));
    },
  });
  t.after(() => fakeBridge.stop());

  const studio = await startStudioServer({ AIPASS_BRIDGE_URL: fakeBridge.base });
  t.after(() => studio.stop());

  const req1Promise = fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'งานวิเคราะห์สด',
      isDemo: false,
      privacyConsent: true,
    }),
  });

  await conversationStarted;

  // Mock run should still succeed even when live run is locked
  const resMock = await fetch(`${studio.base}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      goal: 'งานจำลอง (Mock)',
      isDemo: true,
      privacyConsent: true,
    }),
  });

  assert.equal(resMock.status, 200, 'Mock run should not be blocked by live lock');
  await resMock.text();

  releaseFirstCall();
  const res1 = await req1Promise;
  await res1.text();
});

test('proxy - cancelling a live SSE response aborts upstream work and releases the mutex', async (t) => {
  let upstreamClosed = false;
  let markUpstreamStarted;
  const upstreamStarted = new Promise((resolve) => { markUpstreamStarted = resolve; });
  const fakeBridge = await startFakeBridge({
    onChat: (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      });
      res.write('data: {"choices":[{"delta":{"content":"เริ่มวิเคราะห์"}}]}\n\n');
      res.on('close', () => { upstreamClosed = true; });
      markUpstreamStarted();
    },
  });
  t.after(() => fakeBridge.stop());

  const studio = await startStudioServer({ AIPASS_BRIDGE_URL: fakeBridge.base });
  t.after(() => studio.stop());

  const requestBody = JSON.stringify({
      goal: 'ทดสอบยกเลิกงานสด',
      isDemo: false,
      privacyConsent: true,
  });
  const client = await new Promise((resolve, reject) => {
    const req = http.request(`${studio.base}/api/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    }, (res) => {
      res.once('data', (chunk) => resolve({ req, res, chunk }));
    });
    req.on('error', reject);
    req.end(requestBody);
  });
  assert.equal(client.res.statusCode, 200);
  assert.ok(client.chunk.length > 0);
  await upstreamStarted;
  assert.equal(studio.server.isLiveLocked(), true);
  client.res.destroy();
  client.req.destroy();

  const deadline = Date.now() + 1000;
  while ((studio.server.isLiveLocked() || !upstreamClosed) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  assert.equal(upstreamClosed, true, 'Cancelling Studio SSE must close the upstream bridge request');
  assert.equal(studio.server.isLiveLocked(), false, 'Live mutex must be released after client disconnect');
});

test('config - getConfig respects overrides and dynamically reads process.env', async () => {
  const { getConfig, CONFIG } = await import('../../lib/config.mjs');

  // Overrides test
  const custom = getConfig({
    PORT: 9991,
    HOST: '127.0.0.1',
    AIPASS_BRIDGE_URL: 'http://127.0.0.1:4444',
  });
  assert.equal(custom.PORT, 9991);
  assert.equal(custom.AIPASS_BRIDGE_URL, 'http://127.0.0.1:4444');
  assert.equal(custom.TIMEOUT_MS, 180000, 'Default must allow slower document models such as Claude Opus');
  assert.equal(getConfig({ TIMEOUT_MS: 45000 }).TIMEOUT_MS, 45000);

  // Dynamic process.env test
  const origPort = process.env.PORT;
  try {
    process.env.PORT = '8910';
    const dynamic = getConfig();
    assert.equal(dynamic.PORT, 8910);
    assert.equal(CONFIG.PORT, 8910);
  } finally {
    if (origPort !== undefined) process.env.PORT = origPort;
    else delete process.env.PORT;
  }
});

test('config - CONFIG proxy provides ownKeys and getOwnPropertyDescriptor traps', async () => {
  const { CONFIG } = await import('../../lib/config.mjs');
  const keys = Object.keys(CONFIG);
  assert.ok(keys.includes('PORT'));
  assert.ok(keys.includes('HOST'));
  assert.ok(keys.includes('AIPASS_BRIDGE_URL'));
  assert.ok(keys.includes('TIMEOUT_MS'));
  assert.ok(keys.includes('DEFAULT_MODEL'));

  assert.equal('PORT' in CONFIG, true);
  assert.equal('INVALID_PROP' in CONFIG, false);
});

test('server - server.getConfig returns runtimeConfig instance overrides', async (t) => {
  const studio = await startStudioServer({
    AIPASS_BRIDGE_URL: 'http://127.0.0.1:9876',
  });
  t.after(() => studio.stop());

  assert.equal(typeof studio.server.getConfig, 'function');
  const conf = studio.server.getConfig();
  assert.equal(conf.AIPASS_BRIDGE_URL, 'http://127.0.0.1:9876');
  assert.equal(conf.PORT, studio.port);
});
