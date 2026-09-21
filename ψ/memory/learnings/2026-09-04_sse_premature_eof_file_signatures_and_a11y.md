# Learning: SSE Premature EOF, Binary Magic Bytes, Single-Ownership Retry & Accessibility

**Date**: 2026-09-04
**Context**: AiPASS Teamwork Studio ("รู้ทันหนังสือราชการ") Final Security, Streaming & UX Hardening

## 1. Premature EOF in SSE Streams
When consuming Server-Sent Events (SSE) from upstream AI bridges, an abrupt TCP termination or upstream timeout can close the connection without sending the terminal `[DONE]` signal.
- **Vulnerability**: Naive SSE parsers emit whatever was buffered and signal completion, leading downstream consumers to assume the AI model finished generating.
- **Defense**: Track an explicit `receivedDone` flag. If the reader hits EOF (`done === true`) before encountering `data: [DONE]`, throw an explicit `Stream terminated prematurely: EOF reached before [DONE] signal was received` error. This guarantees `role_done` is never falsely emitted on a truncated output.

## 2. In-Memory Digital File Signatures (Magic Bytes)
Relying solely on MIME types provided in `Content-Type` or Data URI headers (`data:application/pdf;base64,...`) is unsafe because users or malicious actors can spoof headers:
- **Defense**: Extract the first 3-8 bytes from the base64-decoded buffer and inspect magic bytes:
  - **PDF**: `%PDF-` (`0x25, 0x50, 0x44, 0x46, 0x2D`)
  - **JPEG**: `0xFF, 0xD8, 0xFF`
  - **PNG**: `0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`
- Enforce that `attachment.mimeType` matches the Data URI header prefix, and decoded data matches the magic bytes.

## 3. Single Ownership of Pipeline Resumption on Retry
- **Anti-pattern**: Both the frontend and backend attempting to loop through remaining pipeline roles leads to duplicate execution or inconsistent partial states.
- **Pattern**: The backend owns the resumption loop. When the user retries a failed role (e.g. `risk_checker`), the backend executes `risk_checker`, then automatically proceeds with `action_planner` and `final_synthesizer` within the same SSE stream, terminating with a single `complete` event.
- The frontend simply clears downstream cards before initiating retry, and clears any partial output if a role emits `role_error`.

## 4. Strict Host and Port Parsing for DNS Rebinding Protection
- Avoid feeding unvalidated `Host` headers directly into `new URL(..., 'http://' + host)` which can throw on invalid bracket syntax or non-numeric ports (e.g., `localhost:evil`, `[::1]evil`).
- Validate the `Host` header against strict loopback host patterns and port ranges (1-65535) before URL construction.

## 5. Accessibility for Document Dropzones
- Dropzones should include `tabindex="0"`, `role="button"`, `aria-label`, and respond to `Enter` and `Space` keyboard events with focus rings.
- Use `aria-live="polite"` for non-disruptive dynamic status updates and `role="status"` + `aria-live="assertive"` for critical alerts and toasts.
