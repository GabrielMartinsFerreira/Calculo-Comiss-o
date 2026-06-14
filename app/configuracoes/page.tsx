"use client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TOGGLEABLE_MODULES, FEATURES } from "@/lib/modules";
import { useModulePrefs } from "@/components/layout/ModulePrefsContext";

export default function ConfiguracoesPage() {
  const { isEnabled, toggle, ready, isFeatureOn, toggleFeature } = useModulePrefs();
  const enabledCount = TOGGLEABLE_MODULES.filter((m) => isEnabled(m.key)).length;

  return (
    <div className="space-y-6 animate-slide-in">
      <div>
        <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest mb-1">// configurações</p>
        <h1 className="text-2xl font-bold text-zinc-100 leading-none">Configurações de Módulos</h1>
        <p className="mt-1 text-sm text-zinc-600">Escolha quais módulos aparecem no menu de navegação</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm text-zinc-100">Módulos do menu</CardTitle>
            <span className="text-[11px] font-mono text-zinc-600">
              {enabledCount}/{TOGGLEABLE_MODULES.length} ativos
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {TOGGLEABLE_MODULES.map((m, i) => {
            const on = isEnabled(m.key);
            const Icon = m.icon;
            return (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-3 transition-colors hover:border-zinc-700/60"
              >
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${on ? "border-cyan-500/30 bg-cyan-500/10" : "border-zinc-800 bg-zinc-900"}`}>
                  <Icon className={`h-4 w-4 ${on ? "text-cyan-400" : "text-zinc-600"}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${on ? "text-zinc-200" : "text-zinc-500"}`}>{m.label}</p>
                  {m.description && <p className="text-[11px] text-zinc-600 truncate">{m.description}</p>}
                </div>

                {/* Switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? "Ocultar" : "Mostrar"} ${m.label}`}
                  onClick={() => toggle(m.key)}
                  disabled={!ready}
                  className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${on ? "border-cyan-400 bg-cyan-500/90" : "border-zinc-700 bg-zinc-800"}`}
                >
                  <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-1"}`} />
                </button>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      {/* Comportamento */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-zinc-100">Comportamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {FEATURES.map((f, i) => {
            const on = isFeatureOn(f.key, f.defaultOn);
            return (
              <motion.div
                key={f.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-lg border border-zinc-800/50 bg-zinc-900/30 px-3 py-3 transition-colors hover:border-zinc-700/60"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${on ? "text-zinc-200" : "text-zinc-500"}`}>{f.label}</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">{f.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? "Desativar" : "Ativar"} ${f.label}`}
                  onClick={() => toggleFeature(f.key, f.defaultOn)}
                  disabled={!ready}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${on ? "border-cyan-400 bg-cyan-500/90" : "border-zinc-700 bg-zinc-800"}`}
                >
                  <span className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-1"}`} />
                </button>
              </motion.div>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-[11px] text-zinc-700 font-mono">
        // Dashboard e Configurações ficam sempre visíveis. As preferências são guardadas neste dispositivo.
      </p>
    </div>
  );
}
