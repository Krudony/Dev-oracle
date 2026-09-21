/**
 * Configuration & Security Invariants for รู้ทันหนังสือราชการ
 */
/**
 * Resolves runtime configuration with optional overrides.
 * Reads process.env dynamically at call-time so environment changes are reflected.
 * @param {Object} [overrides={}]
 * @returns {Object}
 */
export function getConfig(overrides = {}) {
  return {
    PORT: overrides.PORT !== undefined ? parseInt(overrides.PORT, 10) : parseInt(process.env.PORT || '8788', 10),
    HOST: overrides.HOST || process.env.HOST || '127.0.0.1',
    AIPASS_BRIDGE_URL: overrides.AIPASS_BRIDGE_URL || process.env.AIPASS_BRIDGE_URL || 'http://127.0.0.1:8787',
    // Reasoning-heavy models such as Claude Opus can take well over 30s to
    // produce the first token for document prompts. Match the bridge's normal
    // idle timeout instead of aborting valid work prematurely.
    TIMEOUT_MS: overrides.TIMEOUT_MS !== undefined ? overrides.TIMEOUT_MS : 180000,
    DEFAULT_MODEL: overrides.DEFAULT_MODEL || 'gemini-3.1-flash-lite',
  };
}

/**
 * Dynamic CONFIG proxy that always resolves current process.env at runtime.
 */
export const CONFIG = new Proxy({}, {
  get(target, prop) {
    return getConfig()[prop];
  },
  set(target, prop, value) {
    return true;
  },
  ownKeys() {
    return Reflect.ownKeys(getConfig());
  },
  has(target, prop) {
    return prop in getConfig();
  },
  getOwnPropertyDescriptor(target, prop) {
    const config = getConfig();
    if (prop in config) {
      return {
        value: config[prop],
        writable: true,
        enumerable: true,
        configurable: true,
      };
    }
    return undefined;
  },
});

/**
 * Validates request Host header to prevent DNS rebinding attacks.
 * Only loopback addresses (127.0.0.1, localhost, ::1, [::1]) on any port are allowed.
 * @param {string} hostHeader
 * @returns {boolean}
 */
export function isAllowedHost(hostHeader) {
  if (!hostHeader || typeof hostHeader !== 'string') return false;
  const normalized = hostHeader.toLowerCase().trim();
  if (!normalized) return false;

  let hostPart = normalized;
  let portPart = null;

  if (normalized.startsWith('[')) {
    const closeBracketIndex = normalized.indexOf(']');
    if (closeBracketIndex === -1) return false;
    hostPart = normalized.slice(0, closeBracketIndex + 1);
    const afterBracket = normalized.slice(closeBracketIndex + 1);
    if (afterBracket) {
      if (!afterBracket.startsWith(':')) return false; // Reject [::1]evil
      portPart = afterBracket.slice(1);
    }
  } else if (normalized.includes(':')) {
    const colonCount = (normalized.match(/:/g) || []).length;
    if (colonCount === 1) {
      const parts = normalized.split(':');
      hostPart = parts[0];
      portPart = parts[1];
    } else {
      // Multiple colons without brackets -> must be bare IPv6 like ::1 (no port allowed without brackets)
      hostPart = normalized;
    }
  }

  // Validate port if present: must be strictly digits and in valid TCP range 1-65535
  if (portPart !== null) {
    if (!/^\d+$/.test(portPart)) return false;
    const portNum = parseInt(portPart, 10);
    if (portNum < 1 || portNum > 65535) return false;
  }

  // Exact match against allowed loopback representations
  return (
    hostPart === '127.0.0.1' ||
    hostPart === 'localhost' ||
    hostPart === '::1' ||
    hostPart === '[::1]'
  );
}

/**
 * Validates request Origin header to ensure it strictly matches trusted loopback origins.
 * Prevents origin spoofing attacks like http://localhost.attacker.com or http://127.0.0.1.attacker.com.
 * @param {string} origin
 * @returns {boolean}
 */
export function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== 'string') return false;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const hostname = parsed.hostname.toLowerCase();
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
