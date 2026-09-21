# Learning: Process-Global Browser Tab Bridges & Server-Side Concurrency Mutex

**Date**: 2026-09-04
**Context**: AiPASS Teamwork Studio ("รู้ทันหนังสือราชการ") local server integration with `aipass-bridge`

## Problem
In local browser-automation bridges (like `niawjunior/aipass-bridge`), the bridge operates on a single active Chrome browser tab. When `/conversations/new` is requested, it navigates the active tab to a new conversation session.
If two client requests (e.g. two browser tabs, or concurrent `/api/run` and `/api/retry` requests) invoke the bridge simultaneously in live mode:
1. Request A calls `/conversations/new` -> Tab navigates to Conversation A.
2. Request B calls `/conversations/new` -> Tab navigates to Conversation B.
3. Request A sends prompt 2 (e.g., `risk_checker`) -> Prompt is typed into Conversation B!
4. Cross-contamination occurs: document contents leak across sessions, and reasoning threads are corrupted.

## Solution: Fail-Closed Concurrency Mutex
1. **Server-Side Concurrency Lock**:
   - Maintain a live execution lock flag on the server instance.
   - When a live `/api/run` or `/api/retry` request arrives, check the lock.
   - If locked, immediately reject the second request with **HTTP 409 Conflict** (`{ error: "Conflict: Another live analysis is currently running. AiPASS Bridge maintains a single global browser session...", code: "CONCURRENT_LIVE_RUN_REJECTED" }`).
   - Mock/Demo mode requests (`isDemo: true`) do not use the bridge and can run concurrently without locking.
2. **Deterministic Lifecycle Cleanup**:
   - The lock must be acquired *before* emitting HTTP headers (ensuring clean 409 status code).
   - In the `finally` block, unconditionally release the lock upon successful stream completion, pipeline error, or client disconnect (`AbortController`).
3. **Live Retry Session Isolation**:
   - Retried steps in live mode must also allocate a fresh temporary conversation (`createTemporaryConversation`) under the concurrency lock, preventing message injection into stale or permanent conversation histories.
4. **Honest Verification Nomenclature**:
   - Without bundling 300MB Playwright binaries, DOM/Event tests are strictly static contract verifications. Labeling them `ui-contract` and reserving `e2e` for the HTTP/SSE pipeline avoids misrepresenting test coverage to users and auditors.
