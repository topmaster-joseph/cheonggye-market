CREATE TABLE IF NOT EXISTS cgma_ai_education_responses (
  id TEXT PRIMARY KEY,
  response_key_hash TEXT NOT NULL UNIQUE,
  survey_version INTEGER NOT NULL,
  answers_json TEXT NOT NULL,
  feedback TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cgma_ai_education_created ON cgma_ai_education_responses(created_at);
CREATE TABLE IF NOT EXISTS cgma_ai_education_shares (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_cgma_ai_education_share_expires ON cgma_ai_education_shares(expires_at);
