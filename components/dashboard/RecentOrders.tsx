"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ServiceOrder } from "@/lib/types";

interface RecentOrdersProps {
  orders: ServiceOrder[];
}

const methodBadge: Record<string, string> = {
  Pix:    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  Boleto: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Cartão: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

export function RecentOrders({ orders }: RecentOrdersProps) {
  const recent = orders.slice(0, 5);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm">Últimas OS</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/lancamentos" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-cyan-400">
            Ver todas <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">Nenhuma OS lançada neste mês.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 px-3 py-2.5 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-800/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold font-mono text-zinc-200">{order.os_number}</p>
                  <p className="truncate text-[11px] text-zinc-600">{order.client_name} · {formatDate(order.order_date)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={`hidden sm:inline rounded border px-1.5 py-0.5 text-[10px] font-medium ${methodBadge[order.payment_method] ?? ""}`}>
                    {order.payment_method}
                  </span>
                  <Badge variant={order.status === "Pago" ? "success" : "warning"} pulse={order.status === "Pendente"}>
                    {order.status}
                  </Badge>
                  <span className="font-mono text-xs font-semibold text-zinc-200">{formatCurrency(order.order_value)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
