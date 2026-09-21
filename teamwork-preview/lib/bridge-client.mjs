/**
 * Client for communicating with local AiPASS Bridge (http://127.0.0.1:8787)
 * Supports text prompts, PDF documents, and image attachments.
 */
import { CONFIG } from './config.mjs';
import { parseOpenAiSseStream } from './sse-parser.mjs';

/**
 * Checks readiness of the AiPASS bridge and connected extension.
 * @param {string} [baseUrl]
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export async function fetchBridgeStatus(baseUrl = CONFIG.AIPASS_BRIDGE_URL, signal = null) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  const timer = setTimeout(() => controller.abort(), 3000);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const res = await fetch(`${baseUrl}/status`, { signal: controller.signal });

    if (!res.ok) {
      return { ok: false, error: `Bridge HTTP ${res.status}`, extensions: 0 };
    }
    const data = await res.json();
    const extensions = Number.isFinite(Number(data.extensions)) ? Number(data.extensions) : 0;
    const hasSingleExtension = extensions === 1;
    return {
      ok: true,
      bridgeRunning: true,
      extensions,
      // More than one unpacked extension causes every browser response to be
      // forwarded once per content script, duplicating otherwise valid deltas.
      // Fail closed instead of trying to guess which repeated text is genuine.
      ready: data.ok === true && hasSingleExtension,
      ...(extensions > 1 ? {
        code: 'MULTIPLE_AIPASS_EXTENSIONS',
        error: `พบ AiPASS extension ${extensions} ตัว กรุณาปิดหรือลบตัวที่ซ้ำให้เหลือ 1 ตัว`,
      } : {}),
      defaultModel: data.defaultModel || CONFIG.DEFAULT_MODEL,
      credits: data.credits || null,
      mode: 'live',
    };
  } catch (err) {
    return {
      ok: false,
      bridgeRunning: false,
      extensions: 0,
      ready: false,
      error: err.name === 'AbortError' ? 'Bridge status check timed out' : err.message,
      mode: 'offline',
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

/**
 * Fetches available models from the bridge.
 * @param {string} [baseUrl]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchBridgeModels(baseUrl = CONFIG.AIPASS_BRIDGE_URL) {
  try {
    const res = await fetch(`${baseUrl}/v1/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return (body.data || []).map((m) => ({
      id: m.id,
      name: m.name || m.id,
      kind: m.kind || 'chat',
      free_credit: !!m.free_credit,
      thinking: m.thinking || ['off'],
    }));
  } catch {
    // Live mode must never disguise a bridge failure with demo model data.
    // The demo route serves MOCK_MODELS explicitly in server.mjs.
    return [];
  }
}

/**
 * Fetches account credit & video quota data.
 * @param {string} [baseUrl]
 * @returns {Promise<Object>}
 */
export async function fetchBridgeCredits(baseUrl = CONFIG.AIPASS_BRIDGE_URL) {
  try {
    const res = await fetch(`${baseUrl}/credits`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      available: data.available ?? data.remaining ?? null,
      limit: data.limit ?? data.total ?? null,
      ...data,
    };
  } catch {
    return null;
  }
}

/**
 * Creates a temporary expiring conversation on the bridge.
 * @param {string} [baseUrl]
 * @param {string} [model]
 * @param {AbortSignal} [signal]
 * @returns {Promise<{ id: string, temporary: boolean }>}
 */
export async function createTemporaryConversation(
  baseUrl = CONFIG.AIPASS_BRIDGE_URL,
  model = CONFIG.DEFAULT_MODEL,
  signal = null
) {
  const controller = new AbortController();
  const abortFromCaller = () => controller.abort();
  const timer = setTimeout(() => controller.abort(), 10000);

  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', abortFromCaller, { once: true });
  }

  try {
    const res = await fetch(`${baseUrl}/conversations/new`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        temporary: true,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`Failed to create temporary conversation (HTTP ${res.status}): ${errBody.slice(0, 200)}`);
    }

    const data = await res.json();
    if (!data || data.temporary !== true) {
      throw new Error('AiPASS Bridge did not confirm temporary conversation mode');
    }

    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Timeout connecting to AiPASS Bridge to create temporary conversation');
    }
    throw err;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

/**
 * Builds OpenAI-compatible user message content with optional file/image attachment.
 * @param {string} prompt
 * @param {Object} [attachment]
 * @param {string} attachment.filename
 * @param {string} attachment.mimeType
 * @param {string} attachment.dataUri
 * @returns {Array<Object> | string}
 */
export function buildUserMessageContent(prompt, attachment = null) {
  if (!attachment || !attachment.dataUri) {
    return prompt;
  }

  const parts = [{ type: 'text', text: prompt }];

  const isImage =
    attachment.mimeType?.startsWith('image/') ||
    (typeof attachment.dataUri === 'string' && attachment.dataUri.startsWith('data:image/'));

  if (isImage) {
    parts.push({
      type: 'image_url',
      image_url: { url: attachment.dataUri },
    });
  } else {
    parts.push({
      type: 'file',
      file: {
        filename: attachment.filename || 'document.pdf',
        file_data: attachment.dataUri,
      },
    });
  }

  return parts;
}

/**
 * Streams chat completion from AiPASS Bridge.
 * @param {Object} params
 * @param {string} params.prompt
 * @param {Object} [params.attachment]
 * @param {string} [params.model]
 * @param {string} [params.baseUrl]
 * @param {Function} [params.onChunk]
 * @param {Function} [params.onActivity]
 * @param {number} [params.timeoutMs]
 * @returns {Promise<string>}
 */
export async function streamBridgeCompletion({
  prompt,
  attachment = null,
  model = CONFIG.DEFAULT_MODEL,
  baseUrl = CONFIG.AIPASS_BRIDGE_URL,
  onChunk,
  onActivity,
  signal = null,
  timeoutMs = CONFIG.TIMEOUT_MS,
}) {
  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', () => controller.abort(), { once: true });
  }
  let timer;
  const touchTimeout = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(), timeoutMs);
  };
  touchTimeout();

  try {
    const content = buildUserMessageContent(prompt, attachment);

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: true,
        messages: [{ role: 'user', content }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`AiPASS Bridge returned HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    return await parseOpenAiSseStream(res.body, {
      onText: (chunk) => {
        touchTimeout();
        onChunk?.(chunk);
      },
      onActivity: (activity) => {
        touchTimeout();
        onActivity?.(activity);
      },
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`AiPASS Bridge stream idle timed out after ${timeoutMs / 1000}s`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
