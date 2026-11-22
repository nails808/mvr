-- Licence verification sessions (replaces Firebase RTDB /sessions)
CREATE TABLE IF NOT EXISTS verify_sessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  licence_number TEXT,
  licence_status TEXT,
  proficiency TEXT,
  licence_expiry TEXT,
  dob TEXT,
  licence_type TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  photo_r2_key TEXT,
  scanned_at INTEGER,
  created_row_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_verify_sessions_expires ON verify_sessions(expires_at);
