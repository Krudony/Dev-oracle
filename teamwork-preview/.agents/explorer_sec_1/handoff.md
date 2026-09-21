# Security Invariant Audit Report & Hardening Plan
**Project**: รู้ทันหนังสือราชการ (Thai Official Document Explainer)  
**Agent**: Security Invariants Explorer (Reviewer Track, `explorer_sec_1`)  
**Date**: 2026-09-04  
**Status**: Complete  

---

## Executive Summary
This audit evaluated the five mandatory security invariants for "รู้ทันหนังสือราชการ" across the entire codebase (`server.mjs`, `lib/*`, `public/*`, and `test/*`).

| Invariant | Status | Severity | Summary |
|---|---|---|---|
| **A. DNS Rebinding Guard** | ⚠️ VULNERABLE | HIGH | `X-Forwarded-Host` precedence bypass allows arbitrary rebound domains to bypass Host check; missing Origin enforcement on `/api/*` endpoints. |
| **B. No CORS Wildcard** | ⚠️ VULNERABLE | HIGH | No wildcard `*`, but `startsWith` prefix check allows `http://localhost.attacker.com` and `http://127.0.0.1.attacker.com` full CORS access to document data. Missing IPv6 `[::1]` and `Vary: Origin`. |
| **C. Privacy Consent** | ⚠️ INCOMPLETE | MEDIUM-HIGH | Pre-checked HTML box violates explicit affirmative consent (PDPA/GDPR); server has **zero** consent validation on `/api/run` and `/api/retry`. |
| **D. Redaction Warning** | ⚠️ INCOMPLETE | MEDIUM | Static banner advisory exists, but zero automated scanning/warning for 13-digit Thai National IDs or Official Secrecy Classifications (ลับ, ลับมาก, ลับที่สุด). |
| **E. No File Persistence** | ✅ PASS (Hardening Rec.) | LOW | Zero disk persistence verified (no `fs.writeFile`, no uploads directory, no client storage). Memory lifecycle can be hardened by freeing buffers immediately after the Interpreter role. |

---

## 1. Observation

### Invariant A: DNS Rebinding Guard
* **Observation A.1 (Precedence Flaw)**: In `server.mjs` (lines 121–126):
  ```javascript
  121: const hostHeader = (req.headers['x-forwarded-host'] || req.headers.host || '').trim();
  122: if (!hostHeader || !isAllowedHost(hostHeader)) {
  123:   res.writeHead(403, { 'Content-Type': 'application/json' });
  124:   res.end(JSON.stringify({ error: 'Forbidden: Invalid Host header' }));
  125:   return;
  126: }
  ```
  `req.headers['x-forwarded-host']` takes precedence over `req.headers.host`. In web browsers, JavaScript cannot set the `Host` header, but it CAN set custom headers including `X-Forwarded-Host` via standard `fetch()` or `XMLHttpRequest`.
* **Observation A.2 (Missing Origin Validation for API)**: In `server.mjs` (lines 134–292):
  State-changing endpoints (`POST /api/run`, `POST /api/retry`, `POST /api/export`) do not validate the incoming `Origin` header. An external malicious site can submit cross-origin POST requests to `http://127.0.0.1:8788/api/run` if the victim's browser connects to localhost.
* **Observation A.3 (Host Validation Implementation)**: In `lib/config.mjs` (lines 18–40):
  `isAllowedHost` only permits `127.0.0.1`, `localhost`, `::1`, and `[::1]`.

### Invariant B: No CORS Wildcard & Origin Validation
* **Observation B.1 (Prefix Matching Vulnerability)**: In `server.mjs` (lines 25–35):
  ```javascript
  25: function setSecurityHeaders(res, origin = '') {
  26:   res.setHeader('X-Content-Type-Options', 'nosniff');
  27:   res.setHeader('X-Frame-Options', 'DENY');
  28:   res.setHeader('Referrer-Policy', 'no-referrer');
  29: 
  30:   if (origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
  31:     res.setHeader('Access-Control-Allow-Origin', origin);
  32:     res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  33:     res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  34:   }
  35: }
  ```
  `origin.startsWith('http://localhost')` evaluates to `true` for `http://localhost.evil-attacker.com` and `http://localhost.attacker.org:8080`.  
  `origin.startsWith('http://127.0.0.1')` evaluates to `true` for `http://127.0.0.1.attacker.com` or `http://127.0.0.1.nip.io`.
* **Observation B.2 (Missing Header & IPv6)**:
  `http://[::1]` is not matched by `startsWith('http://localhost')` or `startsWith('http://127.0.0.1')`. The `Vary: Origin` header is omitted, creating cache poisoning risks across origin contexts.

### Invariant C: Privacy Consent Enforcement
* **Observation C.1 (Pre-checked Checkbox)**: In `public/index.html` (lines 90–93):
  ```html
  90: <label class="checkbox-label">
  91:   <input type="checkbox" id="consentCheckbox" checked>
  92:   <span>ข้าพเจ้ายืนยันว่าได้ปิดบังข้อมูลอ่อนไหวแล้ว...</span>
  93: </label>
  ```
  The checkbox is pre-checked by default, bypassing affirmative opt-in requirements.
* **Observation C.2 (Payload Omission)**: In `public/app.js` (lines 329–334):
  `handleRunPipeline` checks `if (!elements.consentCheckbox.checked)`, but does not include `privacyConsent` in the JSON request body dispatched to `/api/run`.
* **Observation C.3 (Server-side Absence)**: In `server.mjs` (lines 184–222):
  `/api/run` extracts `{ goal, attachment, model, isDemo, simulateErrorAtRole }`. It performs zero check for `privacyConsent` before delegating to `runSerialPipeline`. Direct API requests completely bypass consent.

### Invariant D: Redaction Warning & PII Detection
* **Observation D.1 (Static Alert Banner Only)**: In `public/index.html` (lines 49–54):
  A static HTML alert informs users: *"คำแนะนำเพื่อความเป็นส่วนตัว: กรุณาตรวจดูและขีดฆ่า/ปิดบังข้อมูลส่วนบุคคลที่ไม่จำเป็น เช่น เลขบัตรประจำตัวประชาชน 13 หลัก..."*.
* **Observation D.2 (Zero Dynamic PII Scanning)**: In `public/app.js` and `server.mjs`:
  Neither client nor server contains any pattern matching or checksum validation for 13-digit Thai National IDs (`\b\d{13}\b`), phone numbers, bank accounts, or Thai official classification markers (`ลับ`, `ลับมาก`, `ลับที่สุด`). If a citizen pastes text containing an unredacted National ID or classified state document, it is transmitted upstream without warning or intervention.

### Invariant E: No File Persistence
* **Observation E.1 (Zero Disk Storage)**: Across `server.mjs` and `lib/*`:
  No calls to `fs.writeFile`, `fs.createWriteStream`, or temporary directory creation (`/tmp`, `./uploads`). The only filesystem call is `fs.readFile` for serving static assets from `./public`.
* **Observation E.2 (Export Sanitization)**: In `lib/exporter.mjs` (lines 62–65):
  `formatRunToJson` explicitly filters out raw binary `dataUri` (`attachment: run.attachment ? { filename: run.attachment.filename, mimeType: run.attachment.mimeType } : null`).
* **Observation E.3 (Memory Scope Retention)**: In `lib/orchestrator.mjs` (lines 83–85):
  Attachment data is only passed to `interpreter`, but the Base64 string remains in scope in `server.mjs` until the entire 4-stage pipeline finishes and GC runs.

---

## 2. Logic Chain

1. **DNS Rebinding Bypass**:
   - *Observation A.1* shows `hostHeader` prioritizes `req.headers['x-forwarded-host']`.
   - In a DNS rebinding attack, victim visits `http://attacker-rebound.com:8788`. The browser sends `Host: attacker-rebound.com:8788`.
   - The attacker's script issues `fetch('/api/run', { headers: { 'X-Forwarded-Host': '127.0.0.1' } })`.
   - The server evaluates `isAllowedHost('127.0.0.1')`, which returns `true`.
   - **Conclusion**: The DNS rebinding guard is completely bypassed when `X-Forwarded-Host` is forged.
2. **CORS SOP Bypass via Prefix Matching**:
   - *Observation B.1* shows `origin.startsWith('http://localhost')`.
   - If an attacker hosts an exploit page on `http://localhost.attacker.com`, the check succeeds.
   - The server issues `Access-Control-Allow-Origin: http://localhost.attacker.com`.
   - The browser permits `localhost.attacker.com` to read the complete SSE stream and JSON responses containing citizen documents and legal analyses.
   - **Conclusion**: The CORS configuration violates origin isolation and permits unauthorized data exfiltration.
3. **Incomplete Privacy Consent**:
   - *Observation C.1* shows pre-checked consent. Under PDPA and international privacy standards, explicit affirmative action is required.
   - *Observation C.3* shows the backend does not enforce consent. An automated or cross-origin script can invoke `/api/run` directly without user consent.
   - **Conclusion**: Invariant C is violated because enforcement exists only on the client surface and uses a pre-checked box.
4. **Absence of Active Redaction Warning**:
   - *Observation D.1* and *D.2* establish that warning is purely passive.
   - Citizens routinely paste raw OCR or scanned text into web tools containing 13-digit citizen IDs and official stamps.
   - Official documents classified as "หนังสือลับ" under the Official Secrets Act B.E. 2544 must never be transmitted to external AI bridges.
   - **Conclusion**: Invariant D requires active detection and interactive warnings prior to transmission.
5. **File Persistence Compliance**:
   - *Observation E.1* and *E.2* confirm zero disk persistence across all execution paths.
   - *Observation E.3* demonstrates an opportunity to tighten in-memory buffer lifetimes.
   - **Conclusion**: Invariant E is fundamentally satisfied, with clear memory hardening opportunities.

---

## 3. Caveats
- **Upstream Bridge Storage**: This audit covers the `teamwork-preview` application layer. Storage policies on the upstream `AiPASS Bridge` (`http://127.0.0.1:8787`) or downstream LLM providers (e.g. Google Gemini, OpenAI) are external to this codebase. The application mitigates this by passing `temporary: true` during bridge conversation initialization.
- **Client-Side PDF OCR**: Scanned PDFs uploaded as images cannot be text-scanned on the client side without an OCR engine. The PII detector can inspect text in `goalInput` and text-based attachments, but binary raster images rely on the passive advisory and user redaction.
- **E2E Test Interdependency**: In `test/e2e/browser-e2e.test.mjs` line 170, the test currently asserts that `consentCheckbox` has the `checked` attribute. If the Implementer removes `checked` for compliance with affirmative consent, that test line must be updated in tandem.

---

## 4. Conclusion & Actionable Remedies

### Concrete Remediation Plan for Implementer Track

#### Remedy 1: Fix DNS Rebinding & Host Validation (`lib/config.mjs` & `server.mjs`)
1. In `lib/config.mjs`, add `isAllowedOrigin(origin)`:
```javascript
/**
 * Validates request Origin header.
 * Only exact loopback origins (http://localhost:*, http://127.0.0.1:*, http://[::1]:*) are allowed.
 * @param {string} origin
 * @returns {boolean}
 */
export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const hostname = u.hostname.toLowerCase();
    return (
      hostname === '127.0.0.1' ||
      hostname === 'localhost' ||
      hostname === '::1' ||
      hostname === '[::1]'
    );
  } catch {
    return false;
  }
}
```

2. In `server.mjs`, eliminate the `X-Forwarded-Host` bypass and enforce strict Host & Origin:
```javascript
// Replace lines 120-126 of server.mjs with:
const host = (req.headers.host || '').trim();
const forwardedHost = (req.headers['x-forwarded-host'] || '').trim();

// 1. Host header MUST be valid loopback
if (!host || !isAllowedHost(host)) {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Forbidden: Invalid Host header' }));
  return;
}

// 2. If X-Forwarded-Host is provided, it MUST ALSO be valid loopback
if (forwardedHost && !isAllowedHost(forwardedHost)) {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Forbidden: Invalid X-Forwarded-Host header' }));
  return;
}

// 3. If Origin header is provided on API endpoints, reject untrusted origins
if (origin && pathname.startsWith('/api/') && !isAllowedOrigin(origin)) {
  res.writeHead(403, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Forbidden: Untrusted Origin' }));
  return;
}
```

#### Remedy 2: Fix CORS Security Headers (`server.mjs`)
Replace `setSecurityHeaders` in `server.mjs`:
```javascript
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
```

#### Remedy 3: Enforce Server & Client Privacy Consent (`server.mjs`, `public/app.js`, `public/index.html`)
1. In `server.mjs` (`/api/run` and `/api/retry`):
```javascript
if (req.method === 'POST' && (pathname === '/api/run' || pathname === '/api/analyze')) {
  const payload = await readJsonBody(req);
  const { goal, attachment, model, isDemo, simulateErrorAtRole, privacyConsent } = payload;

  if (privacyConsent !== true) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Privacy consent required: ผู้ใช้ต้องยืนยันความยินยอมด้านความเป็นส่วนตัวก่อนเริ่มวิเคราะห์'
    }));
    return;
  }
  ...
```
2. In `public/app.js` (`handleRunPipeline` and `handleRetryRole`):
```javascript
const res = await fetch('/api/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    goal: state.currentGoal,
    attachment: state.attachment,
    model: state.selectedModel,
    isDemo: elements.demoToggle.checked,
    privacyConsent: elements.consentCheckbox.checked,
  }),
});
```
3. In `public/index.html`:
Remove `checked` attribute from line 91:
```html
<input type="checkbox" id="consentCheckbox">
```
*(And update `test/e2e/browser-e2e.test.mjs` line 170 accordingly)*.

#### Remedy 4: Add Automated PII & Thai Official Secrecy Scanner (`lib/pii-detector.mjs` & `public/app.js`)
Create `lib/pii-detector.mjs`:
```javascript
/**
 * PII and Thai Government Official Secrecy Scanner
 */

/**
 * Validates 13-digit Thai Citizen ID checksum (MOD 11).
 * @param {string} idStr
 * @returns {boolean}
 */
export function validateThaiCitizenId(idStr) {
  const digits = (idStr || '').replace(/[-\s]/g, '');
  if (digits.length !== 13 || !/^\d{13}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(digits[12], 10);
}

/**
 * Scans text for sensitive Thai PII and Official Secrecy markers.
 * @param {string} text
 * @returns {{ hasPii: boolean, warnings: string[], redactedText: string }}
 */
export function scanSensitiveData(text) {
  if (!text || typeof text !== 'string') {
    return { hasPii: false, warnings: [], redactedText: '' };
  }

  const warnings = [];
  let redacted = text;

  // 1. Thai Citizen ID (13 digits formatted or raw)
  const idRegex = /\b(\d{1}[-\s]?\d{4}[-\s]?\d{5}[-\s]?\d{2}[-\s]?\d{1})\b/g;
  let idMatch;
  while ((idMatch = idRegex.exec(text)) !== null) {
    const cleanDigits = idMatch[1].replace(/[-\s]/g, '');
    if (cleanDigits.length === 13) {
      const isValid = validateThaiCitizenId(cleanDigits);
      warnings.push(`พบเลขประจำตัวประชาชน 13 หลัก (${idMatch[1]}${isValid ? ' - ตรวจสอบผลรวมถูกต้อง' : ''})`);
    }
  }
  redacted = redacted.replace(idRegex, '[เลขบัตรประชาชนถูกปิดบัง]');

  // 2. Official Secrecy Classifications (ระเบียบว่าด้วยการรักษาความลับของทางราชการ พ.ศ. 2544)
  const secrecyRegex = /(ลับที่สุด|ลับมาก|\bเอกสารลับ\b|\bหนังสือลับ\b)/g;
  let secMatch;
  while ((secMatch = secrecyRegex.exec(text)) !== null) {
    warnings.push(`พบเครื่องหมายชั้นความลับทางราชการ ("${secMatch[1]}") — ห้ามส่งเอกสารลับเข้าสู่ระบบ AI`);
  }

  return {
    hasPii: warnings.length > 0,
    warnings,
    redactedText: redacted,
  };
}
```

In `public/app.js`, add pre-submission PII warning check:
```javascript
const piiScan = scanSensitiveData(goal);
if (piiScan.hasPii) {
  const proceed = confirm(
    `⚠️ คำเตือนความปลอดภัยและความเป็นส่วนตัว:\n` +
    piiScan.warnings.join('\n') +
    `\n\nต้องการดำเนินการต่อหรือไม่? แนะนำให้กด "ยกเลิก" เพื่อปิดบังข้อมูลก่อนส่ง`
  );
  if (!proceed) return;
}
```

#### Remedy 5: In-Memory Buffer Clearing (`lib/orchestrator.mjs` & `server.mjs`)
In `lib/orchestrator.mjs` line 85:
```javascript
// Once Interpreter completes, dereference dataUri to release base64 buffer from RAM
if (attachment && attachment.dataUri) {
  attachment.dataUri = null;
}
```
In `server.mjs`:
```javascript
finally {
  if (payload && payload.attachment) {
    payload.attachment = null;
  }
  res.end();
}
```

---

## 5. Verification Method

### Test Suite Execution
Run pure `node:test` integration and unit suites once remedies are applied:
```bash
node --test test/**/*.test.mjs
```

### Specific Invariant Verification Checks

1. **DNS Rebinding & Host Validation Test**:
   Verify in `test/integration/proxy.test.mjs`:
   - Send raw HTTP GET with `Host: evil.com` and `X-Forwarded-Host: 127.0.0.1` -> Must return `403 Forbidden`.
   - Send raw HTTP GET with `Host: 127.0.0.1` and `X-Forwarded-Host: evil.com` -> Must return `403 Forbidden`.
2. **CORS Prefix Bypass Test**:
   - Send `GET /api/status?demo=true` with `Origin: http://localhost.attacker.com` -> Header `Access-Control-Allow-Origin` must NOT be present and must NOT equal `http://localhost.attacker.com`.
   - Send `GET /api/status?demo=true` with `Origin: http://127.0.0.1.attacker.com` -> Must be rejected.
   - Send with `Origin: http://localhost:8788` -> Must receive `Access-Control-Allow-Origin: http://localhost:8788`.
3. **Privacy Consent Rejection Test**:
   - Send `POST /api/run` with `{ goal: "ทดสอบ", privacyConsent: false }` -> Must return `400 Bad Request`.
   - Send `POST /api/run` with `{ goal: "ทดสอบ" }` (omitted consent) -> Must return `400 Bad Request`.
   - Send `POST /api/run` with `{ goal: "ทดสอบ", privacyConsent: true, isDemo: true }` -> Must succeed with `200 OK` (SSE stream).
4. **PII Scanner Unit Tests**:
   - Test `validateThaiCitizenId('1-1002-01234-56-7')` checksum calculation.
   - Test `scanSensitiveData('หนังสือเลขที่ 123 ลับมาก')` -> detects `ลับมาก`.
5. **No File Persistence Invalidation Check**:
   - Monitor working directory during execution: verify no `.tmp`, `.dat`, or attachment files are created on disk.

---
*Report prepared by Security Invariants Explorer (`explorer_sec_1`)*
