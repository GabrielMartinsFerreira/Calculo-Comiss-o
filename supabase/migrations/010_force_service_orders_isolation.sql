-- ============================================================
-- Isolamento ROBUSTO de service_orders
-- Migração 010 — EXECUTAR NO SUPABASE SQL EDITOR (de uma só vez)
-- ============================================================
-- O teste de acesso anon mostrou que service_orders AINDA expunha linhas
-- após a 009. Causa provável: uma política permissiva remanescente com nome
-- diferente de "anon_all" (ex.: criada pelo painel, tipo "Enable read access
-- for all users"). A 009 só removeu "anon_all".
--
-- Esta migração apaga DINAMICAMENTE todas as políticas de service_orders
-- (qualquer nome) e recria apenas a user_own, garantindo o RLS ativo.
-- Idempotente.
-- ============================================================

-- ── 1. Apagar TODAS as políticas existentes em service_orders ──
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'service_orders'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.service_orders', pol.policyname);
  END LOOP;
END $$;

-- ── 2. Garantir RLS ativo ──
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- ── 3. Recriar APENAS a política correta (por utilizador) ──
CREATE POLICY "user_own" ON public.service_orders
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. Garantir o trigger de user_id ──
CREATE OR REPLACE TRIGGER trg_service_orders_user_id
  BEFORE INSERT ON public.service_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_user_id();

-- ── 5. VERIFICAÇÃO (o editor mostra o resultado desta query) ──
-- Esperado: rls_ativo = true  e  politicas = 'user_own'
SELECT
  c.relrowsecurity                                   AS rls_ativo,
  COALESCE(string_agg(p.policyname, ', '), '(nenhuma)') AS politicas
FROM pg_class c
LEFT JOIN pg_policies p
  ON p.schemaname = 'public' AND p.tablename = 'service_orders'
WHERE c.oid = 'public.service_orders'::regclass
GROUP BY c.relrowsecurity;
-- ============================================================
