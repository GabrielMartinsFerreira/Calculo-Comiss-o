-- ============================================================
-- Evolução SaaS: Assinaturas, Cartões de Crédito,
-- Orçamentos por Categoria e Conciliação OFX
-- Migração 007 — EXECUTAR NO SUPABASE SQL EDITOR (de uma só vez)
-- ============================================================
-- Idempotente. Reutiliza a função public.set_user_id() criada na 004/006.
-- Mantém intacta a lógica de competência (1º dia do mês) e as
-- políticas RLS no padrão "user_own" (user_id = auth.uid()).
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- EVOLUÇÃO A — Assinaturas (Multi-Tenant / SaaS)
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                uuid          NOT NULL UNIQUE
                                       REFERENCES auth.users(id) ON DELETE CASCADE,
  status                 text          NOT NULL DEFAULT 'trial'
                                       CHECK (status IN ('trial','active','past_due','canceled')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user   ON public.subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);

-- updated_at automático (reutiliza set_updated_at criada na 001)
CREATE OR REPLACE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_id automático em INSERT direto pelo cliente (reutiliza set_user_id da 004)
CREATE OR REPLACE TRIGGER trg_subscriptions_user_id
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- RLS: cada utilizador vê/gere apenas a sua assinatura.
-- (A escrita real virá do webhook Stripe usando a service_role key, que ignora RLS.)
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own" ON public.subscriptions;
CREATE POLICY "user_own" ON public.subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── Trigger: cada novo utilizador recebe 14 dias de trial ────
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, status, current_period_end)
  VALUES (NEW.id, 'trial', now() + interval '14 days')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- ── Backfill: utilizadores existentes ganham assinatura ativa ──
-- (impede que o dono da conta seja bloqueado ao subir esta migração)
INSERT INTO public.subscriptions (user_id, status, current_period_end)
SELECT id, 'active', now() + interval '100 years'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- EVOLUÇÃO B — Cartões de Crédito e Faturas
-- ════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.credit_cards (
  id            uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid          REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text          NOT NULL,
  limit_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (limit_amount >= 0),
  closing_day   integer       CHECK (closing_day BETWEEN 1 AND 31),
  due_day       integer       CHECK (due_day BETWEEN 1 AND 31),
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON public.credit_cards (user_id);

CREATE OR REPLACE TRIGGER trg_credit_cards_updated_at
  BEFORE UPDATE ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_credit_cards_user_id
  BEFORE INSERT ON public.credit_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own" ON public.credit_cards;
CREATE POLICY "user_own" ON public.credit_cards
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Vincular despesas a um cartão (opcional). Mantém o payment_method existente.
ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS credit_card_id uuid
  REFERENCES public.credit_cards(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_credit_card
  ON public.expense_entries (credit_card_id, competencia)
  WHERE credit_card_id IS NOT NULL;


-- ════════════════════════════════════════════════════════════
-- EVOLUÇÃO C — Orçamentos por Categoria (Envelopes)
-- ════════════════════════════════════════════════════════════

-- Multi-tenant fix: budget_settings.competencia era UNIQUE global,
-- o que impedia dois utilizadores de terem o mesmo mês. Passa a ser
-- único por (user_id, competencia).
ALTER TABLE public.budget_settings
  DROP CONSTRAINT IF EXISTS budget_settings_competencia_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_budget_settings_user_comp
  ON public.budget_settings (user_id, competencia);

CREATE TABLE IF NOT EXISTS public.budget_categories (
  id                uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_setting_id uuid          NOT NULL
                                  REFERENCES public.budget_settings(id) ON DELETE CASCADE,
  user_id           uuid          REFERENCES auth.users(id) ON DELETE CASCADE,
  category_name     text          NOT NULL,
  allocated_amount  numeric(12,2) NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0),
  created_at        timestamptz   NOT NULL DEFAULT now(),
  updated_at        timestamptz   NOT NULL DEFAULT now(),
  UNIQUE (budget_setting_id, category_name)
);

CREATE INDEX IF NOT EXISTS idx_budget_categories_setting ON public.budget_categories (budget_setting_id);
CREATE INDEX IF NOT EXISTS idx_budget_categories_user    ON public.budget_categories (user_id);

CREATE OR REPLACE TRIGGER trg_budget_categories_updated_at
  BEFORE UPDATE ON public.budget_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_budget_categories_user_id
  BEFORE INSERT ON public.budget_categories
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own" ON public.budget_categories;
CREATE POLICY "user_own" ON public.budget_categories
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ════════════════════════════════════════════════════════════
-- EVOLUÇÃO D — Conciliação Bancária (OFX): dedup por FITID
-- ════════════════════════════════════════════════════════════
-- external_id guarda o <FITID> do extrato; o índice único parcial
-- impede que a mesma transação seja importada duas vezes.

ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS external_id text;

ALTER TABLE public.income_entries
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_external
  ON public.expense_entries (user_id, external_id)
  WHERE external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_income_external
  ON public.income_entries (user_id, external_id)
  WHERE external_id IS NOT NULL;

-- ============================================================
-- FIM DA MIGRAÇÃO 007
-- ============================================================
