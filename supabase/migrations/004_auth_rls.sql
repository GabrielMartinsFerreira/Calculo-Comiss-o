-- ============================================================
-- Autenticação e Row Level Security por Utilizador
-- Migração 004
-- EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================================

-- ── 1. Adicionar coluna user_id a todas as tabelas ───────────
ALTER TABLE public.service_orders
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.income_entries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.budget_settings
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.personal_loans
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── 2. Função trigger: auto-preenche user_id em cada INSERT ──
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

-- ── 3. Triggers por tabela ───────────────────────────────────
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

-- ── 4. Remover políticas anon antigas ───────────────────────
DROP POLICY IF EXISTS "anon_all" ON public.service_orders;
DROP POLICY IF EXISTS "anon_all" ON public.income_entries;
DROP POLICY IF EXISTS "anon_all" ON public.expense_entries;
DROP POLICY IF EXISTS "anon_all" ON public.budget_settings;
DROP POLICY IF EXISTS "anon_all" ON public.personal_loans;

-- ── 5. Criar políticas RLS por utilizador autenticado ────────
CREATE POLICY "user_own" ON public.service_orders
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.income_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.expense_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.budget_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_own" ON public.personal_loans
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- PASSO FINAL — Executar SEPARADAMENTE após:
-- 1. Criar conta em Authentication > Users > Add user
-- 2. Fazer login na aplicação pela primeira vez
-- 3. Abrir SQL Editor e descomentar + executar as linhas abaixo
-- ============================================================
-- UPDATE public.service_orders  SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE public.income_entries  SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE public.expense_entries SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE public.budget_settings SET user_id = auth.uid() WHERE user_id IS NULL;
-- UPDATE public.personal_loans  SET user_id = auth.uid() WHERE user_id IS NULL;
