/**
 * Verification session API + public verify page.
 * Replaces Firebase RTDB + Firebase Hosting (mvr-verify).
 *
 * Set at build time:
 *   VITE_VERIFY_API_URL   — Worker origin, e.g. https://mvr-verify-api.<sub>.workers.dev
 *   VITE_VERIFY_PAGE_URL  — full URL to verify.html (often same Worker origin + /verify.html)
 */

const DEFAULT_API =
  (import.meta.env.VITE_VERIFY_API_URL as string | undefined)?.replace(/\/+$/, '') || '';
const DEFAULT_PAGE =
  (import.meta.env.VITE_VERIFY_PAGE_URL as string | undefined)?.trim() ||
  (DEFAULT_API ? `${DEFAULT_API}/verify.html` : '');

/** Optional write key when Worker has VERIFY_WRITE_KEY set */
const WRITE_KEY =
  (import.meta.env.VITE_VERIFY_WRITE_KEY as string | undefined)?.trim() || '';

export const VerificationConfig = {
  /** Worker API base (no trailing slash) */
  get apiBaseUrl() {
    return DEFAULT_API;
  },

  /** Public verify page URL (QR content target) */
  get verifyPage() {
    return DEFAULT_PAGE;
  },

  /** @deprecated use apiBaseUrl — kept for call-site clarity */
  get dbBaseUrl() {
    return DEFAULT_API;
  },

  get writeKey() {
    return WRITE_KEY;
  },

  /** 2 minutes */
  SESSION_TTL_MS: 120_000,

  isConfigured(): boolean {
    return Boolean(DEFAULT_API && DEFAULT_PAGE);
  },
};
