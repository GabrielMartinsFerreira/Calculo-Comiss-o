-- ============================================================
-- Migração 012 — Serviços Recorrentes (Assinaturas pessoais)
-- ============================================================
-- Cria `recurring_services` para rastrear assinaturas mensais
-- no cartão (Netflix, Spotify, etc.) por conta de utilizador.
-- NOTA: não usar o nome `subscriptions` — já existe para SaaS (007).
-- Cada serviço ativo gera automaticamente um lançamento em
-- `expense_entries` ao inicializar um novo mês.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recurring_services (
  id               uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid          REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name     text          NOT NULL,
  amount           numeric(12,2) NOT NULL CHECK (amount > 0),
  billing_day      integer       NOT NULL CHECK (billing_day BETWEEN 1 AND 31),
  credit_card_id   uuid          REFERENCES public.credit_cards(id) ON DELETE SET NULL,
  category         text          NOT NULL DEFAULT 'Assinatura'
                                 CHECK (category IN (
                                   'Assinatura','Saúde','Cartão','Alimentação',
                                   'Transporte','Lazer','Parcela','Outro'
                                 )),
  status           text          NOT NULL DEFAULT 'Ativo'
                                 CHECK (status IN ('Ativo','Pausado')),
  created_at       timestamptz   NOT NULL DEFAULT now(),
  updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_services_user
  ON public.recurring_services (user_id);

CREATE INDEX IF NOT EXISTS idx_recurring_services_card
  ON public.recurring_services (credit_card_id)
  WHERE credit_card_id IS NOT NULL;

-- updated_at automático (reutiliza função criada na 001)
CREATE OR REPLACE TRIGGER trg_recurring_services_updated_at
  BEFORE UPDATE ON public.recurring_services
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- user_id automático no INSERT (reutiliza função criada na 004)
CREATE OR REPLACE TRIGGER trg_recurring_services_user_id
  BEFORE INSERT ON public.recurring_services
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.recurring_services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own" ON public.recurring_services;
CREATE POLICY "user_own" ON public.recurring_services
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Vincula despesas geradas pela assinatura à sua origem.
-- Permite dedup por (recurring_service_id, competencia) em vez de
-- depender da descrição, e rastrear qual entry veio de qual serviço.
ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS recurring_service_id uuid
  REFERENCES public.recurring_services(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_expense_recurring_service
  ON public.expense_entries (recurring_service_id, competencia)
  WHERE recurring_service_id IS NOT NULL;

-- ============================================================
-- FIM DA MIGRAÇÃO 012
-- ============================================================
