"use client";
import { useEffect, useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OSForm } from "@/components/lancamentos/OSForm";
import { OSTable } from "@/components/lancamentos/OSTable";
import { getOrders, getCompetencias, getMonthlyStats } from "@/lib/supabase";
import { getCurrentCompetencia, formatMonthYear, formatCurrency } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";
import type { ServiceOrder } from "@/lib/types";

export default function LancamentosPage() {
  const [competencia, setCompetencia] = useState(getCurrentCompetencia());
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState({ total_previsto: 0, total_pago: 0, count_pendente: 0, count_pago: 0 });
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [comps, data, monthStats] = await Promise.all([
        getCompetencias(),
        getOrders(competencia),
        getMonthlyStats(competencia),
      ]);
      const allComps = comps.includes(competencia) ? comps : [competencia, ...comps];
      setCompetencias(allComps);
      setOrders(data);
      setStats(monthStats);
    } finally {
      setLoading(false);
    }
  }, [competencia]);

  useEffect(() => { load(); }, [load]);

  function handleEdit(order: ServiceOrder) { setEditing(order); setFormOpen(true); }
  function handleNew() { setEditing(null); setFormOpen(true); }

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">// ordens de serviço</p>
          <h1 className="text-2xl font-bold text-zinc-100 leading-none">Lançamentos</h1>
        </div>
        <div className="flex items-center gap-3">
          <Select value={competencia} onValueChange={setCompetencia}>
            <SelectTrigger className="w-48 bg-zinc-900/80 border-zinc-700 text-zinc-300 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {competencias.map((c) => (
                <SelectItem key={c} value={c} className="text-zinc-300 capitalize focus:bg-zinc-800 focus:text-cyan-400">
                  {formatMonthYear(c)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNew} className="gap-2 h-9">
            <Plus className="h-4 w-4" />Nova OS
          </Button>
        </div>
      </div>

      {/* Resumo rápido */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-4 py-3">
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-600">Previsão:</span>
          <span className="font-mono font-semibold text-zinc-300">{formatCurrency(stats.total_previsto)}</span>
        </div>
        <span className="text-zinc-800">·</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-600">Pago:</span>
          <span className="font-mono font-semibold text-emerald-400">{formatCurrency(stats.total_pago)}</span>
        </div>
        <span className="text-zinc-800">·</span>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-zinc-600">Comissão Real:</span>
          <span className="font-mono font-semibold text-cyan-400">{formatCurrency(calculateCommission(stats.total_pago))}</span>
        </div>
        <span className="text-zinc-800 ml-auto" />
        <Badge variant="warning" pulse>{stats.count_pendente} pendentes</Badge>
        <Badge variant="success">{stats.count_pago} pagas</Badge>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Carregando...
          </div>
        </div>
      ) : (
        <OSTable orders={orders} onEdit={handleEdit} onRefresh={load} />
      )}

      <OSForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null); }}
        order={editing}
        onSuccess={load}
      />
    </div>
  );
}
