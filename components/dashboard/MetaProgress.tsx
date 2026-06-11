"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { COMMISSION_BRACKETS, getCurrentBracket, getNextBracket, calculateCommission } from "@/lib/commission";
import { Target, ChevronRight } from "lucide-react";

interface MetaProgressProps {
  totalPago: number;
}

const BRACKET_COLORS = {
  "Mini Meta": { color: "#06b6d4", glow: "rgba(6,182,212,0.4)", bg: "rgba(6,182,212,0.1)" },
  "Meta":      { color: "#10b981", glow: "rgba(16,185,129,0.4)", bg: "rgba(16,185,129,0.1)" },
  "Mega Meta": { color: "#f59e0b", glow: "rgba(245,158,11,0.4)", bg: "rgba(245,158,11,0.1)" },
};

export function MetaProgress({ totalPago }: MetaProgressProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 100); return () => clearTimeout(t); }, [totalPago]);

  const currentBracket = getCurrentBracket(totalPago);
  const nextBracket = getNextBracket(totalPago);
  const comissao = calculateCommission(totalPago);

  // Progresso por segmento
  const seg1 = Math.min(totalPago, 50000);
  const seg2 = totalPago > 50000 ? Math.min(totalPago - 50000, 20000) : 0;
  const seg3 = totalPago > 70000 ? totalPago - 70000 : 0;
  const pct1 = (seg1 / 50000) * 100;
  const pct2 = (seg2 / 20000) * 100;
  const pct3 = seg3 > 0 ? Math.min((seg3 / 30000) * 100, 100) : 0;
  const remaining = nextBracket
    ? (currentBracket.label === "Mini Meta" ? 50000 - totalPago : 70000 - totalPago)
    : 0;
  const theme = BRACKET_COLORS[currentBracket.label as keyof typeof BRACKET_COLORS];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: theme.bg }}>
              <Target className="h-3.5 w-3.5" style={{ color: theme.color }} />
            </div>
            <CardTitle className="text-sm">Progresso da Meta Mensal</CardTitle>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] text-zinc-600 uppercase tracking-wider">Comissão Real</p>
            <p className="font-mono text-lg font-semibold" style={{ color: theme.color }}>
              {formatCurrency(comissao)}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Faixa atual */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 rounded-md border px-2.5 py-1"
            style={{ borderColor: `${theme.color}40`, backgroundColor: theme.bg }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ backgroundColor: theme.color }} />
            <span className="text-xs font-semibold" style={{ color: theme.color }}>
              {currentBracket.label}
            </span>
            <span className="text-xs" style={{ color: theme.color }}>
              · {(currentBracket.rate * 100).toFixed(1)}%
            </span>
          </div>
          <ChevronRight className="h-3 w-3 text-zinc-700" />
          <span className="font-mono text-sm text-zinc-400">{formatCurrency(totalPago)}</span>
        </div>

        {/* Barra segmentada em 3 zonas */}
        <div className="space-y-1.5">
          <div className="flex gap-1 h-3">
            {/* Segmento 1: 0-50k (cyan) */}
            <div className="relative flex-[5] rounded-sm overflow-hidden bg-zinc-800/80">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: "linear-gradient(90deg, #0891b2, #06b6d4)" }}
                initial={{ width: "0%" }}
                animate={{ width: animated ? `${pct1}%` : "0%" }}
                transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
              />
              {pct1 >= 99 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
              )}
            </div>
            {/* Segmento 2: 50k-70k (green) */}
            <div className="relative flex-[2] rounded-sm overflow-hidden bg-zinc-800/80">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: "linear-gradient(90deg, #059669, #10b981)" }}
                initial={{ width: "0%" }}
                animate={{ width: animated ? `${pct2}%` : "0%" }}
                transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 }}
              />
            </div>
            {/* Segmento 3: >70k (gold) */}
            <div className="relative flex-[3] rounded-sm overflow-hidden bg-zinc-800/80">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{ background: "linear-gradient(90deg, #d97706, #f59e0b)" }}
                initial={{ width: "0%" }}
                animate={{ width: animated ? `${pct3}%` : "0%" }}
                transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: 0.2 }}
              />
            </div>
          </div>

          <div className="flex justify-between text-[9px] font-mono text-zinc-700">
            <span>R$0</span>
            <span>R$50k</span>
            <span>R$70k</span>
            <span>R$100k+</span>
          </div>
        </div>

        {/* Indicador flutuante */}
        {nextBracket ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-700/60 py-2.5 px-3"
          >
            <span className="text-xs text-zinc-500">Faltam</span>
            <span className="font-mono text-sm font-semibold text-zinc-200">
              {formatCurrency(remaining)}
            </span>
            <span className="text-xs text-zinc-500">para</span>
            <span className="text-xs font-semibold" style={{ color: BRACKET_COLORS[nextBracket.label as keyof typeof BRACKET_COLORS]?.color }}>
              {nextBracket.label} ({(nextBracket.rate * 100).toFixed(1)}%)
            </span>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 py-2.5 px-3"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]" />
            <span className="text-xs font-semibold text-amber-400">Mega Meta atingida — 2,5% em todas as vendas</span>
          </motion.div>
        )}

        {/* Labels dos 3 segmentos */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {COMMISSION_BRACKETS.map((b) => {
            const t = BRACKET_COLORS[b.label as keyof typeof BRACKET_COLORS];
            const isActive = currentBracket.label === b.label;
            return (
              <div
                key={b.label}
                className="rounded-lg border p-2 text-center transition-all duration-200"
                style={{
                  borderColor: isActive ? `${t.color}40` : "rgba(39,39,42,0.8)",
                  backgroundColor: isActive ? t.bg : "rgba(24,24,27,0.3)",
                }}
              >
                <p className="text-[9px] text-zinc-600 uppercase tracking-wide">{b.label}</p>
                <p className="font-mono text-sm font-bold mt-0.5" style={{ color: isActive ? t.color : "#3f3f46" }}>
                  {(b.rate * 100).toFixed(1)}%
                </p>
                <p className="text-[9px] text-zinc-700 mt-0.5 font-mono">
                  {b.max === Infinity ? `>R$70k` : `≤R$${(b.max / 1000).toFixed(0)}k`}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
