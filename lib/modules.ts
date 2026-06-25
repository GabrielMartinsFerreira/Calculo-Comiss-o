import { LayoutDashboard, FileText, BarChart2, Wallet, Settings2, BookOpen, Repeat2, type LucideIcon } from "lucide-react";

/**
 * Definição central dos módulos de navegação. Fonte única para a Sidebar,
 * o BottomNav e a página de Configurações de Módulos.
 *
 * `toggleable = false` → módulo sempre visível (não pode ser ocultado).
 */
export interface ModuleDef {
  key: string;
  href: string;
  label: string;
  icon: LucideIcon;
  toggleable: boolean;
  description?: string;
}

export const MODULES: ModuleDef[] = [
  { key: "dashboard",     href: "/",              label: "Dashboard",     icon: LayoutDashboard, toggleable: true,  description: "Visão geral de comissões e metas" },
  { key: "lancamentos",   href: "/lancamentos",   label: "Lançamentos",   icon: FileText,        toggleable: true,  description: "Ordens de serviço e comissões" },
  { key: "relatorios",    href: "/relatorios",    label: "Relatórios",    icon: BarChart2,       toggleable: true,  description: "Gráficos e histórico mensal" },
  { key: "financas",      href: "/financas",      label: "Finanças",      icon: Wallet,          toggleable: true,  description: "Gestão financeira pessoal" },
  { key: "assinaturas",   href: "/assinaturas",   label: "Assinaturas",   icon: Repeat2,         toggleable: true,  description: "Serviços recorrentes e débitos automáticos" },
  { key: "tutorial",      href: "/tutorial",      label: "Tutorial",      icon: BookOpen,        toggleable: true,  description: "Guia de uso de cada módulo" },
  { key: "configuracoes", href: "/configuracoes", label: "Configurações", icon: Settings2,       toggleable: false, description: "Preferências da conta" },
];

export const TOGGLEABLE_MODULES = MODULES.filter((m) => m.toggleable);

export type ModulePrefs = Record<string, boolean>;

/** Preferência padrão: todos os módulos ativáveis começam visíveis. */
export function defaultModulePrefs(): ModulePrefs {
  const prefs: ModulePrefs = {};
  for (const m of TOGGLEABLE_MODULES) prefs[m.key] = true;
  return prefs;
}

// ── Flags de comportamento (geridas em /configuracoes) ────────

export interface FeatureDef {
  key: string;
  label: string;
  description: string;
  defaultOn: boolean;
}

/** Comissão automática: lança/atualiza a "Comissão do Mês" nas receitas. */
export const FEATURE_AUTO_COMMISSION = "auto_commission";

export const FEATURES: FeatureDef[] = [
  {
    key: FEATURE_AUTO_COMMISSION,
    label: "Comissão automática nas receitas",
    description:
      "Lança e atualiza a “Comissão do Mês” nas receitas a partir das OS pagas. Se desativar, a comissão existente permanece (e pode ser apagada) e não volta até reativar.",
    defaultOn: true,
  },
];
