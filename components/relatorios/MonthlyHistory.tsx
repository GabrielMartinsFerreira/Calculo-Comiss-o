"use client";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMonthYear } from "@/lib/utils";
import { calculateCommission, getCurrentBracket } from "@/lib/commission";
import type { MonthSummary } from "@/lib/types";

interface MonthlyHistoryProps {
  data: MonthSummary[];
}

const BRACKET_COLORS: Record<string, string> = {
  "Mini Meta": "#06b6d4",
  "Meta":      "#10b981",
  "Mega Meta": "#f59e0b",
};

export function MonthlyHistory({ data }: MonthlyHistoryProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Histórico por Competência</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-600">Nenhum dado encontrado.</p>
        ) : (
          <div className="space-y-2">
            {data.map((month, i) => {
              const prev = data[i + 1];
              const delta = prev ? month.total_pago - prev.total_pago : null;
              const bracket = getCurrentBracket(month.total_pago);
              const comissao = calculateCommission(month.total_pago);
              const color = BRACKET_COLORS[bracket.label] ?? "#06b6d4";

              return (
                <div
                  key={month.competencia}
                  className="group flex items-center justify-between gap-4 rounded-lg border border-zinc-800/60 bg-zinc-900/30 p-4 transition-all duration-200 hover:border-zinc-700/60 hover:bg-zinc-800/30"
                >
                  {/* Accent line */}
                  <div className="h-10 w-0.5 rounded-full shrink-0" style={{ backgroundColor: color, opacity: 0.6 }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-zinc-200 capitalize">
                        {formatMonthYear(month.competencia)}
                      </p>
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold font-mono border"
                        style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}
                      >
                        {bracket.label} · {(bracket.rate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-zinc-600 font-mono">
                      {month.count_pago} pagas · {month.count_pendente} pendentes
                    </p>
                  </div>

                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Total Pago</p>
                      <p className="font-mono text-sm font-semibold text-emerald-400">
                        {formatCurrency(month.total_pago)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Comissão</p>
                      <p className="font-mono text-sm font-semibold text-zinc-200">
                        {formatCurrency(comissao)}
                      </p>
                    </div>
                    {delta !== null && (
                      <div className="w-20 text-right">
                        {delta > 0 ? (
                          <span className="flex items-center justify-end gap-0.5 text-xs text-emerald-400 font-mono">
                            <TrendingUp className="h-3 w-3" />+{formatCurrency(delta)}
                          </span>
                        ) : delta < 0 ? (
                          <span className="flex items-center justify-end gap-0.5 text-xs text-red-400 font-mono">
                            <TrendingDown className="h-3 w-3" />{formatCurrency(delta)}
                          </span>
                        ) : (
                          <Minus className="h-3 w-3 text-zinc-700 ml-auto" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
