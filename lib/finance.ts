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
  created_at: string;
  updated_at: string;
}

export interface BudgetSettings {
  id: string;
  competencia: string;
  variable_expense_limit: number | null;
  notes: string | null;
  created_at: string;
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
