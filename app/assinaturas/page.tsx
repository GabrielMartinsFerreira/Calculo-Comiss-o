"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat2, Plus, Pencil, Trash2, RefreshCw,
  PauseCircle, PlayCircle, CreditCard as CardIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/use-toast";
import { formatCurrency, getCurrentCompetencia, formatMonthYear } from "@/lib/utils";
import {
  getRecurringServices, createRecurringService, updateRecurringService,
  deleteRecurringService, syncRecurringServicesToMonth, getCreditCards,
} from "@/lib/finance-db";
import type {
  RecurringService, RecurringServiceInsert, CreditCard, ExpenseCategory,
} from "@/lib/finance";

const SUBSCRIPTION_CATEGORIES: ExpenseCategory[] = [
  "Assinatura", "Saúde", "Lazer", "Alimentação", "Transporte", "Outro",
];

export default function AssinaturasPage() {
  const [services, setServices] = useState<RecurringService[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringService | null>(null);
  const [syncing, setSyncing] = useState(false);

  const competencia = getCurrentCompetencia();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [svcs, cds] = await Promise.all([
        getRecurringServices(),
        getCreditCards().catch(() => [] as CreditCard[]),
      ]);
      setServices(svcs);
      setCards(cds);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSync() {
    setSyncing(true);
    try {
      const count = await syncRecurringServicesToMonth(competencia);
      toast({
        title: count > 0
          ? `${count} lançamento${count > 1 ? "s" : ""} gerado${count > 1 ? "s" : ""}!`
          : "Nenhum novo lançamento.",
        description: count > 0
          ? `Despesas de assinatura lançadas em ${formatMonthYear(competencia)}.`
          : "Todos os serviços ativos já foram lançados neste mês.",
        variant: "success",
      });
    } catch {
      toast({ title: "Erro ao gerar lançamentos", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  async function handleToggleStatus(svc: RecurringService) {
    try {
      await updateRecurringService(svc.id, {
        status: svc.status === "Ativo" ? "Pausado" : "Ativo",
      });
      load();
    } catch {
      toast({ title: "Erro ao atualizar serviço", variant: "destructive" });
    }
  }

  const active = services.filter((s) => s.status === "Ativo");
  const totalMonthly = active.reduce((acc, s) => acc + s.amount, 0);

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">
            // assinaturas
          </p>
          <h1 className="text-2xl font-bold text-zinc-100 leading-none">Serviços Recorrentes</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Gerencie suas assinaturas e débitos automáticos no cartão
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/50"
            onClick={handleSync}
            disabled={syncing}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Aplicar em </span>
            {formatMonthYear(competencia)}
          </Button>
          <Button
            className="h-9 gap-2"
            onClick={() => { setEditing(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4" /> Nova Assinatura
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
          <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest">Total/mês</p>
          <p className="text-lg font-mono font-bold text-cyan-400 mt-0.5">{formatCurrency(totalMonthly)}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
          <p className="text-[11px] font-mono text-emerald-500/70 uppercase tracking-widest">Ativos</p>
          <p className="text-lg font-mono font-bold text-emerald-400 mt-0.5">{active.length}</p>
        </div>
        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
          <p className="text-[11px] font-mono text-zinc-500/70 uppercase tracking-widest">Total</p>
          <p className="text-lg font-mono font-bold text-zinc-300 mt-0.5">{services.length}</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Carregando...
          </div>
        </div>
      ) : services.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800">
            <Repeat2 className="h-6 w-6 text-zinc-600" />
          </div>
          <p className="text-zinc-500 text-sm">Nenhuma assinatura cadastrada.</p>
          <p className="text-zinc-600 text-xs text-center max-w-xs">
            Cadastre seus serviços recorrentes (Netflix, Spotify, planos de saúde) para gerar
            lançamentos automaticamente toda vez que inicializar um novo mês.
          </p>
          <Button
            className="mt-2"
            onClick={() => { setEditing(null); setFormOpen(true); }}
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Primeira Assinatura
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <AnimatePresence>
            {services.map((svc, i) => (
              <motion.div
                key={svc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: i * 0.04 }}
                className={`group relative rounded-xl border transition-all ${
                  svc.status === "Ativo"
                    ? "border-zinc-800/60 bg-[rgba(22,27,38,0.8)] backdrop-blur-sm hover:border-zinc-700"
                    : "border-zinc-800/30 bg-zinc-900/20 opacity-55"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-100 font-semibold truncate">
                          {svc.service_name}
                        </span>
                        <Badge
                          variant={svc.status === "Ativo" ? "success" : "outline"}
                          className={`text-[9px] h-4 shrink-0 ${svc.status === "Pausado" ? "text-zinc-500 border-zinc-700" : ""}`}
                        >
                          {svc.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-600 mt-0.5">{svc.category}</p>
                    </div>
                    <span className="text-lg font-mono font-bold text-emerald-400 shrink-0">
                      {formatCurrency(svc.amount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3 text-[11px] text-zinc-600">
                    <span>
                      Dia{" "}
                      <span className="font-mono font-semibold text-zinc-400">{svc.billing_day}</span>
                    </span>
                    {svc.credit_cards && (
                      <span className="flex items-center gap-1">
                        <CardIcon className="h-3 w-3 text-zinc-600" />
                        <span className="text-zinc-400">{svc.credit_cards.name}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-1 px-3 pb-3 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-600 hover:text-zinc-300"
                    title={svc.status === "Ativo" ? "Pausar serviço" : "Reativar serviço"}
                    onClick={() => handleToggleStatus(svc)}
                  >
                    {svc.status === "Ativo" ? (
                      <PauseCircle className="h-3.5 w-3.5" />
                    ) : (
                      <PlayCircle className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-600 hover:text-zinc-300"
                    onClick={() => { setEditing(svc); setFormOpen(true); }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <RecurringServiceModal
        open={formOpen}
        onOpenChange={(o) => { setFormOpen(o); if (!o) setEditing(null); }}
        editing={editing}
        cards={cards}
        onSuccess={load}
      />
    </div>
  );
}

// ── Modal de criação/edição ───────────────────────────────────

interface RecurringServiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: RecurringService | null;
  cards: CreditCard[];
  onSuccess: () => void;
}

function RecurringServiceModal({
  open, onOpenChange, editing, cards, onSuccess,
}: RecurringServiceModalProps) {
  const [form, setForm] = useState({
    service_name: "",
    amount: "",
    billing_day: "",
    credit_card_id: null as string | null,
    category: "Assinatura" as ExpenseCategory,
    status: "Ativo" as "Ativo" | "Pausado",
  });
  const [loading, setLoading] = useState(false);

  // Hidrata o formulário sempre que o alvo de edição ou a abertura muda
  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            service_name: editing.service_name,
            amount: String(editing.amount),
            billing_day: String(editing.billing_day),
            credit_card_id: editing.credit_card_id,
            category: editing.category,
            status: editing.status,
          }
        : {
            service_name: "",
            amount: "",
            billing_day: "",
            credit_card_id: null,
            category: "Assinatura",
            status: "Ativo",
          }
    );
  }, [open, editing?.id]);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (!form.service_name.trim()) throw new Error("Nome do serviço é obrigatório");
      const amount = parseFloat(form.amount.replace(",", "."));
      if (isNaN(amount) || amount <= 0) throw new Error("Valor inválido");
      const billingDay = parseInt(form.billing_day);
      if (!billingDay || billingDay < 1 || billingDay > 31)
        throw new Error("Dia de cobrança inválido (1–31)");

      const payload: RecurringServiceInsert = {
        service_name: form.service_name.trim(),
        amount,
        billing_day: billingDay,
        credit_card_id: form.credit_card_id,
        category: form.category,
        status: form.status,
      };

      if (editing) await updateRecurringService(editing.id, payload);
      else await createRecurringService(payload);

      toast({ title: `Serviço ${editing ? "atualizado" : "cadastrado"}!`, variant: "success" });
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Erro ao salvar", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!editing) return;
    setLoading(true);
    try {
      await deleteRecurringService(editing.id);
      toast({ title: "Serviço removido.", variant: "success" });
      onSuccess();
      onOpenChange(false);
    } catch {
      toast({ title: "Erro ao remover serviço", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-cyan-400">
            {editing ? "Editar" : "Nova"} Assinatura
          </DialogTitle>
          <p className="text-[11px] text-zinc-500 font-mono">
            // serviço recorrente — lança automaticamente ao inicializar o mês
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-3 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">
              Nome do Serviço <span className="text-cyan-400">*</span>
            </Label>
            <Input
              placeholder="Ex: Netflix, Spotify, iCloud, Academia..."
              value={form.service_name}
              onChange={(e) => set("service_name", e.target.value)}
              required
              className="border-zinc-700 focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/40"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">
                Valor (R$) <span className="text-cyan-400">*</span>
              </Label>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                required
                className="border-zinc-700 font-mono focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">
                Dia de Cobrança <span className="text-cyan-400">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                max={31}
                placeholder="Ex: 5"
                value={form.billing_day}
                onChange={(e) => set("billing_day", e.target.value)}
                required
                className="border-zinc-700 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Categoria</Label>
            <Select
              value={form.category}
              onValueChange={(v) => set("category", v as ExpenseCategory)}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                {SUBSCRIPTION_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Cartão de Crédito</Label>
            <Select
              value={form.credit_card_id ?? "none"}
              onValueChange={(v) => set("credit_card_id", v === "none" ? null : v)}
            >
              <SelectTrigger className="bg-zinc-900 border-zinc-700">
                <SelectValue placeholder="Selecionar cartão (opcional)" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="none">Sem cartão específico</SelectItem>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {editing && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as "Ativo" | "Pausado")}
              >
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-2 gap-2">
            {editing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remover
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-cyan-500/90 hover:bg-cyan-500 text-zinc-950 border-0 font-semibold"
            >
              {loading ? "Salvando..." : editing ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
