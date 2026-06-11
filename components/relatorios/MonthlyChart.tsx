"use client";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatMonthYearShort } from "@/lib/utils";
import type { MonthSummary } from "@/lib/types";

interface MonthlyChartProps {
  data: MonthSummary[];
}

function HUDTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-cyan-500/20 bg-zinc-900/95 backdrop-blur p-3 shadow-neon-cyan text-xs space-y-2">
      <p className="font-mono text-zinc-400 uppercase tracking-widest text-[10px]">// {label}</p>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.name} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-zinc-400">{p.name}</span>
            </div>
            <span className="font-mono font-semibold" style={{ color: p.color }}>
              {formatCurrency(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthlyChart({ data }: MonthlyChartProps) {
  const chartData = data.map((d) => ({
    mes: formatMonthYearShort(d.competencia),
    Previsão: d.total_previsto,
    Pago: d.total_pago,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Previsão vs. Pago por Mês</CardTitle>
          <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-cyan-500/70 border border-cyan-500/50" />Previsão</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/70 border border-emerald-500/50" />Pago</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#10b981" stopOpacity={0.55} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(63,63,70,0.5)" />
            <XAxis
              dataKey="mes"
              tick={{ fontSize: 11, fill: "#a1a1aa", fontFamily: "var(--font-mono)" }}
              axisLine={{ stroke: "rgba(63,63,70,0.6)" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 10, fill: "#a1a1aa", fontFamily: "var(--font-mono)" }}
              axisLine={false}
              tickLine={false}
              width={52}
            />
            <Tooltip content={<HUDTooltip />} />
            <ReferenceLine y={50000} stroke="rgba(6,182,212,0.55)" strokeDasharray="4 4"
              label={{ value: "Mini Meta · R$50k", fill: "#06b6d4", fontSize: 10, fontFamily: "var(--font-mono)", position: "insideTopRight" }} />
            <ReferenceLine y={70000} stroke="rgba(16,185,129,0.55)" strokeDasharray="4 4"
              label={{ value: "Meta · R$70k", fill: "#10b981", fontSize: 10, fontFamily: "var(--font-mono)", position: "insideTopRight" }} />
            <Area
              dataKey="Previsão"
              stroke="#06b6d4"
              strokeWidth={2.5}
              fill="url(#gradCyan)"
              dot={{ r: 3.5, fill: "#06b6d4", stroke: "#09090b", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "#06b6d4", stroke: "#09090b", strokeWidth: 2 }}
            />
            <Area
              dataKey="Pago"
              stroke="#10b981"
              strokeWidth={2.5}
              fill="url(#gradGreen)"
              dot={{ r: 3.5, fill: "#10b981", stroke: "#09090b", strokeWidth: 2 }}
              activeDot={{ r: 5, fill: "#10b981", stroke: "#09090b", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
