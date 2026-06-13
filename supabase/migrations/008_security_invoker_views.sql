-- ============================================================
-- Correção de Segurança: views com SECURITY DEFINER
-- Migração 008 — EXECUTAR NO SUPABASE SQL EDITOR
-- ============================================================
-- O linter do Supabase apontou (CRITICAL) que as views
--   public.monthly_summary  e  public.monthly_finance_summary
-- eram SECURITY DEFINER (padrão antigo do Postgres): rodavam com as
-- permissões do DONO (postgres), que IGNORA o RLS.
--
-- Como o Supabase expõe views automaticamente na API REST, um utilizador
-- autenticado poderia chamar, por ex., GET /rest/v1/monthly_finance_summary
-- e ver os agregados financeiros de TODOS os utilizadores — vazamento
-- entre contas (multi-tenant).
--
-- `security_invoker = on` faz a view rodar com as permissões/RLS de QUEM
-- consulta: cada utilizador passa a ver apenas os próprios dados.
-- Requer Postgres 15+ (padrão no Supabase). Idempotente.
-- ============================================================

ALTER VIEW IF EXISTS public.monthly_summary         SET (security_invoker = on);
ALTER VIEW IF EXISTS public.monthly_finance_summary SET (security_invoker = on);

-- ============================================================
-- FIM DA MIGRAÇÃO 008
-- ============================================================
