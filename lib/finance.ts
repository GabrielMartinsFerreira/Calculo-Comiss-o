export type IncomeCategory = "Salário" | "Benefício" | "Transporte" | "Comissão" | "Empréstimo" | "Outro";
export type IncomeType = "Fixo" | "Variável";
export type IncomeStatus = "Pendente" | "Recebido";
export type LoanStatus = "Ativo" | "Quitado";

export type ExpenseCategory = "Assinatura" | "Saúde" | "Cartão" | "Alimentação" | "Transporte" | "Lazer" | "Parcela" | "Outro";
export type ExpenseType = "Fixo" | "Variável";
export type ExpenseStatus = "Pendente" | "Pago" | "Aguardando";
export type PaymentMethod = "Dinheiro" | "Pix" | "Débito" | "Cartão de Crédito";

export interface PersonalLoan {
  id: string;
  debtor_name: string;
  description: string | null;
  installment_amount: number;
  total_installments: number;
  remaining_installments: number;
  due_day: number | null;
  status: LoanStatus;
  start_competencia: string;
  created_at: string;
  updated_at: string;
}

export interface IncomeEntry {
  id: string;
  competencia: string;
  description: string;
  category: IncomeCategory;
  type: IncomeType;
  amount: number;
  due_description: string | null;
  is_commission: boolean;
  is_recurring: boolean;
  loan_id?: string | null;
  personal_loans?: PersonalLoan | null;
  status: IncomeStatus;
  external_id?: string | null; // <FITID> do extrato OFX (dedup)
  created_at: string;
  updated_at: string;
}

export interface ExpenseEntry {
  id: string;
  competencia: string;
  description: string;
  category: ExpenseCategory;
  type: ExpenseType;
  amount: number;
  due_day: number | null;
  is_recurring: boolean;
  payment_method: PaymentMethod;
  status: ExpenseStatus;
  credit_card_id?: string | null; // FK opcional para credit_cards
  external_id?: string | null;    // <FITID> do extrato OFX (dedup)
  created_at: string;
  updated_at: string;
}

// ── Cartões de Crédito (Evolução B) ──────────────────────────

export interface CreditCard {
  id: string;
  name: string;
  limit_amount: number;
  closing_day: number | null;
  due_day: number | null;
  created_at: string;
  updated_at: string;
}

export type CreditCardInsert = Pick<
  CreditCard,
  "name" | "limit_amount" | "closing_day" | "due_day"
>;

export type CardInvoiceStatus = "Vazia" | "Aberta" | "Paga";

export interface CardInvoice {
  card: CreditCard;
  competencia: string;
  total: number;             // soma de todas as compras do cartão no mês
  paid: number;              // soma das compras com status "Pago"
  pending: number;           // total - paid
  entryCount: number;
  status: CardInvoiceStatus;
  limitUsedPercent: number;  // total / limit_amount * 100 (0 se sem limite)
  closingDate: string | null;
  dueDate: string | null;
}

export interface BudgetSettings {
  id: string;
  competencia: string;
  variable_expense_limit: number | null;
  notes: string | null;
  created_at: string;
}

// ── Orçamentos por categoria / Envelopes (Evolução C) ────────

export interface BudgetCategory {
  id: string;
  budget_setting_id: string;
  category_name: string;
  allocated_amount: number;
  created_at: string;
  updated_at: string;
}

export type EnvelopeStatus = "safe" | "warning" | "danger";

export interface BudgetEnvelope {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;   // allocated - spent (pode ser negativo)
  percent: number;     // spent/allocated*100 (0 quando allocated = 0)
  status: EnvelopeStatus;
  isPulsing: boolean;  // true quando estourou (percent > 100)
}

export type IncomeEntryInsert = Omit<IncomeEntry, "id" | "created_at" | "updated_at" | "personal_loans">;
export type ExpenseEntryInsert = Omit<ExpenseEntry, "id" | "created_at" | "updated_at">;

export type HealthStatus = "green" | "yellow" | "red";

export interface MonthlyFinanceSummary {
  totalIncomeFixed: number;
  totalIncomeVariable: number;
  totalIncome: number;
  totalIncomeReceived: number;
  totalExpenseFixed: number;
  totalExpenseVariable: number;
  totalExpense: number;
  totalExpensePaid: number;
  // Cartão de crédito (despesas com payment_method === "Cartão de Crédito")
  totalCreditCardBill: number;    // pagas (fatura real)
  totalCreditCardPending: number; // não pagas (em aberto)
  // Despesas gerais excluindo cartão de crédito
  totalExpenseGeneral: number;
  projectedBalance: number;
  realizedBalance: number;
  healthStatus: HealthStatus;
  healthPercent: number;
}

export function computeFinanceSummary(
  incomes: IncomeEntry[],
  expenses: ExpenseEntry[]
): MonthlyFinanceSummary {
  const totalIncomeFixed    = incomes.filter(i => i.type === "Fixo").reduce((s, i) => s + i.amount, 0);
  const totalIncomeVariable = incomes.filter(i => i.type === "Variável").reduce((s, i) => s + i.amount, 0);
  const totalIncome         = totalIncomeFixed + totalIncomeVariable;
  const totalIncomeReceived = incomes.filter(i => i.status === "Recebido").reduce((s, i) => s + i.amount, 0);

  const totalExpenseFixed    = expenses.filter(e => e.type === "Fixo").reduce((s, e) => s + e.amount, 0);
  const totalExpenseVariable = expenses.filter(e => e.type === "Variável").reduce((s, e) => s + e.amount, 0);
  const totalExpense         = totalExpenseFixed + totalExpenseVariable;
  const totalExpensePaid     = expenses.filter(e => e.status === "Pago").reduce((s, e) => s + e.amount, 0);

  // CC: despesas com Cartão de Crédito — pagas = fatura confirmada, outras = em aberto
  const ccExpenses           = expenses.filter(e => e.payment_method === "Cartão de Crédito");
  const totalCreditCardBill  = ccExpenses.filter(e => e.status === "Pago").reduce((s, e) => s + e.amount, 0);
  const totalCreditCardPending = ccExpenses.filter(e => e.status !== "Pago").reduce((s, e) => s + e.amount, 0);

  // Despesas gerais = tudo exceto CC (para não double-contar com fatura)
  const totalExpenseGeneral  = expenses
    .filter(e => e.payment_method !== "Cartão de Crédito")
    .reduce((s, e) => s + e.amount, 0);

  const projectedBalance = totalIncome - totalExpense;
  const realizedBalance  = totalIncomeReceived - totalExpensePaid;

  const healthPercent = totalIncome > 0 ? (projectedBalance / totalIncome) * 100 : 0;
  const healthStatus: HealthStatus =
    projectedBalance < 0 ? "red" :
    healthPercent < 20   ? "yellow" : "green";

  return {
    totalIncomeFixed, totalIncomeVariable, totalIncome, totalIncomeReceived,
    totalExpenseFixed, totalExpenseVariable, totalExpense, totalExpensePaid,
    totalCreditCardBill, totalCreditCardPending, totalExpenseGeneral,
    projectedBalance, realizedBalance, healthStatus, healthPercent,
  };
}

export const INCOME_CATEGORIES: IncomeCategory[] = ["Salário", "Benefício", "Transporte", "Comissão", "Empréstimo", "Outro"];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ["Assinatura", "Saúde", "Cartão", "Alimentação", "Transporte", "Lazer", "Parcela", "Outro"];

// ── Faturas de Cartão de Crédito (Evolução B) ────────────────

/**
 * Converte (competencia + dia) num ISO date, respeitando o último dia
 * do mês e um eventual deslocamento de meses. Puro, sem date-fns.
 */
function isoForDay(competencia: string, day: number | null, monthOffset = 0): string | null {
  if (!day) return null;
  const [y, m] = competencia.split("-").map(Number);
  if (!y || !m) return null;
  const base = new Date(Date.UTC(y, m - 1 + monthOffset, 1));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth(); // 0-based
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const d = Math.min(day, lastDay);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Consolida a fatura de cada cartão para a competência informada.
 * - Agrupa as despesas com `credit_card_id` correspondente.
 * - "Paga" quando não há saldo pendente; "Aberta" enquanto houver; "Vazia" sem compras.
 * - `dueDate` cai no mês seguinte quando o dia de vencimento é anterior/igual
 *   ao dia de fechamento (comportamento usual de cartão).
 */
export function computeCardInvoices(
  cards: CreditCard[],
  expenses: ExpenseEntry[],
  competencia: string
): CardInvoice[] {
  return cards.map((card) => {
    const items = expenses.filter(
      (e) => e.credit_card_id === card.id && e.competencia === competencia
    );
    const total   = items.reduce((s, e) => s + e.amount, 0);
    const paid    = items.filter((e) => e.status === "Pago").reduce((s, e) => s + e.amount, 0);
    const pending = total - paid;

    const status: CardInvoiceStatus =
      total === 0 ? "Vazia" : pending <= 0.005 ? "Paga" : "Aberta";

    const limitUsedPercent = card.limit_amount > 0 ? (total / card.limit_amount) * 100 : 0;
    const closingDate = isoForDay(competencia, card.closing_day, 0);
    const dueOffset =
      card.due_day != null && card.closing_day != null && card.due_day <= card.closing_day ? 1 : 0;
    const dueDate = isoForDay(competencia, card.due_day, dueOffset);

    return { card, competencia, total, paid, pending, entryCount: items.length, status, limitUsedPercent, closingDate, dueDate };
  });
}

// ── Envelopes: cruza alocações por categoria com o gasto real ─

/**
 * Faixas de cor (Evolução C):
 *   - safe    (verde):    até 70%
 *   - warning (amarelo):  71% a 90%
 *   - danger  (vermelho): acima de 90%  → pulsante quando passa de 100%
 */
export function envelopeStatus(percent: number): EnvelopeStatus {
  if (percent <= 70) return "safe";
  if (percent <= 90) return "warning";
  return "danger";
}

/**
 * Para cada alocação, soma as despesas do mês na mesma categoria.
 * `expenses` deve conter as despesas já filtradas pela competência (a página
 * de Finanças carrega por competência). Considera todas as despesas da
 * categoria (planejadas + pagas) como comprometimento do envelope.
 */
export function computeBudgetEnvelopes(
  categories: BudgetCategory[],
  expenses: ExpenseEntry[]
): BudgetEnvelope[] {
  return categories
    .map((cat) => {
      const allocated = cat.allocated_amount;
      const spent = expenses
        .filter((e) => e.category === cat.category_name)
        .reduce((s, e) => s + e.amount, 0);
      const percent = allocated > 0 ? (spent / allocated) * 100 : (spent > 0 ? 100 : 0);
      return {
        category: cat.category_name,
        allocated,
        spent,
        remaining: allocated - spent,
        percent,
        status: envelopeStatus(percent),
        isPulsing: percent > 100,
      };
    })
    .sort((a, b) => b.percent - a.percent);
}
