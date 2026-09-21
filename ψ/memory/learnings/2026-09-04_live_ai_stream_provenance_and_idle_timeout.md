# Live AI Document Analysis: Provenance and Idle Timeout

When an AI document application supports both demos and live execution, every rendered result must carry its own provenance: the exact input revision, attachment, selected model, and execution mode. Changing any input must invalidate the old result immediately, including during asynchronous file reads. A healthy upstream or successful short prompt is not evidence that a document workflow is correctly live.

For streaming model calls, use an inactivity timeout rather than an absolute total-duration timeout. Start the timer before the request to cover first-token latency, reset it whenever meaningful text or reasoning activity arrives, and clear it on every exit. Reasoning-heavy models can legitimately take longer than 30 seconds on document prompts; in this session `claude-opus-5@azure` completed the realistic interpreter prompt in 45.8 seconds. A 180-second idle window prevented false failures while preserving protection against genuinely stalled streams.

**Concepts:** AiPASS, Claude, SSE, idle timeout, result provenance, stale-state invalidation, document analysis, E2E testing

