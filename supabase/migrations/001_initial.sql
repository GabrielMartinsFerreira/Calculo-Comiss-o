-- ============================================================
-- Sistema de Controle de Comissionamento Comercial
-- Migração 001 — Schema inicial
-- ============================================================

-- Tabela principal de Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.service_orders (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  os_number       text          NOT NULL,
  client_name     text          NOT NULL,
  order_date      date          NOT NULL,
  order_value     numeric(12,2) NOT NULL CHECK (order_value > 0),
  payment_method  text          NOT NULL CHECK (payment_method IN ('Pix', 'Boleto', 'Cartão')),
  status          text          NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Pago')),
  -- competencia armazena o primeiro dia do mês de competência (para filtros mensais)
  competencia     date          NOT NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Índices para performance nas queries mais frequentes
CREATE INDEX IF NOT EXISTS idx_service_orders_competencia ON public.service_orders (competencia DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_status      ON public.service_orders (status);
CREATE INDEX IF NOT EXISTS idx_service_orders_os_number   ON public.service_orders (os_number);

-- Trigger: atualiza updated_at automaticamente em cada UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_service_orders_updated_at
  BEFORE UPDATE ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security (RLS) — single-user com anon key
-- A anon key já protege o acesso externo.
-- Política "anon_all" libera operações para quem possui a chave.
-- Para multi-usuário com login, substituir TO anon por TO authenticated
-- e adicionar USING (user_id = auth.uid()).
-- ============================================================

ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON public.service_orders
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- (comentado — para uso futuro com autenticação)
-- CREATE POLICY "Allow all for authenticated users"
--   ON public.service_orders
--   FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);
--
-- CREATE POLICY "Allow read for anon"
--   ON public.service_orders
--   FOR SELECT
--   TO anon
--   USING (true);

-- ============================================================
-- View auxiliar: resumo mensal (opcional, para uso futuro)
-- ============================================================
CREATE OR REPLACE VIEW public.monthly_summary
WITH (security_invoker = on) AS
SELECT
  competencia,
  COUNT(*)                                              AS total_orders,
  COUNT(*) FILTER (WHERE status = 'Pago')              AS count_pago,
  COUNT(*) FILTER (WHERE status = 'Pendente')          AS count_pendente,
  COALESCE(SUM(order_value), 0)                        AS total_previsto,
  COALESCE(SUM(order_value) FILTER (WHERE status = 'Pago'), 0) AS total_pago,
  -- Comissão: calculada pela regra de faixas (flat rate sobre o total pago do mês)
  CASE
    WHEN COALESCE(SUM(order_value) FILTER (WHERE status = 'Pago'), 0) <= 50000
      THEN COALESCE(SUM(order_value) FILTER (WHERE status = 'Pago'), 0) * 0.015
    WHEN COALESCE(SUM(order_value) FILTER (WHERE status = 'Pago'), 0) <= 70000
      THEN COALESCE(SUM(order_value) FILTER (WHERE status = 'Pago'), 0) * 0.020
    ELSE
      COALESCE(SUM(order_value) FILTER (WHERE status = 'Pago'), 0) * 0.025
  END                                                  AS comissao_real
FROM public.service_orders
GROUP BY competencia
ORDER BY competencia DESC;
