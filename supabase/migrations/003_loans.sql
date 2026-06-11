-- ============================================================
-- Módulo de Empréstimos Pessoais
-- Migração 003
-- ============================================================

-- Tabela mestre de empréstimos
CREATE TABLE IF NOT EXISTS public.personal_loans (
  id                     uuid          DEFAULT gen_random_uuid() PRIMARY KEY,
  debtor_name            text          NOT NULL,
  description            text,
  installment_amount     numeric(12,2) NOT NULL CHECK (installment_amount > 0),
  total_installments     integer       NOT NULL CHECK (total_installments > 0),
  remaining_installments integer       NOT NULL CHECK (remaining_installments >= 0),
  due_day                integer       CHECK (due_day BETWEEN 1 AND 31),
  status                 text          NOT NULL DEFAULT 'Ativo'
                         CHECK (status IN ('Ativo', 'Quitado')),
  start_competencia      date          NOT NULL,
  created_at             timestamptz   NOT NULL DEFAULT now(),
  updated_at             timestamptz   NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER trg_loans_updated_at
  BEFORE UPDATE ON public.personal_loans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_loans_status ON public.personal_loans (status);
CREATE INDEX IF NOT EXISTS idx_loans_start  ON public.personal_loans (start_competencia DESC);

-- RLS
ALTER TABLE public.personal_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_all" ON public.personal_loans
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
-- Adicionar loan_id em income_entries
-- ============================================================
ALTER TABLE public.income_entries
  ADD COLUMN IF NOT EXISTS loan_id uuid REFERENCES public.personal_loans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_income_loan ON public.income_entries (loan_id) WHERE loan_id IS NOT NULL;

-- ============================================================
-- Atualizar constraint de categoria para incluir 'Empréstimo'
-- ============================================================
ALTER TABLE public.income_entries
  DROP CONSTRAINT IF EXISTS income_entries_category_check;

ALTER TABLE public.income_entries
  ADD CONSTRAINT income_entries_category_check
  CHECK (category IN ('Salário','Benefício','Transporte','Comissão','Empréstimo','Outro'));
