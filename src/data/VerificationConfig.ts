/**
 * Mirrors original VerificationConfig.kt
 * Firebase Realtime Database used for short-lived verification sessions.
 */
export const VerificationConfig = {
  FIREBASE_DB_URL:
    'https://mvr-verify-default-rtdb.asia-southeast1.firebasedatabase.app',
  FIREBASE_PROJECT_ID: 'mvr-verify',
  /** 2 minutes */
  SESSION_TTL_MS: 120_000,
  VERIFY_PAGE: 'https://mvr-verify.web.app/verify.html',

  get dbBaseUrl() {
    return this.FIREBASE_DB_URL;
  },

  get verifyPage() {
    return this.VERIFY_PAGE;
  },

  isConfigured(): boolean {
    return true;
  },
} as const;
