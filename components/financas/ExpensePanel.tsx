"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { updateExpense, deleteExpense } from "@/lib/finance-db";
import { toast } from "@/lib/use-toast";
import { EntryFormModal } from "./EntryFormModal";
import type { ExpenseEntry, ExpenseStatus } from "@/lib/finance";

interface ExpensePanelProps {
  competencia: string;
  expenses: ExpenseEntry[];
  onRefresh: () => void;
}

const STATUS_CYCLE: Record<ExpenseStatus, ExpenseStatus> = {
  Pendente: "Pago", Pago: "Aguardando", Aguardando: "Pendente",
};

const statusStyle: Record<ExpenseStatus, { color: string; bg: string; border: string; dot: string }> = {
  Pago:       { color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)", dot: "bg-emerald-400" },
  Pendente:   { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.3)", dot: "bg-purple-400" },
  Aguardando: { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)", dot: "bg-amber-400" },
};

const catColor: Record<string, string> = {
  Assinatura: "text-cyan-500", Saúde: "text-emerald-500", Cartão: "text-orange-400",
  Alimentação: "text-yellow-500", Transporte: "text-blue-400", Lazer: "text-purple-400",
  Parcela: "text-pink-400", Outro: "text-zinc-500",
};

const pmBadge: Record<string, string> = {
  "Dinheiro":          "border-zinc-700 text-zinc-600",
  "Pix":               "border-cyan-800/50 text-cyan-600",
  "Débito":            "border-blue-800/50 text-blue-500",
  "Cartão de Crédito": "border-orange-700/50 text-orange-400",
};

export function ExpensePanel({ competencia, expenses, onRefresh }: ExpensePanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseEntry | null>(null);

  const generalExpenses = expenses.filter(e => e.payment_method !== "Cartão de Crédito");
  const ccExpenses      = expenses.filter(e => e.payment_method === "Cartão de Crédito");

  const fixed    = generalExpenses.filter(e => e.type === "Fixo");
  const variable = generalExpenses.filter(e => e.type === "Variável");
  const totalFixed    = fixed.reduce((s, e) => s + e.amount, 0);
  const totalVariable = variable.reduce((s, e) => s + e.amount, 0);
  const totalPaid     = generalExpenses.filter(e => e.status === "Pago").reduce((s, e) => s + e.amount, 0);

  const ccBill    = ccExpenses.filter(e => e.status === "Pago").reduce((s, e) => s + e.amount, 0);
  const ccPending = ccExpenses.filter(e => e.status !== "Pago").reduce((s, e) => s + e.amount, 0);

  async function handleCycleStatus(entry: ExpenseEntry) {
    const next = STATUS_CYCLE[entry.status];
    try {
      await updateExpense(entry.id, { status: next });
      onRefresh();
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteExpense(id);
      toast({ title: "Despesa removida.", variant: "success" });
      onRefresh();
    } catch {
      toast({ title: "Erro ao remover.", variant: "destructive" });
    }
  }

  function ExpenseRow({ entry, i }: { entry: ExpenseEntry; i: number }) {
    const s = statusStyle[entry.status];
    const pmClass = pmBadge[entry.payment_method] ?? "border-zinc-700 text-zinc-600";
    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        transition={{ delay: i * 0.04 }}
        className="group flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2.5 transition-all hover:border-zinc-700/60 hover:bg-zinc-800/30"
      >
        <button
          onClick={() => handleCycleStatus(entry)}
          title={`Status: ${entry.status} → clique para avançar`}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all"
          style={{ borderColor: s.color, backgroundColor: s.bg }}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        </button>

        {entry.due_day && (
          <span className="font-mono text-[10px] text-zinc-700 shrink-0 w-8">d.{entry.due_day}</span>
        )}

        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium ${entry.status === "Pago" ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
            {entry.description}
            {entry.is_recurring && <span className="ml-1 text-[9px] text-zinc-700">↻</span>}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] ${catColor[entry.category] ?? "text-zinc-600"}`}>{entry.category}</span>
            {entry.payment_method !== "Dinheiro" && (
              <span className={`rounded border px-1 py-px text-[9px] font-mono ${pmClass}`}>
                {entry.payment_method === "Cartão de Crédito" ? "CC" : entry.payment_method}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-xs font-semibold text-zinc-200">{formatCurrency(entry.amount)}</span>
          <span
            className="rounded border px-1.5 py-0.5 text-[9px] font-semibold"
            style={{ color: s.color, borderColor: s.border, backgroundColor: s.bg }}
          >
            {entry.status}
          </span>
        </div>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-zinc-200"
            onClick={() => { setEditing(entry); setFormOpen(true); }}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-700 hover:text-red-400"
            onClick={() => handleDelete(entry.id)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-400">−</span>
              </div>
              <CardTitle className="text-sm text-zinc-100">Despesas</CardTitle>
            </div>
            <Button size="sm" className="h-7 gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 hover:bg-purple-500/20 text-xs"
              onClick={() => { setEditing(null); setFormOpen(true); }}>
              <Plus className="h-3 w-3" />Nova
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs border-t border-zinc-800 pt-2">
            <span className="text-zinc-600">
              Fixas: <span className="font-mono font-semibold text-zinc-300">{formatCurrency(totalFixed)}</span>
              <span className="ml-2 text-zinc-700">·</span>
              <span className="ml-2">Variáveis: <span className="font-mono font-semibold text-zinc-300">{formatCurrency(totalVariable)}</span></span>
            </span>
            <span className="text-zinc-600">Pago: <span className="font-mono font-semibold text-purple-400">{formatCurrency(totalPaid)}</span></span>
          </div>
          <p className="text-[10px] text-zinc-700 mt-1">Clique no indicador colorido para alternar status (Pendente → Pago → Aguardando)</p>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 pt-0">
          {/* ── Despesas Gerais ── */}
          {fixed.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Despesas Fixas</p>
              <AnimatePresence>
                {fixed.map((e, i) => <ExpenseRow key={e.id} entry={e} i={i} />)}
              </AnimatePresence>
            </div>
          )}
          {variable.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">Despesas Variáveis</p>
              <AnimatePresence>
                {variable.map((e, i) => <ExpenseRow key={e.id} entry={e} i={i} />)}
              </AnimatePresence>
            </div>
          )}

          {/* ── Fatura do Cartão de Crédito ── */}
          {ccExpenses.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 pt-1">
                <CreditCard className="h-3.5 w-3.5 text-orange-400" />
                <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400/80">Fatura do Cartão</p>
                <div className="flex-1 h-px bg-orange-500/10" />
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  {ccBill > 0 && (
                    <span className="text-emerald-500">Pago: {formatCurrency(ccBill)}</span>
                  )}
                  {ccPending > 0 && (
                    <span className="text-orange-400">Em aberto: {formatCurrency(ccPending)}</span>
                  )}
                </div>
              </div>
              <AnimatePresence>
                {ccExpenses.map((e, i) => <ExpenseRow key={e.id} entry={e} i={i} />)}
              </AnimatePresence>
            </div>
          )}

          {expenses.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-600">Nenhuma despesa cadastrada.</p>
          )}
        </CardContent>
      </Card>

      <EntryFormModal
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditing(null); }}
        mode="expense"
        competencia={competencia}
        editingExpense={editing}
        onSuccess={onRefresh}
      />
    </>
  );
}
