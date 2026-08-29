/**
 * User-facing error text shared by the API routes and the client.
 * No `server-only` here so components can use it too.
 */

const NETWORK_PATTERN =
  /failed to fetch|networkerror|network error|load failed|fetch failed|err_network|typeerror/i
const SESSION_PATTERN = /\b401\b|unauthorized|session/i
const RATE_PATTERN = /\b429\b|too many requests|rate limit/i
const BUSY_PATTERN =
  /\b(500|502|503|504)\b|internal server error|overloaded|temporarily (unavailable|busy)/i
const TECHNICAL_PATTERN =
  /\n| at |\.(ts|tsx|js|jsx):|https?:\/\/|\{|\}|Cannot |undefined|NaN|\[object /i

const DEFAULT_STREAM_FALLBACK =
  "The assistant couldn't respond. Please try again."

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024)
    return `${Number.isInteger(mb) ? mb : mb.toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${bytes} B`
}

function extractMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '')
  try {
    const parsed = JSON.parse(raw) as unknown
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'error' in parsed &&
      typeof (parsed as { error?: unknown }).error === 'string'
    ) {
      return (parsed as { error: string }).error
    }
  } catch {
    // Not JSON — keep the raw message.
  }
  return raw
}

/**
 * Turns an error (usually from `useChat` or a failed `fetch`) into text a user
 * can act on. Our own API messages are short, human sentences and pass through
 * untouched; technical/upstream errors are mapped to friendly guidance.
 */
export function friendlyStreamError(
  error: unknown,
  fallback: string = DEFAULT_STREAM_FALLBACK
): string {
  const message = extractMessage(error)
  const lower = message.toLowerCase()

  if (NETWORK_PATTERN.test(lower)) {
    return "Couldn't reach the server. Check your connection and try again."
  }
  if (SESSION_PATTERN.test(lower)) {
    return 'Your session expired. Unlock the app and try again.'
  }
  if (RATE_PATTERN.test(lower)) {
    return 'Too many requests right now. Wait a moment and try again.'
  }
  if (BUSY_PATTERN.test(lower)) {
    return 'The server is temporarily busy. Try again in a moment.'
  }
  if (message.length > 0 && !TECHNICAL_PATTERN.test(message)) {
    return message
  }
  return fallback
}
