"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { MODULES, defaultModulePrefs, type ModulePrefs } from "@/lib/modules";
import { getUserPreferences, saveUserPreferences } from "@/lib/preferences-db";

type FeatureFlags = Record<string, boolean>;

interface ModulePrefsValue {
  prefs: ModulePrefs;
  ready: boolean; // true após carregar as flags de comportamento do banco
  toggle: (moduleKey: string) => void;
  isEnabled: (moduleKey: string) => boolean;
  isFeatureOn: (key: string, defaultOn?: boolean) => boolean;
  toggleFeature: (key: string, defaultOn?: boolean) => void;
}

const ModulePrefsContext = createContext<ModulePrefsValue | null>(null);

/**
 * Duas naturezas de preferência:
 *  - **Módulos visíveis**: preferência de LAYOUT → fica no dispositivo (`localStorage`),
 *    instantânea e sem round-trip.
 *  - **Flags de comportamento** (ex.: comissão automática): preferência de CONTA →
 *    fica no banco (`user_preferences`) e **sincroniza entre aparelhos**.
 */
export function ModulePrefsProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = useState<ModulePrefs>(defaultModulePrefs());
  const [features, setFeatures] = useState<FeatureFlags>({});
  const [ready, setReady] = useState(false);
  const moduleKey = `module_prefs_${userId ?? "anon"}`;

  // Módulos: localStorage (instantâneo, por dispositivo)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(moduleKey);
      setPrefs(raw ? { ...defaultModulePrefs(), ...JSON.parse(raw) } : defaultModulePrefs());
    } catch {
      setPrefs(defaultModulePrefs());
    }
  }, [moduleKey]);

  // Flags de comportamento: banco (sincroniza entre aparelhos)
  useEffect(() => {
    let active = true;
    setReady(false);
    getUserPreferences()
      .then((p) => { if (active) setFeatures(p.features ?? {}); })
      .catch(() => { if (active) setFeatures({}); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [userId]);

  const toggle = useCallback((key: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: prev[key] === false }; // inverte
      try { localStorage.setItem(moduleKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [moduleKey]);

  const isEnabled = useCallback((key: string) => {
    const mod = MODULES.find((m) => m.key === key);
    if (mod && !mod.toggleable) return true; // sempre visível
    return prefs[key] !== false;
  }, [prefs]);

  const isFeatureOn = useCallback((key: string, defaultOn = true) => {
    const v = features[key];
    return v === undefined ? defaultOn : v;
  }, [features]);

  const toggleFeature = useCallback((key: string, defaultOn = true) => {
    setFeatures((prev) => {
      const current = prev[key] === undefined ? defaultOn : prev[key];
      const next = { ...prev, [key]: !current };
      // Persiste na conta (otimista: a UI já reflete; o banco recebe em seguida)
      saveUserPreferences({ features: next }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ModulePrefsContext.Provider value={{ prefs, ready, toggle, isEnabled, isFeatureOn, toggleFeature }}>
      {children}
    </ModulePrefsContext.Provider>
  );
}

export function useModulePrefs() {
  const ctx = useContext(ModulePrefsContext);
  if (!ctx) throw new Error("useModulePrefs precisa estar dentro de <ModulePrefsProvider>");
  return ctx;
}
