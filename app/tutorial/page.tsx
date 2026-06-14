"use client";
import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Wallet, CreditCard, Handshake,
  ChevronDown, CheckCircle2, Lightbulb, ArrowRight, Sparkles, FileText,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// ── Conteúdo do tutorial (passo a passo de cada módulo real) ──

interface Step { q: string; a: string[]; }
interface TutorialModule {
  key: string;
  label: string;
  icon: LucideIcon;
  color: string;
  tagline: string;
  intro: string;
  steps: Step[];
  tip: string;
}

const MODULES: TutorialModule[] = [
  {
    key: "comissoes",
    label: "Comissões",
    icon: Target,
    color: "#06b6d4",
    tagline: "Cadastre suas vendas e veja a comissão calculada automaticamente.",
    intro:
      "Cada venda vira uma Ordem de Serviço (OS). Conforme você confirma os pagamentos, o sistema soma o total pago do mês e aplica a faixa de comissão correspondente — sem você precisar calcular nada.",
    steps: [
      {
        q: "Cadastrar uma nova OS",
        a: [
          "Vá em Lançamentos e clique em “Nova OS”.",
          "Preencha número, cliente, data, valor e a forma de pagamento.",
          "Escolha o status: Pendente (ainda não pago) ou Pago.",
          "O mês de competência é definido automaticamente pela data da OS.",
        ],
      },
      {
        q: "Confirmar o pagamento de uma OS",
        a: [
          "Na lista, clique no ✓ verde ao lado de uma OS Pendente.",
          "Ela passa para Pago e entra no cálculo da comissão real do mês.",
        ],
      },
      {
        q: "Entender as faixas (metas)",
        a: [
          "Mini Meta: até R$ 50.000 pagos no mês → 1,5%.",
          "Meta: de R$ 50.000 a R$ 70.000 → 2,0%.",
          "Mega Meta: acima de R$ 70.000 → 2,5%.",
          "A taxa da faixa é aplicada sobre o total inteiro do mês.",
        ],
      },
      {
        q: "Ver o resultado",
        a: [
          "No Dashboard você vê o total previsto, o total pago e a barra de progresso até a próxima meta.",
          "Use o seletor de mês no topo para navegar entre competências.",
        ],
      },
    ],
    tip: "A comissão prevista considera todas as OS; a real, só as pagas. Confirme os pagamentos para ver a comissão real subir.",
  },
  {
    key: "financas",
    label: "Finanças",
    icon: Wallet,
    color: "#10b981",
    tagline: "Controle receitas e despesas do mês e acompanhe sua saúde financeira.",
    intro:
      "No módulo de Finanças você organiza tudo que entra e sai no mês. O sistema calcula o saldo projetado, o realizado e um indicador de saúde para você saber se está no azul.",
    steps: [
      {
        q: "Inicializar o mês",
        a: [
          "Em Finanças, clique em “Inicializar Mês”.",
          "Ele copia suas entradas recorrentes (salário, contas fixas…) do mês anterior, sem duplicar.",
        ],
      },
      {
        q: "Lançar uma receita",
        a: [
          "No painel Receitas, clique em “+ Nova”.",
          "Escolha a categoria, o tipo (Fixo/Variável), o valor e quando recebe.",
          "Marque “recorrente” se ela se repete todo mês.",
        ],
      },
      {
        q: "Lançar uma despesa",
        a: [
          "No painel Despesas, clique em “+ Nova”.",
          "Informe categoria, valor, dia de vencimento e a forma de pagamento.",
        ],
      },
      {
        q: "Marcar como recebido / pago",
        a: [
          "Clique no indicador colorido à esquerda do item.",
          "Receitas alternam Pendente ↔ Recebido.",
          "Despesas giram Pendente → Pago → Aguardando.",
        ],
      },
      {
        q: "Definir orçamento por categoria (envelopes)",
        a: [
          "No card “Orçamento por Categoria”, clique em “Gerir”.",
          "Defina um limite para cada categoria de despesa.",
          "As barras ficam verdes (até 70%), amarelas (71–90%) e vermelhas (acima) conforme você gasta.",
        ],
      },
    ],
    tip: "O card de Saúde Financeira mostra o saldo projetado e quanto sobra da sua receita. O objetivo é manter o indicador no verde.",
  },
  {
    key: "cartoes",
    label: "Cartões",
    icon: CreditCard,
    color: "#f97316",
    tagline: "Cadastre seus cartões e veja a fatura montar sozinha.",
    intro:
      "A fatura não é digitada: ela é a soma das despesas que você marca como sendo daquele cartão. Assim o valor está sempre correto, sem retrabalho.",
    steps: [
      {
        q: "Cadastrar um cartão",
        a: [
          "No card “Cartões de Crédito”, clique em “+ Novo”.",
          "Informe nome, limite, dia de fechamento e dia de vencimento.",
        ],
      },
      {
        q: "Lançar uma compra no cartão",
        a: [
          "Crie uma despesa normalmente (Despesas → “+ Nova”).",
          "Na forma de pagamento, escolha “Cartão de Crédito”.",
          "No campo “Cartão” que aparece, selecione o cartão certo (ex: Nubank).",
        ],
      },
      {
        q: "Acompanhar a fatura",
        a: [
          "O card do cartão mostra o total da fatura, o % do limite usado e a data de vencimento.",
          "Status: Vazia (sem compras), Aberta (com compras pendentes) ou Paga (todas quitadas).",
        ],
      },
    ],
    tip: "Se marcar “Cartão de Crédito” mas não escolher um cartão, a despesa não entra em nenhuma fatura. Sempre selecione o cartão para o valor aparecer no painel.",
  },
  {
    key: "emprestimos",
    label: "Empréstimos",
    icon: Handshake,
    color: "#8b5cf6",
    tagline: "Empreste dinheiro e acompanhe cada parcela que volta.",
    intro:
      "Você registra o empréstimo uma única vez e o sistema cria as parcelas mês a mês automaticamente, mostrando quantas ainda faltam receber.",
    steps: [
      {
        q: "Cadastrar um empréstimo",
        a: [
          "No painel Receitas, clique em “+ Nova” e escolha a categoria “Empréstimo”.",
          "Informe o nome do devedor, o valor da parcela, o número de parcelas e o dia de vencimento.",
          "O total a receber é calculado automaticamente em tempo real.",
        ],
      },
      {
        q: "Receber uma parcela",
        a: [
          "Na entrada laranja do empréstimo, clique no indicador para confirmar o recebimento.",
          "A parcela vira Recebida, o contador diminui e a parcela do próximo mês é criada sozinha.",
        ],
      },
      {
        q: "Acompanhar o progresso",
        a: [
          "A barrinha mostra X de Y parcelas pagas e “Faltam N parcelas”.",
          "Quando a última parcela é recebida, o empréstimo é marcado como Quitado.",
        ],
      },
    ],
    tip: "Cada parcela recebida gera a próxima automaticamente — você nunca precisa recadastrar o empréstimo.",
  },
];

// ── Acordeão de passos (com microanimação de altura) ──

function StepAccordion({ step, color, index, defaultOpen }: { step: Step; color: string; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800/50 bg-zinc-900/30">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-800/30"
      >
        <span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold"
          style={{ color, backgroundColor: `${color}18`, border: `1px solid ${color}40` }}
        >
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium text-zinc-200">{step.q}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-zinc-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ul className="space-y-2 px-4 pb-4 pl-[3.25rem]">
              {step.a.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-zinc-400">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TutorialPage() {
  const [active, setActive] = useState("comissoes");
  const current = MODULES.find((m) => m.key === active) ?? MODULES[0];
  const Icon = current.icon;

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Cabeçalho */}
      <div>
        <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">// tutorial</p>
        <h1 className="text-2xl font-bold text-zinc-100 leading-none">Como usar o sistema</h1>
        <p className="mt-1 text-sm text-zinc-600">Guia rápido de cada módulo, passo a passo</p>
      </div>

      {/* Boas-vindas */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card>
          <CardContent className="flex items-start gap-3 p-5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/10">
              <Sparkles className="h-4 w-4 text-cyan-400" />
            </div>
            <p className="text-[13px] leading-relaxed text-zinc-400">
              Bem-vindo! Escolha um módulo abaixo para ver, em poucos passos, como cadastrar e
              gerir cada parte do sistema. Toque em cada item para expandir as instruções.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Abas dos módulos (grid responsivo — sem scroll horizontal) */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MODULES.map((m) => {
          const TabIcon = m.icon;
          const isActive = active === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setActive(m.key)}
              className="group flex min-w-0 flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all hover:scale-[1.02]"
              style={{
                borderColor: isActive ? `${m.color}60` : "rgba(39,39,42,0.6)",
                backgroundColor: isActive ? `${m.color}12` : "rgba(22,27,38,0.4)",
              }}
            >
              <TabIcon
                className="h-5 w-5 shrink-0 transition-colors"
                style={{ color: isActive ? m.color : "#71717a" }}
              />
              <span className={`max-w-full truncate text-xs font-medium ${isActive ? "text-zinc-100" : "text-zinc-500 group-hover:text-zinc-300"}`}>
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Conteúdo do módulo ativo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardContent className="space-y-5 p-6">
              {/* Cabeçalho do módulo */}
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border"
                  style={{ borderColor: `${current.color}30`, backgroundColor: `${current.color}12` }}
                >
                  <Icon className="h-6 w-6" style={{ color: current.color }} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-zinc-100">{current.label}</h2>
                  <p className="text-sm text-zinc-500">{current.tagline}</p>
                </div>
              </div>

              <p className="text-[13px] leading-relaxed text-zinc-400">{current.intro}</p>

              {/* Passos em acordeão */}
              <div className="space-y-2">
                {current.steps.map((step, i) => (
                  <StepAccordion key={step.q} step={step} color={current.color} index={i} defaultOpen={i === 0} />
                ))}
              </div>

              {/* Dica */}
              <div
                className="flex items-start gap-3 rounded-lg border px-4 py-3"
                style={{ borderColor: `${current.color}25`, backgroundColor: `${current.color}0a` }}
              >
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" style={{ color: current.color }} />
                <p className="text-[13px] leading-relaxed text-zinc-400">
                  <span className="font-semibold" style={{ color: current.color }}>Dica: </span>
                  {current.tip}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Pronto para começar — cards com fade-in ao rolar + hover */}
      <div className="pt-2">
        <p className="mb-3 text-[11px] font-mono uppercase tracking-widest text-zinc-600">// pronto para começar?</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { href: "/lancamentos", label: "Cadastrar uma OS", desc: "Lance sua primeira venda e gere comissão", icon: FileText, color: "#06b6d4" },
            { href: "/financas", label: "Organizar finanças", desc: "Receitas, despesas, cartões e empréstimos", icon: Wallet, color: "#10b981" },
          ].map((cta, i) => {
            const CtaIcon = cta.icon;
            return (
              <motion.div
                key={cta.href}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              >
                <Link href={cta.href}>
                  <div
                    className="group flex items-center gap-3 rounded-xl border border-zinc-800/60 bg-[rgba(22,27,38,0.8)] p-4 backdrop-blur-sm transition-all hover:scale-[1.01] hover:border-zinc-700"
                    style={{ borderColor: "rgba(39,39,42,0.6)" }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                      style={{ borderColor: `${cta.color}30`, backgroundColor: `${cta.color}12` }}
                    >
                      <CtaIcon className="h-5 w-5" style={{ color: cta.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-100">{cta.label}</p>
                      <p className="text-[12px] text-zinc-500 truncate">{cta.desc}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-zinc-600 transition-all group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
