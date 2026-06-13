"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertBudgetCategory, deleteBudgetCategory } from "@/lib/finance-db";
import { toast } from "@/lib/use-toast";
import { EXPENSE_CATEGORIES } from "@/lib/finance";
import type { BudgetCategory } from "@/lib/finance";

interface BudgetEnvelopeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competencia: string;
  categories: BudgetCategory[];
  onSuccess: () => void;
}

export function BudgetEnvelopeModal({
  open, onOpenChange, competencia, categories, onSuccess,
}: BudgetEnvelopeModalProps) {
  // Mapa categoria → string do input, pré-preenchido com as alocações atuais.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const c of EXPENSE_CATEGORIES) {
      const found = categories.find((bc) => bc.category_name === c);
      init[c] = found ? String(found.allocated_amount) : "";
    }
    return init;
  });
  const [loading, setLoading] = useState(false);

  // O Dialog permanece montado; ao (re)abrir, sincroniza os inputs com as
  // alocações atuais carregadas da base.
  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const c of EXPENSE_CATEGORIES) {
      const found = categories.find((bc) => bc.category_name === c);
      next[c] = found ? String(found.allocated_amount) : "";
    }
    setValues(next);
  }, [open, categories]);

  const total = EXPENSE_CATEGORIES.reduce(
    (s, c) => s + (parseFloat((values[c] ?? "").replace(",", ".")) || 0), 0
  );

  async function handleSave() {
    setLoading(true);
    try {
      for (const cat of EXPENSE_CATEGORIES) {
        const raw = (values[cat] ?? "").trim();
        const num = parseFloat(raw.replace(",", "."));
        const existing = categories.find((bc) => bc.category_name === cat);

        if (raw === "" || isNaN(num) || num <= 0) {
          // vazio/zero → remover envelope se existia
          if (existing) await deleteBudgetCategory(existing.id);
        } else {
          await upsertBudgetCategory(competencia, cat, num);
        }
      }
      toast({ title: "Orçamentos atualizados!", variant: "success" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao salvar orçamentos", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Orçamento por Categoria</DialogTitle>
          <p className="text-[11px] text-zinc-500 font-mono">
            // defina um limite mensal por categoria — deixe vazio para não controlar
          </p>
        </DialogHeader>

        <div className="grid gap-2.5 py-2 max-h-[50vh] overflow-y-auto scrollbar-dark pr-1">
          {EXPENSE_CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center gap-3">
              <Label className="text-xs text-zinc-400 w-28 shrink-0">{cat}</Label>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-zinc-600 font-mono">R$</span>
                <Input
                  inputMode="decimal"
                  placeholder="0,00"
                  value={values[cat] ?? ""}
                  onChange={(e) => setValues((p) => ({ ...p, [cat]: e.target.value }))}
                  className="pl-8 h-8 font-mono text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
          <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-mono">Total alocado</span>
          <span className="font-mono text-sm font-bold text-cyan-400">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(total)}
          </span>
        </div>

        <DialogFooter className="pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Orçamentos"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
