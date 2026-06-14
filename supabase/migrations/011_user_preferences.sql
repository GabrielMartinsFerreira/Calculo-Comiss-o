-- ============================================================
-- Preferências por utilizador (sincronizadas entre aparelhos)
-- Migração 011 — EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================================
-- Guarda flags de comportamento (ex.: "Comissão automática") atreladas à
-- CONTA, não ao dispositivo. Coluna JSONB para ser extensível sem novas
-- migrações. RLS no padrão user_own + trigger set_user_id.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON public.user_preferences (user_id);

-- updated_at automático (reutiliza set_updated_at da 001)
CREATE OR REPLACE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_id automático em INSERT (reutiliza set_user_id da 004)
CREATE OR REPLACE TRIGGER trg_user_preferences_user_id
  BEFORE INSERT ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- RLS: cada utilizador só vê/gere as próprias preferências
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own" ON public.user_preferences;
CREATE POLICY "user_own" ON public.user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- FIM DA MIGRAÇÃO 011
-- ============================================================
