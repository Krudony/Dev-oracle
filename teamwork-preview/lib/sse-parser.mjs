/**
 * Server-Sent Events (SSE) stream parser and encoder
 */

/**
 * Creates an SSE frame string.
 * @param {string} event - The event name.
 * @param {any} data - The payload object or string.
 * @returns {string} Formatted SSE frame.
 */
export function formatSseFrame(event, data) {
  const serialized = typeof data === 'string' ? data : JSON.stringify(data);
  return `event: ${event}\ndata: ${serialized}\n\n`;
}

/**
 * Parses an incoming OpenAI-compatible stream response, calling callbacks for text and reasoning.
 * Preserves error message for both string and object error payloads.
 * @param {ReadableStream<Uint8Array>} readableStream - The fetch response body.
 * @param {Object} callbacks
 * @param {Function} [callbacks.onText] - Called when a content delta is received.
 * @param {Function} [callbacks.onActivity] - Called when reasoning_content is received.
 * @param {Function} [callbacks.onError] - Called when an error event is encountered.
 * @returns {Promise<string>} The full accumulated text content.
 */
export async function parseOpenAiSseStream(readableStream, { onText, onActivity, onError } = {}) {
  const reader = readableStream.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let fullText = '';
  let receivedDone = false;

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;

      pending += decoder.decode(value, { stream: true });
      // Normalize CRLF to LF to cleanly support both \r\n and \n framing
      pending = pending.replace(/\r\n/g, '\n');
      let cut;

      while ((cut = pending.indexOf('\n\n')) !== -1) {
        const frame = pending.slice(0, cut);
        pending = pending.slice(cut + 2);

        const lines = frame.split('\n');
        for (const line of lines) {
          if (line.startsWith('data:')) {
            const dataLine = line.slice(5).trim();
            if (!dataLine) continue;

            if (dataLine === '[DONE]') {
              receivedDone = true;
              continue;
            }

            let parsed;
            try {
              parsed = JSON.parse(dataLine);
            } catch {
              // Ignore non-JSON heartbeat or comment lines
              continue;
            }

            if (parsed && typeof parsed === 'object') {
              if (parsed.error) {
                const error = parsed.error;
                const errorMsg =
                  typeof error === 'string'
                    ? error
                    : (error?.message || error?.error || error?.msg || 'Stream error');
                const err = new Error(errorMsg);
                onError?.(err);
                throw err;
              }

              const delta = parsed.choices?.[0]?.delta ?? {};
              if (delta.reasoning_content) {
                onActivity?.(delta.reasoning_content);
              }
              if (delta.content) {
                fullText += delta.content;
                onText?.(delta.content);
              }
            }
          }
        }
      }
    }

    // Process any remaining tail in pending buffer
    if (pending.trim()) {
      const lines = pending.replace(/\r\n/g, '\n').split('\n');
      for (const line of lines) {
        if (line.startsWith('data:') && line.slice(5).trim() === '[DONE]') {
          receivedDone = true;
        }
      }
    }

    if (!receivedDone) {
      const err = new Error('Stream terminated prematurely: EOF reached before [DONE] signal was received');
      onError?.(err);
      throw err;
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}
