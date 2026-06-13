-- ============================================================
-- Módulo de Gestão Financeira Pessoal
-- Migração 002
-- ============================================================

-- Receitas (Fixas e Variáveis)
CREATE TABLE IF NOT EXISTS public.income_entries (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia     date          NOT NULL,
  description     text          NOT NULL,
  category        text          NOT NULL CHECK (category IN ('Salário','Benefício','Transporte','Comissão','Outro')),
  type            text          NOT NULL CHECK (type IN ('Fixo','Variável')),
  amount          numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  due_description text,                                      -- "5º Dia Útil", "Dia 20-23"
  is_commission   boolean       NOT NULL DEFAULT false,      -- valor vem do módulo de OS
  is_recurring    boolean       NOT NULL DEFAULT false,      -- replica para novos meses
  status          text          NOT NULL DEFAULT 'Pendente'
                  CHECK (status IN ('Pendente','Recebido')),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Despesas (Fixas e Variáveis)
CREATE TABLE IF NOT EXISTS public.expense_entries (
  id              uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia     date          NOT NULL,
  description     text          NOT NULL,
  category        text          NOT NULL
                  CHECK (category IN ('Assinatura','Saúde','Cartão','Alimentação','Transporte','Lazer','Parcela','Outro')),
  type            text          NOT NULL CHECK (type IN ('Fixo','Variável')),
  amount          numeric(12,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  due_day         integer       CHECK (due_day BETWEEN 1 AND 31),
  is_recurring    boolean       NOT NULL DEFAULT false,
  status          text          NOT NULL DEFAULT 'Pendente'
                  CHECK (status IN ('Pendente','Pago','Aguardando')),
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- Configurações de orçamento por mês (limite de despesas variáveis)
CREATE TABLE IF NOT EXISTS public.budget_settings (
  id                      uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  competencia             date          UNIQUE NOT NULL,
  variable_expense_limit  numeric(12,2),
  notes                   text,
  created_at              timestamptz   NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_income_competencia  ON public.income_entries  (competencia DESC);
CREATE INDEX IF NOT EXISTS idx_expense_competencia ON public.expense_entries (competencia DESC);
CREATE INDEX IF NOT EXISTS idx_income_recurring    ON public.income_entries  (is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_expense_recurring   ON public.expense_entries (is_recurring) WHERE is_recurring = true;

-- Triggers updated_at
CREATE OR REPLACE TRIGGER trg_income_updated_at
  BEFORE UPDATE ON public.income_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_expense_updated_at
  BEFORE UPDATE ON public.expense_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Row Level Security — single-user com anon key
-- ============================================================
ALTER TABLE public.income_entries  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON public.income_entries
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all" ON public.expense_entries
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_all" ON public.budget_settings
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- SEED: Receitas Fixas Recorrentes (baseado na planilha)
-- Competência = mês atual para facilitar o primeiro acesso
-- ============================================================
DO $$
DECLARE
  comp date := date_trunc('month', current_date)::date;
BEGIN
  -- Inserir apenas se não existir receita recorrente no mês atual
  IF NOT EXISTS (SELECT 1 FROM public.income_entries WHERE competencia = comp AND is_recurring = true) THEN
    INSERT INTO public.income_entries (competencia, description, category, type, amount, due_description, is_recurring, status) VALUES
      (comp, '60% Salário',     'Salário',    'Fixo',     1041.18, '5º Dia Útil',  true,  'Pendente'),
      (comp, '40% Salário',     'Salário',    'Fixo',      800.00, 'Dia 20 a 23',  true,  'Pendente'),
      (comp, 'Alimentação',     'Benefício',  'Fixo',      600.00, 'Mês Todo',     true,  'Pendente'),
      (comp, 'Transporte',      'Transporte', 'Fixo',      222.60, 'Mês Todo',     true,  'Pendente'),
      (comp, 'Comissão do Mês', 'Comissão',   'Variável',    0.00, 'Após Fechamento', true, 'Pendente');
  END IF;
END;
$$;

-- ============================================================
-- SEED: Despesas Fixas Recorrentes (baseado na planilha)
-- ============================================================
DO $$
DECLARE
  comp date := date_trunc('month', current_date)::date;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.expense_entries WHERE competencia = comp AND is_recurring = true) THEN
    INSERT INTO public.expense_entries (competencia, description, category, type, amount, due_day, is_recurring, status) VALUES
      (comp, 'Academia',         'Saúde',       'Fixo',  139.90,  3,  true, 'Pendente'),
      (comp, 'Google One',       'Assinatura',  'Fixo',    9.99, 11,  true, 'Pendente'),
      (comp, 'YouTube Music',    'Assinatura',  'Fixo',   27.00, 12,  true, 'Pendente'),
      (comp, 'Google Serviços',  'Assinatura',  'Fixo',  100.00, 12,  true, 'Pendente'),
      (comp, 'Crunch',           'Assinatura',  'Fixo',   21.00, 26,  true, 'Pendente'),
      (comp, 'Convênio Médico',  'Saúde',       'Fixo',  372.00, 10,  true, 'Pendente');
  END IF;
END;
$$;

-- ============================================================
-- View: Resumo financeiro mensal
-- ============================================================
CREATE OR REPLACE VIEW public.monthly_finance_summary
WITH (security_invoker = on) AS
SELECT
  COALESCE(i.competencia, e.competencia) AS competencia,
  COALESCE(SUM(i.amount) FILTER (WHERE i.type = 'Fixo'),    0) AS total_income_fixed,
  COALESCE(SUM(i.amount) FILTER (WHERE i.type = 'Variável'), 0) AS total_income_variable,
  COALESCE(SUM(i.amount), 0)                                     AS total_income,
  COALESCE(SUM(i.amount) FILTER (WHERE i.status = 'Recebido'), 0) AS total_income_received,
  COALESCE(SUM(e.amount) FILTER (WHERE e.type = 'Fixo'),    0) AS total_expense_fixed,
  COALESCE(SUM(e.amount) FILTER (WHERE e.type = 'Variável'), 0) AS total_expense_variable,
  COALESCE(SUM(e.amount), 0)                                     AS total_expense,
  COALESCE(SUM(e.amount) FILTER (WHERE e.status = 'Pago'),  0) AS total_expense_paid
FROM
  (SELECT competencia, amount, type, status FROM public.income_entries)  i
  FULL OUTER JOIN
  (SELECT competencia, amount, type, status FROM public.expense_entries) e
  USING (competencia)
GROUP BY COALESCE(i.competencia, e.competencia)
ORDER BY competencia DESC;
