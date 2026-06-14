-- ============================================================
-- Correção CRÍTICA de isolamento + Otimização (índices)
-- Migração 009 — EXECUTAR NO SUPABASE SQL EDITOR (de uma só vez)
-- ============================================================
-- Diagnóstico: a tabela public.service_orders estava com o RLS DESATIVADO.
-- Resultado: o filtro user_id = auth.uid() não era aplicado e TODAS as contas
-- (e até o papel anon, sem login) viam todas as ordens de serviço — vazamento
-- de dados de vendas/comissão entre clientes.
--
-- As 4 ordens existentes já têm dono (user_id preenchido), então NÃO há
-- backfill: basta reativar o RLS e garantir a política user_own. Quem é dono
-- continua dono; os demais deixam de ver.
--
-- Idempotente: pode rodar mais de uma vez sem efeitos colaterais.
-- ============================================================

-- ── 1. Reativar RLS em TODAS as tabelas multi-tenant (defensivo) ──
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.income_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_loans  ENABLE ROW LEVEL SECURITY;

-- ── 2. Remover qualquer política permissiva antiga (anon_all) ──
DROP POLICY IF EXISTS "anon_all" ON public.service_orders;
DROP POLICY IF EXISTS "anon_all" ON public.income_entries;
DROP POLICY IF EXISTS "anon_all" ON public.expense_entries;
DROP POLICY IF EXISTS "anon_all" ON public.budget_settings;
DROP POLICY IF EXISTS "anon_all" ON public.personal_loans;

-- ── 3. (Re)criar a política user_own em todas elas ──
DROP POLICY IF EXISTS "user_own" ON public.service_orders;
CREATE POLICY "user_own" ON public.service_orders
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_own" ON public.income_entries;
CREATE POLICY "user_own" ON public.income_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_own" ON public.expense_entries;
CREATE POLICY "user_own" ON public.expense_entries
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_own" ON public.budget_settings;
CREATE POLICY "user_own" ON public.budget_settings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "user_own" ON public.personal_loans;
CREATE POLICY "user_own" ON public.personal_loans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── 4. Garantir o trigger que injeta user_id em novos INSERTs ──
CREATE OR REPLACE TRIGGER trg_service_orders_user_id
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- ── 5. OTIMIZAÇÃO: índices compostos (user_id, competencia) ──
-- Aceleram o filtro por mês agora que toda query também filtra por user_id.
CREATE INDEX IF NOT EXISTS idx_service_orders_user_comp ON public.service_orders (user_id, competencia DESC);
CREATE INDEX IF NOT EXISTS idx_income_user_comp          ON public.income_entries  (user_id, competencia DESC);
CREATE INDEX IF NOT EXISTS idx_expense_user_comp         ON public.expense_entries (user_id, competencia DESC);

-- ============================================================
-- VERIFICAÇÃO (opcional) — rode e confira:
--   relrowsecurity deve ser TRUE para todas.
-- SELECT relname, relrowsecurity
-- FROM pg_class
-- WHERE relname IN ('service_orders','income_entries','expense_entries','budget_settings','personal_loans');
-- ============================================================
-- FIM DA MIGRAÇÃO 009
-- ============================================================
