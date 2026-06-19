-- SafeState schema — 001_init
-- Portable across local Postgres (dev) and Aurora DSQL (prod).
-- DSQL rules honored: client-generated UUIDs (no SERIAL/sequences),
-- NO foreign-key constraints (relationships enforced in app),
-- minimal/portable DDL. Snapshot isolation + OCC handled in app layer.

CREATE TABLE IF NOT EXISTS manufacturers (
  id            uuid PRIMARY KEY,
  name          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_models (
  id              uuid PRIMARY KEY,
  manufacturer_id uuid NOT NULL,
  name            text NOT NULL,
  category        text NOT NULL,
  cpsc_ref        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_instances (
  id               uuid PRIMARY KEY,
  model_id         uuid NOT NULL,
  serial           text,
  current_owner_id uuid,
  status           text NOT NULL DEFAULT 'SAFE',
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ⭐ The conflict row: exactly one per model, carries the authoritative
-- safety epoch. BOTH issue-recall and authorize-transfer UPDATE this row,
-- which is what makes DSQL's OCC detect their conflict (OC000 / 40001).
CREATE TABLE IF NOT EXISTS safety_guard (
  model_id      uuid PRIMARY KEY,
  status        text NOT NULL DEFAULT 'SAFE',  -- SAFE | REPAIR_REQUIRED | RECALLED | DESTROYED
  epoch         bigint NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS safety_directives (
  id            uuid PRIMARY KEY,
  model_id      uuid NOT NULL,
  kind          text NOT NULL,                 -- RECALL | REPAIR | DESTROY
  hazard        text,
  remedy        text,
  source        text,                          -- e.g. 'CPSC'
  issued_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS directive_targets (
  id            uuid PRIMARY KEY,
  directive_id  uuid NOT NULL,
  scope         text NOT NULL,                 -- MODEL | LOT | SERIAL_RANGE | UNIT
  range_lo      text,
  range_hi      text
);

CREATE TABLE IF NOT EXISTS ownership_transfers (
  id            uuid PRIMARY KEY,
  instance_id   uuid NOT NULL,
  from_owner    uuid,
  to_owner      uuid NOT NULL,
  guard_epoch   bigint NOT NULL,
  committed_at  timestamptz NOT NULL DEFAULT now()
);

-- Idempotency + audit of every authorize-transfer call
CREATE TABLE IF NOT EXISTS transfer_attempts (
  idempotency_key text PRIMARY KEY,
  instance_id     uuid NOT NULL,
  decision        text NOT NULL,               -- AUTHORIZED | BLOCKED
  reason          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id            uuid PRIMARY KEY,
  actor         text,
  action        text NOT NULL,
  payload       jsonb,
  at            timestamptz NOT NULL DEFAULT now()
);

-- ── Backend-driven content (frontend hardcodes nothing) ───────────────
CREATE TABLE IF NOT EXISTS content_blocks (
  key           text PRIMARY KEY,
  surface       text,
  title         text,
  body_md       text,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS help_topics (
  topic_id       text PRIMARY KEY,             -- e.g. 'gate.verdict'
  title          text NOT NULL,
  body_md        text NOT NULL,
  learn_more_url text
);

CREATE TABLE IF NOT EXISTS tutorial_steps (
  id            uuid PRIMARY KEY,
  surface       text NOT NULL,                 -- gate | console | passport
  step_order    int  NOT NULL,
  anchor        text,
  title         text NOT NULL,
  body_md       text NOT NULL
);

-- AI Match Assistant results + manual-review queue
CREATE TABLE IF NOT EXISTS match_reviews (
  id                     uuid PRIMARY KEY,
  listing_ref            text,
  candidate_directive_id uuid,
  confidence             double precision,
  state                  text NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED
  created_at             timestamptz NOT NULL DEFAULT now()
);
