import { supabase } from "./supabase";
import { calculateCommission } from "./commission";
import { addMonths, format, parseISO, startOfMonth } from "date-fns";
import type {
  IncomeEntry, ExpenseEntry, BudgetSettings,
  IncomeEntryInsert, ExpenseEntryInsert, PersonalLoan,
} from "./finance";

// ── Income ──────────────────────────────────────────────────

export async function getIncomes(competencia: string): Promise<IncomeEntry[]> {
  const { data, error } = await supabase
    .from("income_entries")
    .select("*, personal_loans(*)")
    .eq("competencia", competencia)
    .order("type", { ascending: true });
  if (error) throw error;
  return (data ?? []) as IncomeEntry[];
}

export async function createIncome(entry: IncomeEntryInsert): Promise<IncomeEntry> {
  const { data, error } = await supabase
    .from("income_entries").insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function updateIncome(id: string, updates: Partial<IncomeEntryInsert>): Promise<IncomeEntry> {
  const { data, error } = await supabase
    .from("income_entries").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from("income_entries").delete().eq("id", id);
  if (error) throw error;
}

// ── Expenses ─────────────────────────────────────────────────

export async function getExpenses(competencia: string): Promise<ExpenseEntry[]> {
  const { data, error } = await supabase
    .from("expense_entries")
    .select("*")
    .eq("competencia", competencia)
    .order("type", { ascending: true })
    .order("due_day", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExpense(entry: ExpenseEntryInsert): Promise<ExpenseEntry> {
  const { data, error } = await supabase
    .from("expense_entries").insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function updateExpense(id: string, updates: Partial<ExpenseEntryInsert>): Promise<ExpenseEntry> {
  const { data, error } = await supabase
    .from("expense_entries").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expense_entries").delete().eq("id", id);
  if (error) throw error;
}

// ── Budget Settings ──────────────────────────────────────────

export async function getBudgetSettings(competencia: string): Promise<BudgetSettings | null> {
  const { data } = await supabase
    .from("budget_settings").select("*").eq("competencia", competencia).maybeSingle();
  return data;
}

export async function upsertBudgetSettings(
  competencia: string,
  variable_expense_limit: number | null,
  notes?: string
): Promise<void> {
  const { error } = await supabase.from("budget_settings").upsert(
    { competencia, variable_expense_limit, notes },
    { onConflict: "competencia" }
  );
  if (error) throw error;
}

// ── Commission integration ───────────────────────────────────

export async function fetchCommissionForMonth(competencia: string): Promise<number> {
  const { data, error } = await supabase
    .from("service_orders")
    .select("order_value")
    .eq("competencia", competencia)
    .eq("status", "Pago");
  if (error) throw error;
  const totalPago = (data ?? []).reduce((s, o) => s + o.order_value, 0);
  return calculateCommission(totalPago);
}

export async function syncCommission(competencia: string): Promise<void> {
  const commissionValue = await fetchCommissionForMonth(competencia);
  const { data: entries } = await supabase
    .from("income_entries")
    .select("id")
    .eq("competencia", competencia)
    .eq("is_commission", true);

  if (entries && entries.length > 0) {
    await supabase
      .from("income_entries")
      .update({ amount: commissionValue })
      .eq("competencia", competencia)
      .eq("is_commission", true);
  } else {
    await supabase.from("income_entries").insert({
      competencia,
      description: "Comissão do Mês",
      category: "Comissão",
      type: "Variável",
      amount: commissionValue,
      due_description: "Após Fechamento",
      is_commission: true,
      is_recurring: true,
      status: "Pendente",
    });
  }
}

// ── Personal Loans ───────────────────────────────────────────

export interface CreateLoanPayload {
  debtor_name: string;
  description: string | null;
  installment_amount: number;
  total_installments: number;
  due_day: number | null;
}

export async function createLoan(payload: CreateLoanPayload, competencia: string): Promise<void> {
  const { data: loan, error: e1 } = await supabase
    .from("personal_loans")
    .insert({
      debtor_name: payload.debtor_name,
      description: payload.description,
      installment_amount: payload.installment_amount,
      total_installments: payload.total_installments,
      remaining_installments: payload.total_installments,
      due_day: payload.due_day,
      status: "Ativo",
      start_competencia: competencia,
    })
    .select()
    .single<PersonalLoan>();

  if (e1) throw e1;

  const { error: e2 } = await supabase.from("income_entries").insert({
    competencia,
    description: loan.debtor_name,
    category: "Empréstimo",
    type: "Variável",
    amount: loan.installment_amount,
    due_description: loan.due_day ? `Dia ${loan.due_day}` : null,
    is_commission: false,
    is_recurring: false,
    loan_id: loan.id,
    status: "Pendente",
  });

  if (e2) throw e2;
}

// Chamado ao marcar uma parcela de empréstimo como recebida
export async function receiveInstallment(
  entryId: string,
  loanId: string,
  currentCompetencia: string
): Promise<void> {
  // 1. Marcar parcela atual como Recebido
  const { error: e1 } = await supabase
    .from("income_entries")
    .update({ status: "Recebido" })
    .eq("id", entryId);
  if (e1) throw e1;

  // 2. Buscar estado atual do empréstimo
  const { data: loan, error: e2 } = await supabase
    .from("personal_loans")
    .select("*")
    .eq("id", loanId)
    .single<PersonalLoan>();
  if (e2) throw e2;

  const newRemaining = loan.remaining_installments - 1;

  // 3. Atualizar empréstimo
  const { error: e3 } = await supabase
    .from("personal_loans")
    .update({
      remaining_installments: newRemaining,
      status: newRemaining === 0 ? "Quitado" : "Ativo",
    })
    .eq("id", loanId);
  if (e3) throw e3;

  // 4. Gerar próxima parcela se ainda houver restantes
  if (newRemaining > 0) {
    const nextDate = addMonths(parseISO(currentCompetencia), 1);
    const nextComp = format(startOfMonth(nextDate), "yyyy-MM-dd");

    // Evitar duplicata caso a parcela do próximo mês já exista
    const { data: existing } = await supabase
      .from("income_entries")
      .select("id")
      .eq("loan_id", loanId)
      .eq("competencia", nextComp)
      .maybeSingle();

    if (!existing) {
      const { error: e4 } = await supabase.from("income_entries").insert({
        competencia: nextComp,
        description: loan.debtor_name,
        category: "Empréstimo",
        type: "Variável",
        amount: loan.installment_amount,
        due_description: loan.due_day ? `Dia ${loan.due_day}` : null,
        is_commission: false,
        is_recurring: false,
        loan_id: loanId,
        status: "Pendente",
      });
      if (e4) throw e4;
    }
  }
}

// ── Initialize new month from recurring items ────────────────

const DEFAULT_INCOMES = [
  { description: "60% Salário",     category: "Salário",    type: "Fixo",     amount: 1041.18, due_description: "5º Dia Útil",     is_commission: false, is_recurring: true },
  { description: "40% Salário",     category: "Salário",    type: "Fixo",     amount: 800.00,  due_description: "Dia 20 a 23",     is_commission: false, is_recurring: true },
  { description: "Alimentação",     category: "Benefício",  type: "Fixo",     amount: 600.00,  due_description: "Mês Todo",         is_commission: false, is_recurring: true },
  { description: "Transporte",      category: "Transporte", type: "Fixo",     amount: 222.60,  due_description: "Mês Todo",         is_commission: false, is_recurring: true },
  { description: "Comissão do Mês", category: "Comissão",   type: "Variável", amount: 0.00,    due_description: "Após Fechamento",  is_commission: true,  is_recurring: true },
] as const;

const DEFAULT_EXPENSES = [
  { description: "Academia",        category: "Saúde",      type: "Fixo", amount: 139.90, due_day: 3,  is_recurring: true, payment_method: "Dinheiro" },
  { description: "Google One",      category: "Assinatura", type: "Fixo", amount: 9.99,   due_day: 11, is_recurring: true, payment_method: "Dinheiro" },
  { description: "YouTube Music",   category: "Assinatura", type: "Fixo", amount: 27.00,  due_day: 12, is_recurring: true, payment_method: "Dinheiro" },
  { description: "Google Serviços", category: "Assinatura", type: "Fixo", amount: 100.00, due_day: 12, is_recurring: true, payment_method: "Dinheiro" },
  { description: "Crunch",          category: "Assinatura", type: "Fixo", amount: 21.00,  due_day: 26, is_recurring: true, payment_method: "Dinheiro" },
  { description: "Convênio Médico", category: "Saúde",      type: "Fixo", amount: 372.00, due_day: 10, is_recurring: true, payment_method: "Dinheiro" },
] as const;

export async function initializeMonth(competencia: string): Promise<{ incomes: number; expenses: number }> {
  const { data: existingInc } = await supabase
    .from("income_entries").select("description").eq("competencia", competencia);
  const { data: existingExp } = await supabase
    .from("expense_entries").select("description").eq("competencia", competencia);

  const existingIncDescriptions = new Set((existingInc ?? []).map((e: { description: string }) => e.description));
  const existingExpDescriptions = new Set((existingExp ?? []).map((e: { description: string }) => e.description));

  const { data: recurringIncomes } = await supabase
    .from("income_entries").select("*").eq("is_recurring", true).neq("competencia", competencia).limit(50);
  const { data: recurringExpenses } = await supabase
    .from("expense_entries").select("*").eq("is_recurring", true).neq("competencia", competencia).limit(50);

  const seenInc = new Set<string>();
  let newIncomes: object[];

  if (recurringIncomes && recurringIncomes.length > 0) {
    newIncomes = recurringIncomes
      .filter((i: { description: string; is_commission: boolean }) =>
        !existingIncDescriptions.has(i.description) && !seenInc.has(i.description) && !seenInc.add(i.description))
      .map(({ id: _id, created_at: _ca, updated_at: _ua, competencia: _c, loan_id: _l, user_id: _u, ...rest }: Record<string, unknown>) => ({
        ...rest, competencia, status: "Pendente",
        amount: rest.is_commission ? 0 : rest.amount,
      }));
  } else {
    newIncomes = DEFAULT_INCOMES
      .filter(i => !existingIncDescriptions.has(i.description))
      .map(i => ({ ...i, competencia, status: "Pendente" }));
  }

  const seenExp = new Set<string>();
  let newExpenses: object[];

  if (recurringExpenses && recurringExpenses.length > 0) {
    newExpenses = recurringExpenses
      .filter((e: { description: string }) =>
        !existingExpDescriptions.has(e.description) && !seenExp.has(e.description) && !seenExp.add(e.description))
      .map(({ id: _id, created_at: _ca, updated_at: _ua, competencia: _c, user_id: _u, ...rest }: Record<string, unknown>) => ({
        ...rest, competencia, status: "Pendente",
      }));
  } else {
    newExpenses = DEFAULT_EXPENSES
      .filter(e => !existingExpDescriptions.has(e.description))
      .map(e => ({ ...e, competencia, status: "Pendente" }));
  }

  if (newIncomes.length > 0) {
    const { error } = await supabase.from("income_entries").insert(newIncomes);
    if (error) throw error;
  }
  if (newExpenses.length > 0) {
    const { error } = await supabase.from("expense_entries").insert(newExpenses);
    if (error) throw error;
  }

  return { incomes: newIncomes.length, expenses: newExpenses.length };
}

export async function getFinanceCompetencias(): Promise<string[]> {
  const [{ data: inc }, { data: exp }] = await Promise.all([
    supabase.from("income_entries").select("competencia").order("competencia", { ascending: false }),
    supabase.from("expense_entries").select("competencia").order("competencia", { ascending: false }),
  ]);
  const seen = new Set<string>();
  [...(inc ?? []), ...(exp ?? [])].forEach(r => seen.add(r.competencia));
  return [...seen].sort((a, b) => b.localeCompare(a));
}
