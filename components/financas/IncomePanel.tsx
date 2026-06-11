"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Zap, Handshake, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { updateIncome, deleteIncome, receiveInstallment } from "@/lib/finance-db";
import { toast } from "@/lib/use-toast";
import { EntryFormModal } from "./EntryFormModal";
import type { IncomeEntry, IncomeStatus } from "@/lib/finance";

interface IncomePanelProps {
  competencia: string;
  incomes: IncomeEntry[];
  onRefresh: () => void;
}

const statusStyle: Record<IncomeStatus, { variant: "success" | "warning" | "secondary"; label: string }> = {
  Recebido: { variant: "success", label: "Recebido" },
  Pendente: { variant: "warning", label: "Pendente" },
};

const categoryColor: Record<string, string> = {
  "Salário":    "text-emerald-400",
  "Benefício":  "text-cyan-400",
  "Transporte": "text-blue-400",
  "Comissão":   "text-amber-400",
  "Empréstimo": "text-orange-400",
  "Outro":      "text-zinc-400",
};

export function IncomePanel({ competencia, incomes, onRefresh }: IncomePanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);

  const total    = incomes.reduce((s, i) => s + i.amount, 0);
  const received = incomes.filter(i => i.status === "Recebido").reduce((s, i) => s + i.amount, 0);

  async function handleToggleStatus(entry: IncomeEntry) {
    // Empréstimo: lógica especial de parcela
    if (entry.loan_id) {
      if (entry.status === "Recebido") return; // já recebida — bloqueado
      try {
        await receiveInstallment(entry.id, entry.loan_id, competencia);
        onRefresh();
        const loan = entry.personal_loans;
        const remaining = loan ? loan.remaining_installments - 1 : null;
        if (remaining === 0) {
          toast({ title: "Empréstimo quitado!", description: "Todas as parcelas foram recebidas.", variant: "success" });
        } else {
          toast({ title: "Parcela recebida!", description: remaining !== null ? `Faltam ${remaining} parcela(s). Próximo mês gerado automaticamente.` : "Próxima parcela gerada automaticamente.", variant: "success" });
        }
      } catch {
        toast({ title: "Erro ao registrar parcela", variant: "destructive" });
      }
      return;
    }

    // Receita comum: toggle simples
    const next: IncomeStatus = entry.status === "Pendente" ? "Recebido" : "Pendente";
    try {
      await updateIncome(entry.id, { status: next });
      onRefresh();
    } catch {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  }

  async function handleDelete(entry: IncomeEntry) {
    try {
      await deleteIncome(entry.id);
      toast({ title: "Receita removida.", variant: "success" });
      onRefresh();
    } catch {
      toast({ title: "Erro ao remover.", variant: "destructive" });
    }
  }

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold text-emerald-400">+</span>
              </div>
              <CardTitle className="text-sm text-zinc-100">Receitas</CardTitle>
            </div>
            <Button
              size="sm"
              className="h-7 gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 text-xs"
              onClick={() => { setEditing(null); setFormOpen(true); }}
            >
              <Plus className="h-3 w-3" />Nova
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs border-t border-zinc-800 pt-2">
            <span className="text-zinc-600">
              Total previsto: <span className="font-mono font-semibold text-zinc-300">{formatCurrency(total)}</span>
            </span>
            <span className="text-zinc-600">
              Recebido: <span className="font-mono font-semibold text-emerald-400">{formatCurrency(received)}</span>
            </span>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-1.5 pt-0">
          {incomes.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-600">Nenhuma receita cadastrada.</p>
          )}
          <AnimatePresence>
            {incomes.map((entry, i) => {
              const isLoanEntry   = !!entry.loan_id;
              const isLoanLocked  = isLoanEntry && entry.status === "Recebido";
              const loan          = entry.personal_loans ?? null;
              const isQuitado     = loan?.status === "Quitado";
              const paidCount     = loan ? loan.total_installments - loan.remaining_installments : 0;

              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ delay: i * 0.05 }}
                  className={`group flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-all hover:bg-zinc-800/30 ${
                    isLoanEntry
                      ? "border-orange-500/15 bg-orange-500/4 hover:border-orange-500/25"
                      : "border-zinc-800/50 bg-zinc-900/30 hover:border-zinc-700/60"
                  }`}
                >
                  {/* Status toggle */}
                  <button
                    onClick={() => handleToggleStatus(entry)}
                    disabled={isLoanLocked}
                    title={
                      isLoanLocked
                        ? "Parcela já recebida"
                        : isLoanEntry
                          ? "Clique para confirmar recebimento da parcela"
                          : "Clique para alternar status"
                    }
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-all ${
                      isLoanLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                    style={{
                      borderColor: entry.status === "Recebido" ? "#10b981" : isLoanEntry ? "#f97316" : "#3f3f46",
                      backgroundColor: entry.status === "Recebido"
                        ? "rgba(16,185,129,0.2)"
                        : isLoanEntry
                          ? "rgba(249,115,22,0.1)"
                          : "transparent",
                    }}
                  >
                    {entry.status === "Recebido" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                    {entry.status === "Pendente" && isLoanEntry && <span className="h-1.5 w-1.5 rounded-full bg-orange-400/60" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-xs font-medium ${entry.status === "Recebido" ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                        {entry.description}
                      </p>
                      {entry.is_commission && (
                        <span title="Integrado com OS">
                          <Zap className="h-2.5 w-2.5 text-amber-400 shrink-0" />
                        </span>
                      )}
                      {isLoanEntry && (
                        <span title="Empréstimo pessoal">
                          <Handshake className="h-2.5 w-2.5 text-orange-400/70 shrink-0" />
                        </span>
                      )}
                      {entry.is_recurring && !isLoanEntry && (
                        <span className="text-[9px] text-zinc-700 shrink-0">↻</span>
                      )}
                    </div>

                    {/* Linha secundária: data de recebimento ou progresso do empréstimo */}
                    {isLoanEntry && loan ? (
                      <div className="mt-1 flex items-center gap-2 flex-wrap">
                        {/* Barra de progresso mini */}
                        <div className="flex items-center gap-1.5">
                          <div className="h-1 w-16 rounded-full bg-zinc-800 overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${isQuitado ? "bg-emerald-500" : "bg-orange-500"}`}
                              initial={{ width: "0%" }}
                              animate={{ width: `${loan.total_installments > 0 ? (paidCount / loan.total_installments) * 100 : 0}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {paidCount}/{loan.total_installments}
                          </span>
                        </div>

                        {isQuitado ? (
                          <span className="text-[9px] font-semibold text-emerald-500 font-mono tracking-wide">
                            QUITADO
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-600 font-mono">
                            Faltam {loan.remaining_installments} parcela{loan.remaining_installments !== 1 ? "s" : ""}
                            {loan.due_day ? ` · vence dia ${loan.due_day}` : ""}
                          </span>
                        )}

                        {isLoanLocked && (
                          <Lock className="h-2.5 w-2.5 text-zinc-700 shrink-0" />
                        )}
                      </div>
                    ) : entry.due_description ? (
                      <p className="text-[10px] text-zinc-600 font-mono">{entry.due_description}</p>
                    ) : null}

                    {/* Observação do empréstimo */}
                    {isLoanEntry && loan?.description && (
                      <p className="mt-0.5 text-[10px] text-zinc-700 italic">{loan.description}</p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-[10px] font-medium ${categoryColor[entry.category] ?? "text-zinc-500"}`}>
                      {entry.category}
                    </span>
                    <span className="font-mono text-xs font-semibold text-emerald-400">
                      {formatCurrency(entry.amount)}
                    </span>
                    <Badge
                      variant={statusStyle[entry.status].variant}
                      className="text-[9px] px-1.5 py-0.5 h-fit"
                    >
                      {isQuitado ? "Quitado" : entry.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    {/* Empréstimos não têm edição direta */}
                    {!isLoanEntry && (
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-zinc-200"
                        onClick={() => { setEditing(entry); setFormOpen(true); }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6 text-zinc-700 hover:text-red-400"
                      onClick={() => handleDelete(entry)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </CardContent>
      </Card>

      <EntryFormModal
        open={formOpen}
        onOpenChange={o => { setFormOpen(o); if (!o) setEditing(null); }}
        mode="income"
        competencia={competencia}
        editingIncome={editing}
        onSuccess={onRefresh}
      />
    </>
  );
}
