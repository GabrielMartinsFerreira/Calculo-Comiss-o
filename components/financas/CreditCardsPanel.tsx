"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard as CardIcon, Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { createCreditCard, updateCreditCard, deleteCreditCard } from "@/lib/finance-db";
import { toast } from "@/lib/use-toast";
import type { CardInvoice, CreditCard, CreditCardInsert } from "@/lib/finance";

interface CreditCardsPanelProps {
  invoices: CardInvoice[];
  onRefresh: () => void;
}

const invoiceStyle: Record<string, { color: string; bg: string; border: string }> = {
  Paga:  { color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
  Aberta:{ color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  Vazia: { color: "#71717a", bg: "rgba(113,113,122,0.08)", border: "rgba(113,113,122,0.2)" },
};

export function CreditCardsPanel({ invoices, onRefresh }: CreditCardsPanelProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CreditCard | null>(null);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20">
                <CardIcon className="h-3 w-3 text-orange-400" />
              </div>
              <CardTitle className="text-sm text-zinc-100">Cartões de Crédito</CardTitle>
            </div>
            <Button
              size="sm"
              className="h-7 gap-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 text-xs"
              onClick={() => { setEditing(null); setFormOpen(true); }}
            >
              <Plus className="h-3 w-3" /> Novo
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 space-y-2.5 pt-0">
          {invoices.length === 0 ? (
            <p className="py-6 text-center text-sm text-zinc-600">Nenhum cartão cadastrado.</p>
          ) : (
            <AnimatePresence>
              {invoices.map((inv, i) => {
                const s = invoiceStyle[inv.status] ?? invoiceStyle.Vazia;
                const limitPct = Math.min(inv.limitUsedPercent, 100);
                const overLimit = inv.limitUsedPercent > 100;
                return (
                  <motion.div
                    key={inv.card.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ delay: i * 0.05 }}
                    className="group rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-2.5 transition-all hover:border-zinc-700/60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium text-zinc-200 truncate">{inv.card.name}</span>
                        <span
                          className="rounded border px-1.5 py-0.5 text-[9px] font-semibold shrink-0"
                          style={{ color: s.color, borderColor: s.border, backgroundColor: s.bg }}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-zinc-200"
                          onClick={() => { setEditing(inv.card); setFormOpen(true); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-1.5 text-[11px] font-mono">
                      <span className="text-zinc-500">
                        Fatura: <span className="font-semibold text-zinc-200">{formatCurrency(inv.total)}</span>
                        {inv.pending > 0.005 && (
                          <span className="ml-2 text-orange-400">{formatCurrency(inv.pending)} em aberto</span>
                        )}
                      </span>
                      {inv.dueDate && (
                        <span className="text-zinc-600">vence {formatDate(inv.dueDate)}</span>
                      )}
                    </div>

                    {inv.card.limit_amount > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${limitPct}%`,
                              backgroundColor: overLimit ? "#ef4444" : inv.limitUsedPercent > 80 ? "#f59e0b" : "#06b6d4",
                            }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] font-mono text-zinc-600">
                          <span>{inv.limitUsedPercent.toFixed(0)}% do limite</span>
                          <span>{formatCurrency(inv.card.limit_amount)}</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </CardContent>
      </Card>

      <CreditCardModal
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        editing={editing}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ── Modal de criação/edição de cartão ────────────────────────

interface CreditCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: CreditCard | null;
  onSuccess: () => void;
}

function CreditCardModal({ open, onOpenChange, editing, onSuccess }: CreditCardModalProps) {
  const [form, setForm] = useState(() => ({
    name: editing?.name ?? "",
    limit: editing ? String(editing.limit_amount) : "",
    closing: editing?.closing_day ? String(editing.closing_day) : "",
    due: editing?.due_day ? String(editing.due_day) : "",
  }));
  const [loading, setLoading] = useState(false);

  // Reinicializa o form sempre que o alvo de edição muda.
  const [lastId, setLastId] = useState<string | null>(editing?.id ?? null);
  if ((editing?.id ?? null) !== lastId) {
    setLastId(editing?.id ?? null);
    setForm({
      name: editing?.name ?? "",
      limit: editing ? String(editing.limit_amount) : "",
      closing: editing?.closing_day ? String(editing.closing_day) : "",
      due: editing?.due_day ? String(editing.due_day) : "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: CreditCardInsert = {
        name: form.name.trim(),
        limit_amount: parseFloat(form.limit.replace(",", ".")) || 0,
        closing_day: form.closing ? parseInt(form.closing) : null,
        due_day: form.due ? parseInt(form.due) : null,
      };
      if (!payload.name) throw new Error("Nome do cartão é obrigatório");
      if (editing) await updateCreditCard(editing.id, payload);
      else await createCreditCard(payload);
      toast({ title: `Cartão ${editing ? "atualizado" : "cadastrado"}!`, variant: "success" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao salvar cartão", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setLoading(true);
    try {
      await deleteCreditCard(editing.id);
      toast({ title: "Cartão removido.", variant: "success" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao remover cartão", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-orange-400">
            {editing ? "Editar" : "Novo"} Cartão de Crédito
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Nome <span className="text-orange-400">*</span></Label>
            <Input
              placeholder="Ex: Nubank, Itaú..."
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
              className="border-zinc-700 focus-visible:border-orange-500/60 focus-visible:ring-orange-500/30"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Limite (R$)</Label>
            <Input
              inputMode="decimal" placeholder="0,00"
              value={form.limit}
              onChange={(e) => setForm((p) => ({ ...p, limit: e.target.value }))}
              className="border-zinc-700 font-mono"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Dia de Fechamento</Label>
              <Input
                type="number" min={1} max={31} placeholder="Ex: 25"
                value={form.closing}
                onChange={(e) => setForm((p) => ({ ...p, closing: e.target.value }))}
                className="border-zinc-700 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Dia de Vencimento</Label>
              <Input
                type="number" min={1} max={31} placeholder="Ex: 5"
                value={form.due}
                onChange={(e) => setForm((p) => ({ ...p, due: e.target.value }))}
                className="border-zinc-700 font-mono"
              />
            </div>
          </div>
          <DialogFooter className="pt-2 gap-2">
            {editing && (
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading} className="mr-auto">
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-orange-500/90 hover:bg-orange-500 text-white border-0">
              {loading ? "Salvando..." : editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
