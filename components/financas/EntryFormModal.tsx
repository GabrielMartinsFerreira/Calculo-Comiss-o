"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createIncome, updateIncome, createExpense, updateExpense, createLoan, getCreditCards } from "@/lib/finance-db";
import { toast } from "@/lib/use-toast";
import { formatCurrency } from "@/lib/utils";
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from "@/lib/finance";
import type { IncomeEntry, ExpenseEntry, IncomeCategory, ExpenseCategory, IncomeStatus, ExpenseStatus, PaymentMethod, CreditCard } from "@/lib/finance";

const PAYMENT_METHODS: PaymentMethod[] = ["Dinheiro", "Pix", "Débito", "Cartão de Crédito"];

type Mode = "income" | "expense";

interface EntryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: Mode;
  competencia: string;
  editingIncome?: IncomeEntry | null;
  editingExpense?: ExpenseEntry | null;
  onSuccess: () => void;
}

export function EntryFormModal({
  open, onOpenChange, mode, competencia, editingIncome, editingExpense, onSuccess,
}: EntryFormModalProps) {
  const isIncome = mode === "income";
  const isEditing = !!(editingIncome || editingExpense);

  const [form, setForm] = useState(() => {
    if (editingIncome) return {
      description: editingIncome.description, category: editingIncome.category,
      type: editingIncome.type, amount: String(editingIncome.amount),
      due_description: editingIncome.due_description ?? "", due_day: "",
      is_recurring: editingIncome.is_recurring, status: editingIncome.status,
      payment_method: "Dinheiro" as PaymentMethod,
      credit_card_id: null as string | null,
    };
    if (editingExpense) return {
      description: editingExpense.description, category: editingExpense.category,
      type: editingExpense.type, amount: String(editingExpense.amount),
      due_description: "", due_day: String(editingExpense.due_day ?? ""),
      is_recurring: editingExpense.is_recurring, status: editingExpense.status,
      payment_method: (editingExpense.payment_method ?? "Dinheiro") as PaymentMethod,
      credit_card_id: editingExpense.credit_card_id ?? null,
    };
    return {
      description: "", category: isIncome ? "Salário" : "Outro",
      type: "Fixo", amount: "", due_description: "", due_day: "",
      is_recurring: false, status: "Pendente",
      payment_method: "Dinheiro" as PaymentMethod,
      credit_card_id: null as string | null,
    };
  });

  const [loan, setLoan] = useState({
    debtorName: "", description: "", installmentAmount: "", totalInstallments: "", dueDay: "",
  });
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<CreditCard[]>([]);

  // Carrega cartões só quando o modal de despesa abre.
  useEffect(() => {
    if (open && mode === "expense") {
      getCreditCards().then(setCards).catch(() => setCards([]));
    }
  }, [open, mode]);

  // A entrada de empréstimo só existe na criação (não na edição)
  const isLoan = isIncome && !isEditing && form.category === "Empréstimo";

  const loanInstAmt = parseFloat(loan.installmentAmount.replace(",", ".")) || 0;
  const loanQty     = parseInt(loan.totalInstallments) || 0;
  const loanTotal   = loanInstAmt * loanQty;

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm(p => ({ ...p, [k]: v }));
  }
  function setL<K extends keyof typeof loan>(k: K, v: string) {
    setLoan(p => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLoan) {
        if (!loan.debtorName.trim()) throw new Error("Nome do devedor é obrigatório");
        if (!loanInstAmt || loanInstAmt <= 0) throw new Error("Valor da parcela inválido");
        if (!loanQty || loanQty <= 0) throw new Error("Quantidade de parcelas inválida");
        await createLoan({
          debtor_name: loan.debtorName.trim(),
          description: loan.description.trim() || null,
          installment_amount: loanInstAmt,
          total_installments: loanQty,
          due_day: loan.dueDay ? parseInt(loan.dueDay) : null,
        }, competencia);
        toast({ title: "Empréstimo cadastrado!", description: `${loanQty}x ${formatCurrency(loanInstAmt)} · Total: ${formatCurrency(loanTotal)}`, variant: "success" });
      } else {
        const amount = parseFloat(form.amount.replace(",", "."));
        if (isNaN(amount) || amount < 0) throw new Error("Valor inválido");
        if (isIncome) {
          const payload = {
            competencia, description: form.description.trim(),
            category: form.category as IncomeCategory, type: form.type as "Fixo" | "Variável",
            amount, due_description: form.due_description || null,
            is_commission: false, is_recurring: form.is_recurring,
            status: form.status as IncomeStatus,
          };
          if (editingIncome) await updateIncome(editingIncome.id, payload);
          else await createIncome(payload);
        } else {
          const payload = {
            competencia, description: form.description.trim(),
            category: form.category as ExpenseCategory, type: form.type as "Fixo" | "Variável",
            amount, due_day: form.due_day ? parseInt(form.due_day) : null,
            is_recurring: form.is_recurring, status: form.status as ExpenseStatus,
            payment_method: form.payment_method,
            credit_card_id: form.payment_method === "Cartão de Crédito" ? form.credit_card_id : null,
          };
          if (editingExpense) await updateExpense(editingExpense.id, payload);
          else await createExpense(payload);
        }
        toast({ title: `${isIncome ? "Receita" : "Despesa"} ${isEditing ? "atualizada" : "cadastrada"}!`, variant: "success" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error
        ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Erro desconhecido";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const titleColor = isLoan ? "text-orange-400" : isIncome ? "text-emerald-400" : "text-purple-400";
  const submitClass = isLoan
    ? "bg-orange-500/90 hover:bg-orange-500 text-white border-0"
    : !isIncome
      ? "bg-purple-500 hover:bg-purple-400 text-white border-0"
      : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className={`text-zinc-100 ${titleColor}`}>
            {isEditing ? "Editar" : "Novo"}{" "}
            {isLoan ? "Empréstimo Pessoal" : isIncome ? "Receita" : "Despesa"}
          </DialogTitle>
          {isLoan && (
            <p className="text-[11px] text-zinc-500 font-mono">
              // Registrar empréstimo parcelado — parcelas geradas automaticamente mês a mês
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3 py-2">
          {/* Seletor de categoria — sempre visível para receitas */}
          {isIncome && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Categoria</Label>
              <Select
                value={form.category}
                onValueChange={v => set("category", v)}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  {INCOME_CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isLoan ? (
            /* ─── FORMULÁRIO DE EMPRÉSTIMO ─────────────────── */
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">
                  Nome do Devedor <span className="text-orange-400">*</span>
                </Label>
                <Input
                  placeholder="Ex: João Silva"
                  value={loan.debtorName}
                  onChange={e => setL("debtorName", e.target.value)}
                  required
                  className="border-zinc-700 focus-visible:border-orange-500/60 focus-visible:ring-orange-500/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Observação</Label>
                <Input
                  placeholder="Ex: Empréstimo em dinheiro, uso de cartão..."
                  value={loan.description}
                  onChange={e => setL("description", e.target.value)}
                  className="border-zinc-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Valor da Parcela (R$) <span className="text-orange-400">*</span>
                  </Label>
                  <Input
                    placeholder="0,00"
                    value={loan.installmentAmount}
                    onChange={e => setL("installmentAmount", e.target.value)}
                    required
                    className="border-zinc-700 font-mono focus-visible:border-orange-500/60 focus-visible:ring-orange-500/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">
                    Nº de Parcelas <span className="text-orange-400">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={360}
                    placeholder="Ex: 12"
                    value={loan.totalInstallments}
                    onChange={e => setL("totalInstallments", e.target.value)}
                    required
                    className="border-zinc-700 font-mono focus-visible:border-orange-500/60 focus-visible:ring-orange-500/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Dia de Vencimento</Label>
                  <Input
                    type="number"
                    min={1}
                    max={31}
                    placeholder="Ex: 15"
                    value={loan.dueDay}
                    onChange={e => setL("dueDay", e.target.value)}
                    className="border-zinc-700 font-mono"
                  />
                </div>

                {/* Total calculado em tempo real */}
                <div className={`rounded-lg border px-3 py-2.5 transition-all ${
                  loanTotal > 0
                    ? "border-orange-500/30 bg-orange-500/8"
                    : "border-zinc-800 bg-zinc-900/30"
                }`}>
                  <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                    Total a receber
                  </p>
                  <p className={`text-sm font-mono font-bold mt-0.5 ${loanTotal > 0 ? "text-orange-400" : "text-zinc-700"}`}>
                    {loanTotal > 0 ? formatCurrency(loanTotal) : "R$ —"}
                  </p>
                  {loanQty > 0 && loanInstAmt > 0 && (
                    <p className="text-[9px] text-zinc-600 mt-0.5 font-mono">
                      {loanQty}× {formatCurrency(loanInstAmt)}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ─── FORMULÁRIO REGULAR (RECEITA / DESPESA) ───── */
            <>
              {!isIncome && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Categoria</Label>
                  <Select value={form.category} onValueChange={v => set("category", v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {EXPENSE_CATEGORIES.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Descrição</Label>
                <Input
                  placeholder={isIncome ? "Ex: Salário, Freelance..." : "Ex: Mercado, Gasolina..."}
                  value={form.description}
                  onChange={e => set("description", e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Tipo</Label>
                  <Select value={form.type} onValueChange={v => set("type", v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="Fixo">Fixo</SelectItem>
                      <SelectItem value="Variável">Variável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Valor (R$)</Label>
                  <Input
                    placeholder="0,00"
                    value={form.amount}
                    onChange={e => set("amount", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isIncome ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Quando recebe</Label>
                    <Input
                      placeholder="Ex: Dia 5 útil"
                      value={form.due_description}
                      onChange={e => set("due_description", e.target.value)}
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-400">Dia do vencimento</Label>
                    <Input
                      type="number" min={1} max={31} placeholder="Ex: 10"
                      value={form.due_day}
                      onChange={e => set("due_day", e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Status</Label>
                  <Select value={form.status} onValueChange={v => set("status", v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {(isIncome
                        ? ["Pendente", "Recebido"]
                        : ["Pendente", "Pago", "Aguardando"]
                      ).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {!isIncome && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Forma de Pagamento</Label>
                  <Select
                    value={form.payment_method}
                    onValueChange={v => set("payment_method", v as PaymentMethod)}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      {PAYMENT_METHODS.map(m => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Seletor de cartão — só quando a forma de pagamento é Cartão de Crédito */}
              {!isIncome && form.payment_method === "Cartão de Crédito" && cards.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Cartão</Label>
                  <Select
                    value={form.credit_card_id ?? "none"}
                    onValueChange={v => set("credit_card_id", v === "none" ? null : v)}
                  >
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue placeholder="Selecionar cartão" /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="none">Sem cartão específico</SelectItem>
                      {cards.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Recorrente</Label>
                <Select
                  value={String(form.is_recurring)}
                  onValueChange={v => set("is_recurring", v === "true")}
                >
                  <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="true">Sim — todo mês</SelectItem>
                    <SelectItem value="false">Não — só este mês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className={submitClass}>
              {loading
                ? "Salvando..."
                : isLoan
                  ? "Registrar Empréstimo"
                  : isEditing
                    ? "Salvar"
                    : `Adicionar ${isIncome ? "Receita" : "Despesa"}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
