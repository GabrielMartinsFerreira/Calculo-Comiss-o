"use client";
import { DollarSign, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { calculateCommission } from "@/lib/commission";

interface KPICardsProps {
  totalPrevisto: number;
  totalPago: number;
  countPendente: number;
  countPago: number;
}

interface KPICardProps {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  accentColor: string;
  glowColor: string;
  borderColor: string;
}

function KPICard({ title, value, sub, icon: Icon, accentColor, glowColor, borderColor }: KPICardProps) {
  return (
    <div
      className="relative rounded-xl border bg-[rgba(22,27,38,0.8)] backdrop-blur-sm p-5 overflow-hidden transition-all duration-300 hover:scale-[1.01] group"
      style={{ borderColor }}
    >
      {/* Background glow */}
      <div
        className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
        style={{ backgroundColor: glowColor }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{title}</p>
          <p
            className="mt-2 font-mono text-xl sm:text-2xl font-semibold leading-none tracking-tight"
            style={{ color: accentColor }}
          >
            {value}
          </p>
          <p className="mt-2 text-xs text-zinc-600">{sub}</p>
        </div>
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
          style={{ backgroundColor: `${glowColor}18`, borderColor: `${glowColor}40` }}
        >
          <Icon className="h-4 w-4" style={{ color: accentColor }} />
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 rounded-b-xl"
        style={{ backgroundColor: accentColor }}
      />
    </div>
  );
}

export function KPICards({ totalPrevisto, totalPago, countPendente, countPago }: KPICardsProps) {
  const comissaoPrevista = calculateCommission(totalPrevisto);
  const comissaoReal = calculateCommission(totalPago);

  const cards: KPICardProps[] = [
    {
      title: "Previsão Total",
      value: formatCurrency(totalPrevisto),
      sub: `${formatCurrency(comissaoPrevista)} de comissão prevista`,
      icon: DollarSign,
      accentColor: "#06b6d4",
      glowColor: "#06b6d4",
      borderColor: "rgba(6,182,212,0.2)",
    },
    {
      title: "Total Confirmado",
      value: formatCurrency(totalPago),
      sub: `${formatCurrency(comissaoReal)} de comissão real`,
      icon: TrendingUp,
      accentColor: "#10b981",
      glowColor: "#10b981",
      borderColor: "rgba(16,185,129,0.2)",
    },
    {
      title: "OS Pendentes",
      value: countPendente.toString(),
      sub: "aguardando confirmação",
      icon: Clock,
      accentColor: "#8b5cf6",
      glowColor: "#8b5cf6",
      borderColor: "rgba(139,92,246,0.2)",
    },
    {
      title: "OS Pagas",
      value: countPago.toString(),
      sub: "confirmadas no mês",
      icon: CheckCircle2,
      accentColor: "#10b981",
      glowColor: "#10b981",
      borderColor: "rgba(16,185,129,0.2)",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-slide-in">
      {cards.map((card) => (
        <KPICard key={card.title} {...card} />
      ))}
    </div>
  );
}
