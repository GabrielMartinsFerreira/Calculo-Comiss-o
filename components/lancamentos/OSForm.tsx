"use client";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createOrder, updateOrder } from "@/lib/supabase";
import { getCompetencia } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import type { ServiceOrder, PaymentMethod, OrderStatus } from "@/lib/types";

interface OSFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order?: ServiceOrder | null;
  onSuccess: () => void;
}

const emptyForm = {
  os_number: "",
  client_name: "",
  order_date: format(new Date(), "yyyy-MM-dd"),
  order_value: "",
  payment_method: "" as PaymentMethod | "",
  status: "Pendente" as OrderStatus,
};

export function OSForm({ open, onOpenChange, order, onSuccess }: OSFormProps) {
  const [form, setForm] = useState(() =>
    order
      ? { os_number: order.os_number, client_name: order.client_name, order_date: order.order_date, order_value: order.order_value.toString(), payment_method: order.payment_method, status: order.status }
      : emptyForm
  );
  const [loading, setLoading] = useState(false);
  const isEditing = !!order;

  // Reinicializa o formulário sempre que o diálogo abre ou o alvo de edição muda.
  // Necessário porque o componente é montado uma vez fora do DialogContent.
  useEffect(() => {
    if (!open) return;
    setForm(
      order
        ? {
            os_number: order.os_number,
            client_name: order.client_name,
            order_date: order.order_date,
            order_value: order.order_value.toString(),
            payment_method: order.payment_method,
            status: order.status,
          }
        : { ...emptyForm, order_date: format(new Date(), "yyyy-MM-dd") }
    );
  }, [open, order?.id]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.payment_method) return;
    const value = parseFloat(form.order_value.replace(",", "."));
    if (isNaN(value) || value <= 0) {
      toast({ title: "Valor inválido", description: "Informe um valor maior que zero.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload = {
        os_number: form.os_number.trim(),
        client_name: form.client_name.trim(),
        order_date: form.order_date,
        order_value: value,
        payment_method: form.payment_method as PaymentMethod,
        status: form.status,
        competencia: getCompetencia(form.order_date),
      };
      if (isEditing) {
        await updateOrder(order.id, payload);
        toast({ title: "OS atualizada!", variant: "success" });
      } else {
        await createOrder(payload);
        toast({ title: "OS cadastrada!", variant: "success" });
        setForm(emptyForm);
      }
      onSuccess();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message
        : typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : JSON.stringify(err);
      toast({ title: "Erro ao salvar OS", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">
            {isEditing ? "Editar OS" : "Nova Ordem de Serviço"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Número da OS</Label>
              <Input placeholder="OS3994" value={form.os_number} onChange={(e) => set("os_number", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Data</Label>
              <Input type="date" value={form.order_date} onChange={(e) => set("order_date", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Nome do Cliente</Label>
            <Input placeholder="Nome do cliente" value={form.client_name} onChange={(e) => set("client_name", e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Valor (R$)</Label>
              <Input placeholder="0,00" value={form.order_value} onChange={(e) => set("order_value", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Método de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={(v) => set("payment_method", v as PaymentMethod)}>
                <SelectTrigger className="bg-zinc-900 border-zinc-700">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-700">
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Status</Label>
            <Select value={form.status} onValueChange={(v) => set("status", v as OrderStatus)}>
              <SelectTrigger className="bg-zinc-900 border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-700">
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : isEditing ? "Salvar" : "Cadastrar OS"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
