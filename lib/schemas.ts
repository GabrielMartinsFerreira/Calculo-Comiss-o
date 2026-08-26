import { z } from "zod";

/**
 * Validação de runtime para os pontos de escrita alimentados por input do
 * usuário (formulários, importação OFX). Espelha as CHECK constraints do
 * banco — a defesa real já está lá (RLS + constraints); isto só antecipa o
 * erro com uma mensagem legível antes do round-trip ao Postgres.
 *
 * Não valida escritas internas derivadas de dados já confiáveis (cópia de
 * recorrentes, sincronização de comissão, parcela automática de empréstimo)
 * — seria overhead sem ganho de segurança.
 */

const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (esperado AAAA-MM-DD)");
const dayOfMonth = z.number().int().min(1).max(31);
const money = z.number().finite().nonnegative("Valor não pode ser negativo");
const moneyPositive = z.number().finite().positive("Valor deve ser maior que zero");
const shortText = (max: number) => z.string().trim().min(1, "Campo obrigatório").max(max);

function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(result.error.issues.map((i) => i.message).join("; "));
  }
  return result.data;
}

// ── Ordens de Serviço ─────────────────────────────────────────

export const ServiceOrderInsertSchema = z.object({
  os_number: shortText(50),
  client_name: shortText(200),
  order_date: dateStr,
  order_value: moneyPositive,
  payment_method: z.enum(["Pix", "Boleto", "Cartão"]),
  status: z.enum(["Pendente", "Pago"]),
  competencia: dateStr,
});
export const ServiceOrderUpdateSchema = ServiceOrderInsertSchema.partial();

// ── Receitas ──────────────────────────────────────────────────

export const IncomeEntryInsertSchema = z.object({
  competencia: dateStr,
  description: shortText(200),
  category: z.enum(["Salário", "Benefício", "Transporte", "Comissão", "Empréstimo", "Outro"]),
  type: z.enum(["Fixo", "Variável"]),
  amount: money,
  due_description: z.string().max(100).nullable(),
  is_commission: z.boolean(),
  is_recurring: z.boolean(),
  loan_id: z.string().uuid().nullable().optional(),
  status: z.enum(["Pendente", "Recebido"]),
  external_id: z.string().max(200).nullable().optional(),
});
export const IncomeEntryUpdateSchema = IncomeEntryInsertSchema.partial();

// ── Despesas ──────────────────────────────────────────────────

export const ExpenseEntryInsertSchema = z.object({
  competencia: dateStr,
  description: shortText(200),
  category: z.enum(["Assinatura", "Saúde", "Cartão", "Alimentação", "Transporte", "Lazer", "Parcela", "Outro"]),
  type: z.enum(["Fixo", "Variável"]),
  amount: money,
  due_day: dayOfMonth.nullable(),
  is_recurring: z.boolean(),
  payment_method: z.enum(["Dinheiro", "Pix", "Débito", "Cartão de Crédito"]),
  status: z.enum(["Pendente", "Pago", "Aguardando"]),
  credit_card_id: z.string().uuid().nullable().optional(),
  recurring_service_id: z.string().uuid().nullable().optional(),
  external_id: z.string().max(200).nullable().optional(),
});
export const ExpenseEntryUpdateSchema = ExpenseEntryInsertSchema.partial();

// ── Cartões de Crédito ───────────────────────────────────────

export const CreditCardInsertSchema = z.object({
  name: shortText(100),
  limit_amount: money,
  closing_day: dayOfMonth.nullable(),
  due_day: dayOfMonth.nullable(),
});
export const CreditCardUpdateSchema = CreditCardInsertSchema.partial();

// ── Serviços Recorrentes (Assinaturas) ───────────────────────

export const RecurringServiceInsertSchema = z.object({
  service_name: shortText(100),
  amount: moneyPositive,
  billing_day: dayOfMonth,
  credit_card_id: z.string().uuid().nullable(),
  category: z.enum(["Assinatura", "Saúde", "Cartão", "Alimentação", "Transporte", "Lazer", "Parcela", "Outro"]),
  status: z.enum(["Ativo", "Pausado"]),
});
export const RecurringServiceUpdateSchema = RecurringServiceInsertSchema.partial();

// ── Empréstimos Pessoais ──────────────────────────────────────

export const CreateLoanPayloadSchema = z.object({
  debtor_name: shortText(200),
  description: z.string().max(300).nullable(),
  installment_amount: moneyPositive,
  total_installments: z.number().int().positive().max(600),
  due_day: dayOfMonth.nullable(),
});

// ── Orçamento ─────────────────────────────────────────────────

export const BudgetSettingsSchema = z.object({
  variable_expense_limit: money.nullable(),
  notes: z.string().max(500).nullable().optional(),
});

export const BudgetCategorySchema = z.object({
  category_name: shortText(100),
  allocated_amount: money,
});

export { parseOrThrow };
