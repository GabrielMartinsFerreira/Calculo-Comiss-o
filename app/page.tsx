"use client";
import { useEffect, useState, useCallback } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KPICards } from "@/components/dashboard/KPICards";
import { MetaProgress } from "@/components/dashboard/MetaProgress";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { getOrders, getMonthlyStats, getCompetencias } from "@/lib/supabase";
import { getCurrentCompetencia, formatMonthYear } from "@/lib/utils";
import type { ServiceOrder } from "@/lib/types";

export default function DashboardPage() {
  const [competencia, setCompetencia] = useState(getCurrentCompetencia());
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [stats, setStats] = useState({ total_previsto: 0, total_pago: 0, count_pendente: 0, count_pago: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [comps, data, monthStats] = await Promise.all([
        getCompetencias(),
        getOrders(competencia),
        getMonthlyStats(competencia),
      ]);
      setCompetencias(comps.length ? comps : [competencia]);
      setOrders(data);
      setStats(monthStats);
    } finally {
      setLoading(false);
    }
  }, [competencia]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">// painel</p>
          <h1 className="text-2xl font-bold text-zinc-100 leading-none">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600 capitalize">{formatMonthYear(competencia)}</p>
        </div>
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Carregando dados...
          </div>
        </div>
      ) : (
        <>
          <KPICards
            totalPrevisto={stats.total_previsto}
            totalPago={stats.total_pago}
            countPendente={stats.count_pendente}
            countPago={stats.count_pago}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <MetaProgress totalPago={stats.total_pago} />
            <RecentOrders orders={orders} />
          </div>
        </>
      )}
    </div>
  );
}
