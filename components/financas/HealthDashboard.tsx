"use client";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Wallet, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { MonthlyFinanceSummary } from "@/lib/finance";

interface HealthDashboardProps {
  summary: MonthlyFinanceSummary;
  variableExpenseLimit: number | null;
}

const healthConfig = {
  green:  { label: "Saudável",  color: "#10b981", bg: "rgba(16,185,129,0.1)",  border: "rgba(16,185,129,0.3)", glow: "rgba(16,185,129,0.2)" },
  yellow: { label: "Atenção",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  border: "rgba(245,158,11,0.3)", glow: "rgba(245,158,11,0.2)" },
  red:    { label: "Crítico",   color: "#ef4444", bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",  glow: "rgba(239,68,68,0.2)" },
};

export function HealthDashboard({ summary, variableExpenseLimit }: HealthDashboardProps) {
  const h = healthConfig[summary.healthStatus];
  const overBudget = variableExpenseLimit !== null && summary.totalExpenseVariable > variableExpenseLimit;
  const budgetUsed = variableExpenseLimit ? Math.min((summary.totalExpenseVariable / variableExpenseLimit) * 100, 100) : 0;

  const cards = [
    {
      label: "Total Receitas",
      value: formatCurrency(summary.totalIncome),
      sub: `${formatCurrency(summary.totalIncomeReceived)} recebido`,
      icon: TrendingUp,
      color: "#10b981",
      border: "rgba(16,185,129,0.2)",
    },
    {
      label: "Total Despesas",
      value: formatCurrency(summary.totalExpense),
      sub: `${formatCurrency(summary.totalExpensePaid)} pago`,
      icon: TrendingDown,
      color: "#8b5cf6",
      border: "rgba(139,92,246,0.2)",
    },
    {
      label: "Saldo Projetado",
      value: formatCurrency(summary.projectedBalance),
      sub: `Realizado: ${formatCurrency(summary.realizedBalance)}`,
      icon: Wallet,
      color: summary.projectedBalance >= 0 ? "#06b6d4" : "#ef4444",
      border: summary.projectedBalance >= 0 ? "rgba(6,182,212,0.2)" : "rgba(239,68,68,0.2)",
    },
    {
      label: "Saúde Financeira",
      value: h.label,
      sub: `${summary.healthPercent.toFixed(0)}% da receita de sobra`,
      icon: Activity,
      color: h.color,
      border: h.border,
      isHealth: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-xl border bg-[rgba(22,27,38,0.8)] backdrop-blur-sm p-5 transition-all hover:scale-[1.01]"
              style={{ borderColor: card.border }}
            >
              <div className="absolute -top-8 -right-8 h-20 w-20 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" style={{ backgroundColor: card.color }} />
              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{card.label}</p>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border shrink-0"
                    style={{ borderColor: `${card.color}40`, backgroundColor: `${card.color}12` }}>
                    <Icon className="h-3.5 w-3.5" style={{ color: card.color }} />
                  </div>
                </div>
                <p className="mt-3 font-mono text-xl font-bold leading-none" style={{ color: card.color }}>{card.value}</p>
                <p className="mt-1.5 text-[11px] text-zinc-600">{card.sub}</p>
              </div>
              {card.isHealth && (
                <div className="mt-3 h-1 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: card.color }}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.max(0, Math.min(summary.healthPercent, 100))}%` }}
                    transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1], delay: 0.4 }}
                  />
                </div>
              )}
              <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 rounded-b-xl" style={{ backgroundColor: card.color }} />
            </motion.div>
          );
        })}
      </div>

      {/* Budget alert */}
      {variableExpenseLimit !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex items-center justify-between gap-4 rounded-xl border px-4 py-3"
          style={{
            borderColor: overBudget ? "rgba(239,68,68,0.4)" : "rgba(245,158,11,0.25)",
            backgroundColor: overBudget ? "rgba(239,68,68,0.06)" : "rgba(245,158,11,0.05)",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className={`h-2 w-2 rounded-full shrink-0 ${overBudget ? "bg-red-400 animate-ping" : "bg-amber-400 animate-pulse"}`} />
            <p className="text-xs text-zinc-400">
              {overBudget
                ? <><span className="font-semibold text-red-400">Limite excedido!</span> Despesas variáveis ultrapassaram {formatCurrency(variableExpenseLimit)}</>
                : <>Orçamento variável: <span className="font-mono font-semibold text-amber-400">{formatCurrency(summary.totalExpenseVariable)}</span> de {formatCurrency(variableExpenseLimit)}</>
              }
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-28 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${budgetUsed}%`, backgroundColor: overBudget ? "#ef4444" : "#f59e0b" }}
              />
            </div>
            <span className="font-mono text-xs" style={{ color: overBudget ? "#ef4444" : "#f59e0b" }}>
              {budgetUsed.toFixed(0)}%
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
