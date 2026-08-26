"use client";
import { useState, useRef } from "react";
import { Upload, FileText, ArrowDownToLine, ArrowUpFromLine, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import { parseOfx, ofxToExpenseInserts, ofxToIncomeInserts, type OfxParseResult } from "@/lib/ofx-parser";
import { bulkInsertExpenses, bulkInsertIncomes } from "@/lib/finance-db";
import { toast } from "@/lib/use-toast";
import type { CreditCard } from "@/lib/finance";

interface OfxImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditCards: CreditCard[];
  onSuccess: () => void;
}

type Target = "expense" | "income" | "both";

const MAX_OFX_SIZE = 5 * 1024 * 1024; // 5MB — extratos OFX normais têm poucos KB

export function OfxImportModal({ open, onOpenChange, creditCards, onSuccess }: OfxImportModalProps) {
  const [result, setResult] = useState<OfxParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [target, setTarget] = useState<Target>("expense");
  const [cardId, setCardId] = useState<string>("none");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setResult(null); setFileName(""); setTarget("expense"); setCardId("none");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_OFX_SIZE) {
      toast({ title: "Arquivo muito grande", description: "O limite é 5MB.", variant: "destructive" });
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseOfx(text);
      if (parsed.transactions.length === 0) {
        toast({ title: "Nenhuma transação encontrada", description: "Verifique se o arquivo é um OFX válido.", variant: "destructive" });
        setResult(null);
        return;
      }
      setResult(parsed);
    } catch {
      toast({ title: "Erro ao ler arquivo", variant: "destructive" });
    }
  }

  async function handleImport() {
    if (!result) return;
    setLoading(true);
    try {
      let inserted = 0;
      const linkCard = cardId !== "none" ? cardId : null;

      if (target === "expense" || target === "both") {
        const rows = ofxToExpenseInserts(result.transactions, { creditCardId: linkCard });
        inserted += await bulkInsertExpenses(rows);
      }
      if (target === "income" || target === "both") {
        const rows = ofxToIncomeInserts(result.transactions);
        inserted += await bulkInsertIncomes(rows);
      }

      toast({
        title: inserted > 0 ? `${inserted} transação(ões) importada(s)!` : "Nada novo a importar",
        description: inserted > 0
          ? "Lançamentos atribuídos ao mês de cada transação."
          : "Todas as transações já existiam (dedup por FITID).",
        variant: "success",
      });
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao importar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-cyan-400">Importar Extrato (OFX)</DialogTitle>
          <p className="text-[11px] text-zinc-500 font-mono">
            // conciliação bancária — débitos viram despesas, créditos viram receitas
          </p>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* File picker */}
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900/40 px-4 py-6 transition-colors hover:border-cyan-500/40 hover:bg-cyan-500/5">
            <Upload className="h-5 w-5 text-zinc-500" />
            <span className="text-xs text-zinc-400">
              {fileName ? <span className="text-cyan-400 font-mono">{fileName}</span> : "Selecionar arquivo .ofx"}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".ofx,application/x-ofx,text/plain"
              onChange={handleFile}
              className="hidden"
            />
          </label>

          {result && (
            <>
              {/* Resumo do parse */}
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-red-400 uppercase tracking-wider">
                    <ArrowDownToLine className="h-3 w-3" /> Saídas
                  </div>
                  <p className="font-mono text-sm font-bold text-red-400 mt-0.5">{result.debitCount}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{formatCurrency(result.totalDebit)}</p>
                </div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 uppercase tracking-wider">
                    <ArrowUpFromLine className="h-3 w-3" /> Entradas
                  </div>
                  <p className="font-mono text-sm font-bold text-emerald-400 mt-0.5">{result.creditCount}</p>
                  <p className="font-mono text-[10px] text-zinc-600">{formatCurrency(result.totalCredit)}</p>
                </div>
              </div>

              {/* Destino */}
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Importar como</Label>
                <Select value={target} onValueChange={(v) => setTarget(v as Target)}>
                  <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="expense">Apenas saídas → Despesas</SelectItem>
                    <SelectItem value="income">Apenas entradas → Receitas</SelectItem>
                    <SelectItem value="both">Ambos (saídas e entradas)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Cartão opcional para débitos */}
              {(target === "expense" || target === "both") && creditCards.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Vincular saídas a um cartão (opcional)</Label>
                  <Select value={cardId} onValueChange={setCardId}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-700">
                      <SelectItem value="none">Sem cartão (Débito)</SelectItem>
                      {creditCards.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Transações duplicadas (mesmo FITID) são ignoradas automaticamente.
              </div>
            </>
          )}
        </div>

        <DialogFooter className="pt-1">
          <Button type="button" variant="outline" onClick={() => { reset(); onOpenChange(false); }}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={loading || !result} className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            {loading ? "Importando..." : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
