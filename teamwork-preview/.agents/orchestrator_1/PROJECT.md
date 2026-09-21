# Project: รู้ทันหนังสือราชการ (Thai Official Document Explainer)

## Architecture
- **Web App**: Local-first vanilla ESM web application (`server.mjs`, `public/index.html`, `public/app.js`, `public/style.css`). Zero external npm dependencies.
- **Serial Multi-Role Pipeline**: 4-stage pipeline on AiPASS Bridge:
  1. `interpreter`: Deciphers official jargon into plain Thai (receives attachment Data URI in memory).
  2. `risk_checker`: Analyzes legal risks, statutory deadlines, penalties, and obligations.
  3. `action_planner`: Generates chronological action checklists and required documentation.
  4. `final_synthesizer`: Synthesizes the citizen guide with structured Thai headings and executive summary.
- **Security Invariants**:
  - DNS Rebinding Guard (strict loopback Host & Origin validation).
  - No CORS Wildcard (restricted loopback origins with `Vary: Origin`).
  - Privacy Consent (explicit affirmative opt-in checkbox on client and enforced on server).
  - Redaction Warning (automated Thai Citizen ID MOD-11 checksum validation and Official Secrecy classification scanner).
  - No File Persistence (zero disk writes; in-memory buffer clearing after Interpreter role).
- **Testing Architecture**: Pure `node:test` and `node:assert/strict` test suites with deterministic mock mode (`test/harness.mjs`, `lib/mock-bridge.mjs`).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | In-Memory File Attachment | Support PDF, PNG, JPG up to 5MB (10MB body limit for Base64) with zero disk persistence | M1 | explorer_impl_1 |
| 2 | Server Endpoints & HTTP Statuses | `/api/status`, `/api/run`, `/api/retry`, `/api/export`, `/api/models`, `/api/credits` with correct 400/413/500 status codes | M1 | explorer_impl_1 |
| 3 | Serial Multi-Role Streaming | SSE streaming across 4 ordered roles with client disconnect abort handling | M1 | explorer_impl_1 |
| 4 | Role Retry Continuation | Resuming downstream roles after retrying a failed step | M1 | explorer_impl_1 |
| 5 | DNS Rebinding & Origin Guard | Strict loopback Host check (no X-Forwarded-Host bypass) and strict Origin check on `/api/*` | M1 | explorer_sec_1 |
| 6 | Strict Loopback CORS | Exact loopback origin matching (`localhost`, `127.0.0.1`, `[::1]`) with `Vary: Origin` | M1 | explorer_sec_1 |
| 7 | Privacy Consent Enforcement | Affirmative opt-in (unchecked by default), verified on client and server | M1 | explorer_sec_1 |
| 8 | Thai PII & Secrecy Scanner | Automated 13-digit Thai ID detection (MOD-11) and Official Secrets Act classification warnings | M1 | explorer_sec_1 |
| 9 | In-Memory Buffer Cleanup | Clearing `attachment.dataUri` from memory immediately after Interpreter stage | M1 | explorer_sec_1 |
| 10 | Pure Node.js Test Suite Fixes | Fix `retryRole` role validation in `orchestrator.test.mjs` and consent assertion in `browser-e2e.test.mjs` | M1 | explorer_test_1 |
| 11 | Extended Test Coverage | Add tests for `isAllowedOrigin`, 413 Payload Too Large, PII scanner, and zero persistence | M1 | explorer_test_1 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Remediation & Security Hardening | Apply all implementation fixes, security invariant guards, PII scanner, and test fixes | Survey complete | IN_PROGRESS |
| M2 | Review & Verification Gate | Independent code & security review (Reviewer), empirical testing (Challenger), forensic integrity audit (Auditor) | M1 | PLANNED |
| M3 | Final Synthesis & Sentinel Report | Synthesize all gate results and report back to Sentinel parent | M2 | PLANNED |

## Interface Contracts
### `lib/config.mjs`
- `isAllowedHost(host: string): boolean`
- `isAllowedOrigin(origin: string): boolean`

### `lib/pii-detector.mjs`
- `validateThaiCitizenId(idStr: string): boolean`
- `scanSensitiveData(text: string): { hasPii: boolean, warnings: string[], redactedText: string }`

### `server.mjs` Endpoints
- `POST /api/run`: Request: `{ goal, attachment, model, isDemo, privacyConsent, simulateErrorAtRole }`. Response: SSE stream.
- `POST /api/retry`: Request: `{ roleId, goal, attachment, stepsSoFar, model, isDemo, privacyConsent }`. Response: SSE stream.
- `POST /api/export`: Request: `{ format: 'md'|'json', run }`. Response: File download.

## Code Layout
- `server.mjs`: Main HTTP server, routing, security headers, request body parsing, SSE handling.
- `lib/config.mjs`: Server constants, allowed hosts, allowed origins.
- `lib/pii-detector.mjs`: Thai Citizen ID and Official Secrecy scanner.
- `lib/orchestrator.mjs`: Multi-role serial execution, role retry, prompt dispatch, attachment handling.
- `lib/bridge-client.mjs`: AiPASS Bridge client, completions streaming, temporary conversation management.
- `lib/mock-bridge.mjs`: Deterministic mock streaming for tests and demo mode.
- `lib/prompts.mjs`: Prompt templates and role definitions.
- `lib/exporter.mjs`: Markdown and JSON exporter.
- `public/index.html`: Web application UI.
- `public/app.js`: Frontend controller, SSE client, PII detection dialog, role cards, export handlers.
- `public/style.css`: Stylesheet.
- `test/unit/*`: Unit tests for exporter, orchestrator, prompts, sse-parser, pii-detector.
- `test/integration/*`: Integration tests for bridge-client, proxy/security headers.
- `test/e2e/*`: Browser DOM contracts and studio workflow tests.
