"use client";
import { useEffect, useState } from "react";
import { MonthlyChart } from "@/components/relatorios/MonthlyChart";
import { MonthlyHistory } from "@/components/relatorios/MonthlyHistory";
import { getCompetencias, getOrders } from "@/lib/supabase";
import { calculateCommission } from "@/lib/commission";
import type { MonthSummary } from "@/lib/types";

export default function RelatoriosPage() {
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const comps = await getCompetencias();
        const results = await Promise.all(
          comps.map(async (competencia) => {
            const orders = await getOrders(competencia);
            const total_previsto = orders.reduce((s, o) => s + o.order_value, 0);
            const paid = orders.filter((o) => o.status === "Pago");
            const total_pago = paid.reduce((s, o) => s + o.order_value, 0);
            return {
              competencia,
              total_previsto,
              total_pago,
              comissao_prevista: calculateCommission(total_previsto),
              comissao_real: calculateCommission(total_pago),
              count_pendente: orders.filter((o) => o.status === "Pendente").length,
              count_pago: paid.length,
            } satisfies MonthSummary;
          })
        );
        setSummaries(results);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">// análise</p>
        <h1 className="text-2xl font-bold text-zinc-100 leading-none">Relatórios</h1>
        <p className="mt-1 text-sm text-zinc-600">Desempenho mensal consolidado</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-sm text-zinc-600 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            Carregando dados...
          </div>
        </div>
      ) : summaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-sm text-zinc-600">Nenhum dado encontrado.</p>
          <p className="text-xs text-zinc-700 font-mono">Cadastre OS na aba de Lançamentos para ver os relatórios.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <MonthlyChart data={[...summaries].reverse()} />
          <MonthlyHistory data={summaries} />
        </div>
      )}
    </div>
  );
}
