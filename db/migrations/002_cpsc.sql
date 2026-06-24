-- Real CPSC recall feed (ingested from the public CPSC Recall API).
-- Kept separate from the demo fixtures so the demo runs off a frozen snapshot.

CREATE TABLE IF NOT EXISTS cpsc_recalls (
  recall_number text PRIMARY KEY,
  title         text,
  product       text,
  hazard        text,
  remedy        text,
  recall_date   text,
  url           text,
  category      text,
  ingested_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingest_runs (
  id      uuid PRIMARY KEY,
  source  text NOT NULL,
  count   int  NOT NULL,
  ran_at  timestamptz NOT NULL DEFAULT now()
);
