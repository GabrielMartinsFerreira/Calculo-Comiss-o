"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Sparkles, ShieldCheck, ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describeSubscription, isSubscriptionActive } from "@/lib/subscription";
import { getMySubscription } from "@/lib/subscription-db";
import { formatDate } from "@/lib/utils";
import { toast } from "@/lib/use-toast";
import type { Subscription } from "@/lib/types";

const PLAN_FEATURES = [
  "Controle ilimitado de Ordens de Serviço e comissões",
  "Gestão financeira pessoal completa (receitas, despesas, empréstimos)",
  "Cartões de crédito com faturas consolidadas",
  "Orçamentos por categoria (envelopes)",
  "Conciliação bancária via importação OFX",
  "App Android (APK) + PWA instalável",
];

export default function CheckoutPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMySubscription().then((s) => { setSub(s); setLoading(false); });
  }, []);

  const active = isSubscriptionActive(sub);
  // "Gerir cobrança" só vale para quem JÁ tem assinatura paga na Stripe.
  // No trial (sem subscription na Stripe) o botão certo é "Assinar agora".
  const hasPaidSub = !!sub?.stripe_subscription_id;
  const [redirecting, setRedirecting] = useState(false);

  // Cria a Checkout Session no backend e redireciona para a página da Stripe.
  async function handleSubscribe() {
    setRedirecting(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Falha ao iniciar o checkout");
      window.location.href = data.url as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao iniciar o checkout";
      toast({ title: "Erro no checkout", description: msg, variant: "destructive" });
      setRedirecting(false);
    }
  }

  // Abre o Customer Portal (gerir/cancelar) quando já há assinatura.
  async function handleManage() {
    setRedirecting(true);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Falha ao abrir o portal");
      window.location.href = data.url as string;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao abrir o portal";
      toast({ title: "Erro", description: msg, variant: "destructive" });
      setRedirecting(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center animate-slide-in">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg rounded-2xl border border-zinc-800/60 bg-[rgba(22,27,38,0.8)] backdrop-blur-sm p-8"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest">// assinatura</p>
            <h1 className="text-xl font-bold text-zinc-100 leading-none">GG Tech Pro</h1>
          </div>
        </div>

        {/* Estado atual */}
        {!loading && (
          <div
            className="mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
            style={{
              borderColor: active ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)",
              backgroundColor: active ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)",
            }}
          >
            <ShieldCheck className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : "text-red-400"}`} />
            <span className={active ? "text-emerald-400" : "text-red-400"}>
              {describeSubscription(sub)}
              {sub?.current_period_end && (
                <span className="text-zinc-500"> · até {formatDate(sub.current_period_end.slice(0, 10))}</span>
              )}
            </span>
          </div>
        )}

        <ul className="mt-5 space-y-2">
          {PLAN_FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
              <Zap className="h-3.5 w-3.5 text-cyan-400 mt-0.5 shrink-0" />
              {f}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={hasPaidSub ? handleManage : handleSubscribe} disabled={redirecting} className="w-full">
            {redirecting ? "Redirecionando..." : hasPaidSub ? "Gerir cobrança" : "Assinar agora"}
          </Button>
          {active && (
            <Button asChild variant="neon" className="w-full">
              <Link href="/"><ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar ao Dashboard</Link>
            </Button>
          )}
        </div>

        <p className="mt-4 text-center text-[10px] text-zinc-600 font-mono">
          Pagamento processado com segurança via Stripe.
        </p>
      </motion.div>
    </div>
  );
}
