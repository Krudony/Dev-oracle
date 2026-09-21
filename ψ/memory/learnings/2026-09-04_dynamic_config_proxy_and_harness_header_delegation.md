# Learning: Dynamic Config Proxy & Test Harness Header Delegation

**Date**: 2026-09-04
**Context**: Host testing resolution in AiPASS Teamwork Studio ("รู้ทันหนังสือราชการ")

## 1. Module-Load Config Snapshot vs. Dynamic Config Proxy
- **Problem**: When a config module exports a plain static object initialized from `process.env` (e.g. `export const CONFIG = { AIPASS_BRIDGE_URL: process.env.AIPASS_BRIDGE_URL || ... }`), Node.js snapshots those values at initial module evaluation. If a test harness attempts to override configuration via `process.env` after importing the server or config module, the changes are silently ignored.
- **Problem 2 (Concurrency & State Leaks)**: Mutating `process.env` across concurrent test suites causes non-deterministic race conditions and test pollution.
- **Solution**:
  1. Define a factory function `getConfig(overrides = {})` that evaluates `process.env` dynamically at call-time.
  2. Wrap `CONFIG` in an ES `Proxy` implementing `get`, `set`, `ownKeys`, and `getOwnPropertyDescriptor` traps. This ensures legacy/direct accesses like `CONFIG.AIPASS_BRIDGE_URL` or `{ ...CONFIG }` always resolve current values without static snapshotting.
  3. Update `createServer(configOverrides)` to accept explicit overrides and pass them directly into instance-scoped runtime configs (`runtimeConfig = getConfig(configOverrides)`), completely eliminating `process.env` mutations in test harnesses.

## 2. Test Harness Header Delegation
- **Problem**: In fake/mock HTTP test servers (such as `startFakeBridge`), pre-writing response headers (e.g. `res.writeHead(200, { 'Content-Type': 'text/event-stream' })`) before invoking custom request handlers causes `ERR_HTTP_HEADERS_SENT` whenever a test case attempts to return an error status code like `res.writeHead(500)`. Because headers were already sent with status 200, the client treats the response as a successful stream and hangs waiting for SSE events until timeout (e.g. 30s).
- **Solution**:
  - Delegate header responsibility directly to the custom handler (`if (handlers.onChat) handlers.onChat(req, res);`).
  - Only write default 200 headers in the fallback `else` branch when no custom handler is provided.
  - Require streaming tests to explicitly set their own 200 SSE headers when providing custom handlers.

## 3. Deterministic Test Synchronization Over Sleep
- **Problem**: Using arbitrary `setTimeout(r, 30)` to wait for a background request to acquire a mutex before dispatching a second concurrent request is inherently flaky under CPU load or CI environments.
- **Solution**: Coordinate test state using an explicit `Promise` (e.g. `await conversationStarted`), where the mock server signals the promise immediately upon receiving the first request. This guarantees the lock is held before firing subsequent assertions.
