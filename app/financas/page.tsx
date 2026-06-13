"use client";
import { useEffect, useState, useCallback } from "react";
import { Copy, Settings2, Upload } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { HealthDashboard } from "@/components/financas/HealthDashboard";
import { IncomePanel } from "@/components/financas/IncomePanel";
import { ExpensePanel } from "@/components/financas/ExpensePanel";
import { BudgetEnvelopes } from "@/components/financas/BudgetEnvelopes";
import { BudgetEnvelopeModal } from "@/components/financas/BudgetEnvelopeModal";
import { CreditCardsPanel } from "@/components/financas/CreditCardsPanel";
import { OfxImportModal } from "@/components/financas/OfxImportModal";
import {
  getIncomes, getExpenses, getBudgetSettings,
  upsertBudgetSettings, initializeMonth, syncCommission,
  getFinanceCompetencias, getCreditCards, getBudgetCategories,
} from "@/lib/finance-db";
import { computeFinanceSummary, computeCardInvoices, computeBudgetEnvelopes } from "@/lib/finance";
import { getCurrentCompetencia, formatMonthYear } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import type { IncomeEntry, ExpenseEntry, BudgetSettings, CreditCard, BudgetCategory } from "@/lib/finance";

export default function FinancasPage() {
  const [competencia, setCompetencia] = useState(getCurrentCompetencia());
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [budget, setBudget] = useState<BudgetSettings | null>(null);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [envelopeModalOpen, setEnvelopeModalOpen] = useState(false);
  const [ofxOpen, setOfxOpen] = useState(false);
  const [limitInput, setLimitInput] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Sincroniza comissão automaticamente com as OS pagas do mês
      await syncCommission(competencia).catch(() => {});

      const [comps, inc, exp, bdg, cards, cats] = await Promise.all([
        getFinanceCompetencias(),
        getIncomes(competencia),
        getExpenses(competencia),
        getBudgetSettings(competencia),
        getCreditCards().catch(() => []),
        getBudgetCategories(competencia).catch(() => []),
      ]);
      const allComps = comps.includes(competencia) ? comps : [competencia, ...comps];
      setCompetencias(allComps);
      setIncomes(inc);
      setExpenses(exp);
      setBudget(bdg);
      setCreditCards(cards);
      setBudgetCategories(cats);
      setLimitInput(bdg?.variable_expense_limit?.toString() ?? "");
    } finally {
      setLoading(false);
    }
  }, [competencia]);

  useEffect(() => { load(); }, [load]);

  async function handleInitMonth() {
    setInitializing(true);
    try {
      await syncCommission(competencia);
      const { incomes: i, expenses: e } = await initializeMonth(competencia);
      toast({ title: `Mês inicializado: ${i} receitas + ${e} despesas copiadas`, variant: "success" });
      load();
    } catch {
      toast({ title: "Erro ao inicializar mês", variant: "destructive" });
    } finally {
      setInitializing(false);
    }
  }

  async function handleSaveBudget() {
    const limit = limitInput ? parseFloat(limitInput.replace(",", ".")) : null;
    try {
      await upsertBudgetSettings(competencia, limit);
      toast({ title: "Limite salvo!", variant: "success" });
      setSettingsOpen(false);
      load();
    } catch {
      toast({ title: "Erro ao salvar limite", variant: "destructive" });
    }
  }

  const summary = computeFinanceSummary(incomes, expenses);
  const cardInvoices = computeCardInvoices(creditCards, expenses, competencia);
  const envelopes = computeBudgetEnvelopes(budgetCategories, expenses);
  const isEmpty = incomes.length === 0 && expenses.length === 0;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">// finanças pessoais</p>
          <h1 className="text-2xl font-bold text-zinc-100 leading-none">Gestão Financeira</h1>
          <p className="mt-1 text-sm text-zinc-600 capitalize">{formatMonthYear(competencia)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={competencia} onValueChange={setCompetencia}>
            <SelectTrigger className="w-full sm:w-48 bg-zinc-900/80 border-zinc-700 text-zinc-300 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {competencias.map(c => (
                <SelectItem key={c} value={c} className="text-zinc-300 capitalize focus:bg-zinc-800 focus:text-cyan-400">
                  {formatMonthYear(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-9 gap-2 text-xs"
            onClick={handleInitMonth} disabled={initializing}>
            <Copy className={`h-3.5 w-3.5 ${initializing ? "animate-spin" : ""}`} />
            {initializing ? "Inicializando..." : "Inicializar Mês"}
          </Button>
          <Button variant="outline" size="sm" className="h-9 gap-2 text-xs"
            onClick={() => setOfxOpen(true)} title="Importar extrato bancário OFX">
            <Upload className="h-3.5 w-3.5" />
            Importar OFX
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-zinc-500 hover:text-zinc-200"
            onClick={() => setSettingsOpen(true)} title="Configurar limite de orçamento">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Carregando dados financeiros...
          </div>
        </div>
      ) : (
        <>
          {isEmpty ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-zinc-800 py-16"
            >
              <p className="text-sm text-zinc-600">Nenhum dado financeiro para este mês.</p>
              <Button onClick={handleInitMonth} disabled={initializing} variant="neon" size="sm">
                <Copy className="h-3.5 w-3.5 mr-2" />
                Inicializar com dados recorrentes
              </Button>
            </motion.div>
          ) : (
            <>
              <HealthDashboard summary={summary} variableExpenseLimit={budget?.variable_expense_limit ?? null} />
              <div className="grid gap-5 lg:grid-cols-2">
                <IncomePanel competencia={competencia} incomes={incomes} onRefresh={load} />
                <ExpensePanel competencia={competencia} expenses={expenses} onRefresh={load} />
              </div>
            </>
          )}

          {/* Envelopes e cartões — independentes do estado vazio */}
          <div className="grid gap-5 lg:grid-cols-2">
            <BudgetEnvelopes envelopes={envelopes} onManage={() => setEnvelopeModalOpen(true)} />
            <CreditCardsPanel invoices={cardInvoices} onRefresh={load} />
          </div>
        </>
      )}

      {/* Budget settings modal */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-sm bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Limite de Orçamento Variável</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-zinc-500">
              Defina um limite mensal para suas despesas variáveis. Um alerta visual aparecerá caso o total ultrapasse este valor.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Limite (R$) — deixe vazio para desativar</Label>
              <Input
                placeholder="Ex: 1500"
                value={limitInput}
                onChange={e => setLimitInput(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveBudget}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Orçamentos por categoria (envelopes) */}
      <BudgetEnvelopeModal
        open={envelopeModalOpen}
        onOpenChange={setEnvelopeModalOpen}
        competencia={competencia}
        categories={budgetCategories}
        onSuccess={load}
      />

      {/* Importação de extrato OFX */}
      <OfxImportModal
        open={ofxOpen}
        onOpenChange={setOfxOpen}
        creditCards={creditCards}
        onSuccess={load}
      />
    </div>
  );
}
