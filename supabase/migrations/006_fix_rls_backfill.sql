-- ============================================================
-- Correção de RLS + Backfill de user_id (NÃO perde dados)
-- Migração 006
-- EXECUTAR NO SUPABASE SQL EDITOR (de uma só vez)
-- ============================================================
--
-- Contexto: a migração 004 foi parcialmente aplicada — as colunas
-- user_id existem, mas:
--   1. as políticas antigas "anon_all" continuam ativas (falha de segurança)
--   2. os dados existentes ficaram com user_id = NULL (invisíveis após login)
--
-- Este script é idempotente e deixa tudo no estado correto.
-- ============================================================

-- ── 1. Garantir RLS ativo em todas as tabelas ────────────────
ALTER TABLE public.service_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_loans   ENABLE ROW LEVEL SECURITY;

-- ── 2. (Re)criar função que preenche user_id em cada INSERT ──
CREATE OR REPLACE FUNCTION public.set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_service_orders_user_id
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE OR REPLACE TRIGGER trg_income_entries_user_id
  BEFORE INSERT ON public.income_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE OR REPLACE TRIGGER trg_expense_entries_user_id
  BEFORE INSERT ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE OR REPLACE TRIGGER trg_budget_settings_user_id
  BEFORE INSERT ON public.budget_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

CREATE OR REPLACE TRIGGER trg_personal_loans_user_id
  BEFORE INSERT ON public.personal_loans
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- ── 3. Remover políticas antigas permissivas (fecha o buraco anon) ──
DROP POLICY IF EXISTS "anon_all" ON public.service_orders;
DROP POLICY IF EXISTS "anon_all" ON public.income_entries;
DROP POLICY IF EXISTS "anon_all" ON public.expense_entries;
DROP POLICY IF EXISTS "anon_all" ON public.budget_settings;
DROP POLICY IF EXISTS "anon_all" ON public.personal_loans;

-- Recriar limpo (drop + create garante consistência)
DROP POLICY IF EXISTS "user_own" ON public.service_orders;
DROP POLICY IF EXISTS "user_own" ON public.income_entries;
DROP POLICY IF EXISTS "user_own" ON public.expense_entries;
DROP POLICY IF EXISTS "user_own" ON public.budget_settings;
DROP POLICY IF EXISTS "user_own" ON public.personal_loans;

-- ── 4. Criar políticas RLS por utilizador autenticado ────────
CREATE POLICY "user_own" ON public.service_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.income_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.expense_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.budget_settings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.personal_loans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 5. BACKFILL: reconectar dados existentes à sua conta ─────
-- Ajuste o email abaixo se a conta criada em Authentication > Users for outra.
DO $$
DECLARE
  uid uuid;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = 'gabrielmf2013@gmail.com' LIMIT 1;

  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nenhum utilizador encontrado com o email indicado. Edite o email no passo 5 e volte a executar.';
  END IF;

  UPDATE public.service_orders   SET user_id = uid WHERE user_id IS NULL;
  UPDATE public.income_entries   SET user_id = uid WHERE user_id IS NULL;
  UPDATE public.expense_entries  SET user_id = uid WHERE user_id IS NULL;
  UPDATE public.budget_settings  SET user_id = uid WHERE user_id IS NULL;
  UPDATE public.personal_loans   SET user_id = uid WHERE user_id IS NULL;

  RAISE NOTICE 'Backfill concluído. Todos os dados órfãos foram associados ao utilizador %', uid;
END $$;
