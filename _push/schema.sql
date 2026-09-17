CREATE TABLE IF NOT EXISTS devices (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL,
 endpoint TEXT NOT NULL UNIQUE,
 subscription TEXT NOT NULL,
 config TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT '{}',
 revision INTEGER NOT NULL DEFAULT 0,
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS deliveries (
 device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
 event_id TEXT NOT NULL,
 payload TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 sent_at INTEGER,
 attempts INTEGER NOT NULL DEFAULT 0,
 next_attempt INTEGER NOT NULL DEFAULT 0,
 lease TEXT,
 PRIMARY KEY(device_id,event_id)
);
CREATE INDEX IF NOT EXISTS deliveries_due ON deliveries(sent_at,next_attempt,created_at);
