-- Dedicated, CGMA-scoped festival tables. No cross-tenant membership data is copied.
CREATE TABLE IF NOT EXISTS cgma_festival2026_settings (
  event_id TEXT PRIMARY KEY,
  intake_open INTEGER NOT NULL DEFAULT 1 CHECK (intake_open IN (0,1)),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO cgma_festival2026_settings(event_id,intake_open) VALUES ('cgma-du-dream-2026',1);

CREATE TABLE IF NOT EXISTS cgma_festival2026_applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt TEXT NOT NULL UNIQUE,
  event_id TEXT NOT NULL CHECK(event_id='cgma-du-dream-2026'),
  shop_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  item_description TEXT NOT NULL,
  membership_choice TEXT NOT NULL CHECK(membership_choice IN ('regular','joining')),
  membership_verified INTEGER NOT NULL DEFAULT 0 CHECK(membership_verified IN(0,1)),
  other_support_selected INTEGER NOT NULL DEFAULT 0 CHECK(other_support_selected IN(0,1)),
  selection_state TEXT NOT NULL DEFAULT 'pending' CHECK(selection_state IN('pending','selected','waitlist','rejected')),
  privacy_consented_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id,shop_name,phone)
);
CREATE INDEX IF NOT EXISTS idx_cgma_festival2026_review ON cgma_festival2026_applications(event_id,selection_state,created_at);
