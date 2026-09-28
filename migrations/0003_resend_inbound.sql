PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  external_id TEXT,
  payload_json TEXT,
  processed_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_events_external ON webhook_events(provider, external_id);

INSERT OR IGNORE INTO settings(key,value,updated_at) VALUES
('scheduling_email_senders','Info@DraYdania.com,longevity@DraYdania.com,admin@DraYdania.com',datetime('now')),
('scheduling_email_address','agenda@agenda.draydania.com',datetime('now'));
