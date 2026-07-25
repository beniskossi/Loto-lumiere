-- SQL migration for Strict Model Versioning & Immutable Ledger
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family TEXT NOT NULL,                 -- dirichlet | logistic | markov | ensemble
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  code_commit TEXT NOT NULL DEFAULT 'v1.0.0',
  status TEXT NOT NULL DEFAULT 'candidate',  -- candidate | shadow | champion | retired
  promoted_at TIMESTAMPTZ,
  promoted_by UUID,
  retired_reason TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS one_champion
  on model_versions (family) WHERE status = 'champion';

CREATE TABLE IF NOT EXISTS prediction_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_version_id UUID REFERENCES model_versions(id),
  algorithm_name TEXT NOT NULL,
  draw_name TEXT NOT NULL DEFAULT 'Loto 5/90',
  target_draw_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  distribution JSONB NOT NULL DEFAULT '[]'::jsonb,          -- 90 probabilités
  proposed_numbers INT[] NOT NULL,
  confidence_declared NUMERIC NOT NULL DEFAULT 0.0556,
  rng_seed BIGINT NOT NULL DEFAULT 0,
  data_snapshot_hash TEXT NOT NULL DEFAULT 'initial_hash',     -- empêche la réécriture de l'historique
  UNIQUE (algorithm_name, target_draw_date)
);

-- Trigger pour vérifier que target_draw_date est strictement postérieure à created_at
CREATE OR REPLACE FUNCTION verify_ledger_target_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.target_draw_date <= NEW.created_at::DATE THEN
    RAISE EXCEPTION 'target_draw_date (%) doit être strictement postérieure à created_at (%)', NEW.target_draw_date, NEW.created_at::DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_target_date ON prediction_ledger;
CREATE TRIGGER trg_ledger_target_date
  BEFORE INSERT ON prediction_ledger
  FOR EACH ROW
  EXECUTE FUNCTION verify_ledger_target_date();

CREATE TABLE IF NOT EXISTS prediction_outcome (
  ledger_id UUID PRIMARY KEY REFERENCES prediction_ledger(id) ON DELETE CASCADE,
  winning_numbers INT[] NOT NULL,
  matches INT NOT NULL,
  log_score DOUBLE PRECISION NOT NULL,
  brier_score DOUBLE PRECISION NOT NULL,
  baseline_log_score DOUBLE PRECISION NOT NULL,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
