-- Phone Check: начальная схема
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');
CREATE TYPE customer_status AS ENUM ('active', 'merged', 'deleted');
CREATE TYPE consent_status AS ENUM ('granted', 'withdrawn', 'unknown');
CREATE TYPE channel_type AS ENUM ('facebook', 'messenger', 'telegram', 'viber', 'whatsapp');
CREATE TYPE batch_status AS ENUM ('queued', 'processing', 'completed', 'failed', 'expired');
CREATE TYPE match_status AS ENUM ('exact_match', 'multiple_matches', 'not_found', 'invalid_phone', 'needs_review');
CREATE TYPE review_decision AS ENUM ('confirmed', 'rejected');

-- Пользователи и сессии -------------------------------------------------------
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         citext NOT NULL UNIQUE,
  name          text NOT NULL,
  password_hash text NOT NULL,
  role          user_role NOT NULL DEFAULT 'viewer',
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash   bytea PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL,
  ip           inet,
  user_agent   text
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expires_idx ON sessions(expires_at);

CREATE TABLE login_attempts (
  id      bigserial PRIMARY KEY,
  email   citext NOT NULL,
  ip      inet,
  success boolean NOT NULL,
  at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX login_attempts_email_idx ON login_attempts(email, at DESC);
CREATE INDEX login_attempts_ip_idx ON login_attempts(ip, at DESC);

-- CRM ---------------------------------------------------------------------------
CREATE TABLE customers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_ref   text NOT NULL UNIQUE,              -- Customer ID в CRM
  full_name_enc  text NOT NULL,
  email_enc      text,
  status         customer_status NOT NULL DEFAULT 'active',
  source         text NOT NULL,                     -- откуда клиент попал в CRM
  consent_status consent_status NOT NULL DEFAULT 'unknown',
  consent_at     timestamptz,
  consent_source text,
  notes_enc      text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE customer_phones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  phone_hash   bytea NOT NULL,
  phone_enc    text NOT NULL,
  country      char(2),
  label        text,
  is_verified  boolean NOT NULL DEFAULT false,
  is_active    boolean NOT NULL DEFAULT true,
  source       text NOT NULL,
  collected_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, phone_hash)
);
CREATE INDEX customer_phones_hash_idx ON customer_phones(phone_hash);

CREATE TABLE customer_channels (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel        channel_type NOT NULL,
  value_enc      text NOT NULL,
  source         text NOT NULL,
  consent_status consent_status NOT NULL DEFAULT 'unknown',
  consent_at     timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, channel)
);

-- Пакеты проверки ---------------------------------------------------------------
CREATE TABLE batches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by     uuid NOT NULL REFERENCES users(id),
  file_name      text NOT NULL,
  file_size      integer NOT NULL,
  file_type      text NOT NULL CHECK (file_type IN ('csv', 'xlsx')),
  status         batch_status NOT NULL DEFAULT 'queued',
  total_rows     integer NOT NULL DEFAULT 0,
  processed_rows integer NOT NULL DEFAULT 0,
  unique_phones  integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  phone_column   text,
  error          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  started_at     timestamptz,
  finished_at    timestamptz,
  expires_at     timestamptz NOT NULL
);
CREATE INDEX batches_created_idx ON batches(created_at DESC);

CREATE TABLE upload_blobs (
  batch_id    uuid PRIMARY KEY REFERENCES batches(id) ON DELETE CASCADE,
  content_enc bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE check_results (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        uuid NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  seq             integer NOT NULL,                  -- порядок в таблице
  row_number      integer NOT NULL,                  -- первая строка в файле
  occurrences     integer NOT NULL DEFAULT 1,
  raw_input_enc   text NOT NULL,
  phone_masked    text NOT NULL,                     -- для аудита: +38067*****67
  phone_enc       text,
  phone_hash      bytea,
  country         char(2),
  status          match_status NOT NULL,
  confidence      smallint,
  customer_id     uuid REFERENCES customers(id) ON DELETE SET NULL,
  candidate_ids   uuid[] NOT NULL DEFAULT '{}',
  match_reason    text,
  review_decision review_decision,
  reviewed_by     uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  review_note_enc text,
  UNIQUE (batch_id, seq)
);
CREATE INDEX check_results_batch_status_idx ON check_results(batch_id, status, seq);
CREATE INDEX check_results_batch_hash_idx ON check_results(batch_id, phone_hash);
CREATE INDEX check_results_customer_idx ON check_results(customer_id);

-- Аудит (append-only) -----------------------------------------------------------
CREATE TABLE audit_log (
  id          bigserial PRIMARY KEY,
  at          timestamptz NOT NULL DEFAULT now(),
  actor_id    uuid,
  actor_email text,
  action      text NOT NULL,
  entity_type text,
  entity_id   text,
  details     jsonb NOT NULL DEFAULT '{}',
  ip          inet,
  user_agent  text
);
CREATE INDEX audit_log_at_idx ON audit_log(at DESC);
CREATE INDEX audit_log_actor_idx ON audit_log(actor_id, at DESC);
CREATE INDEX audit_log_entity_idx ON audit_log(entity_type, entity_id);
CREATE INDEX audit_log_action_idx ON audit_log(action, at DESC);

CREATE TABLE audit_batch_items (
  id           bigserial PRIMARY KEY,
  audit_id     bigint NOT NULL REFERENCES audit_log(id),
  batch_id     uuid NOT NULL,
  phone_masked text NOT NULL,
  phone_hash   bytea,
  status       match_status NOT NULL,
  customer_ref text
);
CREATE INDEX audit_batch_items_audit_idx ON audit_batch_items(audit_id, id);
CREATE INDEX audit_batch_items_hash_idx ON audit_batch_items(phone_hash);

CREATE FUNCTION audit_is_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit tables are append-only (% on %)', TG_OP, TG_TABLE_NAME;
END $$;

CREATE TRIGGER audit_log_no_change BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION audit_is_append_only();
CREATE TRIGGER audit_log_no_truncate BEFORE TRUNCATE ON audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION audit_is_append_only();
CREATE TRIGGER audit_batch_items_no_change BEFORE UPDATE OR DELETE ON audit_batch_items
  FOR EACH ROW EXECUTE FUNCTION audit_is_append_only();
CREATE TRIGGER audit_batch_items_no_truncate BEFORE TRUNCATE ON audit_batch_items
  FOR EACH STATEMENT EXECUTE FUNCTION audit_is_append_only();
