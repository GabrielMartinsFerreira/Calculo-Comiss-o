"use client";
import { motion } from "framer-motion";
import { Wallet, Settings2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { BudgetEnvelope, EnvelopeStatus } from "@/lib/finance";

interface BudgetEnvelopesProps {
  envelopes: BudgetEnvelope[];
  onManage: () => void;
}

const statusColor: Record<EnvelopeStatus, { bar: string; text: string; bg: string; border: string }> = {
  safe:    { bar: "#10b981", text: "text-emerald-400", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" },
  warning: { bar: "#f59e0b", text: "text-amber-400",   bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" },
  danger:  { bar: "#ef4444", text: "text-red-400",     bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.25)" },
};

export function BudgetEnvelopes({ envelopes, onManage }: BudgetEnvelopesProps) {
  const totalAllocated = envelopes.reduce((s, e) => s + e.allocated, 0);
  const totalSpent     = envelopes.reduce((s, e) => s + e.spent, 0);
  const overCount      = envelopes.filter((e) => e.isPulsing).length;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Wallet className="h-3 w-3 text-cyan-400" />
            </div>
            <CardTitle className="text-sm text-zinc-100">Orçamento por Categoria</CardTitle>
          </div>
          <Button
            size="sm" variant="ghost"
            className="h-7 gap-1 text-zinc-500 hover:text-cyan-400 text-xs"
            onClick={onManage}
          >
            <Settings2 className="h-3.5 w-3.5" /> Gerir
          </Button>
        </div>
        {envelopes.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-y-1 text-xs border-t border-zinc-800 pt-2">
            <span className="text-zinc-600">
              Alocado: <span className="font-mono font-semibold text-zinc-300">{formatCurrency(totalAllocated)}</span>
            </span>
            <span className="text-zinc-600 shrink-0">
              Gasto: <span className={`font-mono font-semibold ${totalSpent > totalAllocated ? "text-red-400" : "text-cyan-400"}`}>{formatCurrency(totalSpent)}</span>
            </span>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 space-y-3 pt-0">
        {envelopes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-sm text-zinc-600">Nenhum envelope definido para este mês.</p>
            <Button size="sm" variant="neon" onClick={onManage}>
              <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Definir orçamentos
            </Button>
          </div>
        ) : (
          <>
            {overCount > 0 && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/8 px-3 py-2"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 animate-pulse" />
                <p className="text-[11px] text-red-400">
                  {overCount} categoria{overCount > 1 ? "s" : ""} acima do limite.
                </p>
              </motion.div>
            )}

            {envelopes.map((env, i) => {
              const c = statusColor[env.status];
              const width = Math.min(env.percent, 100);
              return (
                <motion.div
                  key={env.category}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-lg border px-3 py-2.5"
                  style={{ borderColor: c.border, backgroundColor: c.bg }}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-medium text-zinc-200">{env.category}</span>
                    <span className={`font-mono text-[11px] font-semibold ${c.text}`}>
                      {env.percent.toFixed(0)}%
                    </span>
                  </div>

                  {/* Barra de progresso dinâmica */}
                  <div className="h-2 w-full rounded-full bg-zinc-800/80 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${env.isPulsing ? "animate-pulse" : ""}`}
                      style={{ backgroundColor: c.bar, boxShadow: `0 0 8px ${c.bar}80` }}
                      initial={{ width: "0%" }}
                      animate={{ width: `${width}%` }}
                      transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 + i * 0.05 }}
                    />
                  </div>

                  <div className="flex items-center justify-between mt-1.5 text-[10px] font-mono">
                    <span className="text-zinc-500">
                      {formatCurrency(env.spent)} <span className="text-zinc-700">/ {formatCurrency(env.allocated)}</span>
                    </span>
                    <span className={env.remaining < 0 ? "text-red-400" : "text-zinc-600"}>
                      {env.remaining < 0
                        ? `${formatCurrency(Math.abs(env.remaining))} acima`
                        : `${formatCurrency(env.remaining)} livre`}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}
      </CardContent>
    </Card>
  );
}
