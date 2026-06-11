"use client";
import { useState } from "react";
import { Pencil, Trash2, CheckCircle2, Search, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import { deleteOrder, confirmPayment } from "@/lib/supabase";
import { toast } from "@/lib/use-toast";
import type { ServiceOrder } from "@/lib/types";

interface OSTableProps {
  orders: ServiceOrder[];
  onEdit: (order: ServiceOrder) => void;
  onRefresh: () => void;
}

type SortKey = "order_date" | "os_number" | "client_name" | "order_value" | "status";

const methodStyle: Record<string, string> = {
  Pix:    "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  Boleto: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  Cartão: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const colLabel: Record<SortKey, string> = {
  order_date: "Data", os_number: "OS", client_name: "Cliente", order_value: "Valor", status: "Status",
};

export function OSTable({ orders, onEdit, onRefresh }: OSTableProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("order_date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = orders.filter((o) => {
    const q = search.toLowerCase();
    return o.os_number.toLowerCase().includes(q) || o.client_name.toLowerCase().includes(q) || o.status.toLowerCase().includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    const av: string | number = sortKey === "order_value" ? Number(a[sortKey]) : a[sortKey];
    const bv: string | number = sortKey === "order_value" ? Number(b[sortKey]) : b[sortKey];
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function handleDelete(id: string) {
    try {
      await deleteOrder(id);
      toast({ title: "OS excluída.", variant: "success" });
      onRefresh();
    } catch {
      toast({ title: "Erro ao excluir OS.", variant: "destructive" });
    }
  }

  async function handleConfirm(id: string) {
    try {
      await confirmPayment(id);
      toast({ title: "Pagamento confirmado!", variant: "success" });
      onRefresh();
    } catch {
      toast({ title: "Erro ao confirmar pagamento.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
        <Input
          placeholder="Buscar por OS, cliente..."
          className="pl-9 h-8 text-xs"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="rounded-xl border border-zinc-800/60 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-900/50">
              {(["order_date", "os_number", "client_name", "order_value", "status"] as SortKey[]).map((col) => (
                <th key={col} className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort(col)}
                    className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-600 hover:text-zinc-300 transition-colors"
                  >
                    {colLabel[col]}
                    {sortKey === col
                      ? sortDir === "asc"
                        ? <ChevronUp className="h-3 w-3 text-cyan-400" />
                        : <ChevronDown className="h-3 w-3 text-cyan-400" />
                      : <ChevronUp className="h-3 w-3 opacity-20" />}
                  </button>
                </th>
              ))}
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Método</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-zinc-600">Ações</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-zinc-600">
                  Nenhuma OS encontrada.
                </td>
              </tr>
            ) : (
              paginated.map((order, i) => (
                <tr
                  key={order.id}
                  className="group border-b border-zinc-800/30 transition-all duration-150 hover:bg-zinc-800/30 hover:border-zinc-700/40"
                  style={{ backgroundColor: i % 2 === 0 ? "transparent" : "rgba(24,24,27,0.2)" }}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500 font-mono">{formatDate(order.order_date)}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-cyan-400">{order.os_number}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300">{order.client_name}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="font-mono text-sm font-semibold text-zinc-100">{formatCurrency(order.order_value)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={order.status === "Pago" ? "success" : "warning"} pulse={order.status === "Pendente"}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${methodStyle[order.payment_method] ?? ""}`}>
                      {order.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {order.status === "Pendente" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Confirmar pagamento"
                          onClick={() => handleConfirm(order.id)}
                          className="h-7 w-7 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Editar"
                        onClick={() => onEdit(order)}
                        className="h-7 w-7 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Excluir"
                            className="h-7 w-7 text-zinc-600 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-zinc-900 border-zinc-800">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-zinc-100">Excluir {order.os_number}?</AlertDialogTitle>
                            <AlertDialogDescription className="text-zinc-500">
                              Esta ação não pode ser desfeita. A OS de {formatCurrency(order.order_value)} para {order.client_name} será removida permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                              onClick={() => handleDelete(order.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-600">
        <span className="font-mono">{filtered.length} registro(s)</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </Button>
          <span className="font-mono px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Próxima
          </Button>
        </div>
      </div>
    </div>
  );
}
