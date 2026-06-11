-- ============================================================
-- Forma de Pagamento em Despesas
-- Migração 005
-- ============================================================

ALTER TABLE public.expense_entries
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'Dinheiro'
  CHECK (payment_method IN ('Dinheiro', 'Pix', 'Débito', 'Cartão de Crédito'));

-- Índice parcial para queries de fatura do cartão
CREATE INDEX IF NOT EXISTS idx_expense_payment_cc
  ON public.expense_entries (competencia, status)
  WHERE payment_method = 'Cartão de Crédito';
