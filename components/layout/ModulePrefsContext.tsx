"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { MODULES, defaultModulePrefs, type ModulePrefs } from "@/lib/modules";

type FeatureFlags = Record<string, boolean>;

interface ModulePrefsValue {
  prefs: ModulePrefs;
  ready: boolean;
  toggle: (moduleKey: string) => void;
  isEnabled: (moduleKey: string) => boolean;
  // Flags de comportamento (ex.: comissão automática) — também por dispositivo/utilizador
  isFeatureOn: (key: string, defaultOn?: boolean) => boolean;
  toggleFeature: (key: string, defaultOn?: boolean) => void;
}

const ModulePrefsContext = createContext<ModulePrefsValue | null>(null);

/**
 * Guarda preferências de UI/comportamento em localStorage, por utilizador:
 *  - módulos visíveis no menu (`module_prefs_<userId>`)
 *  - flags de comportamento (`feature_prefs_<userId>`)
 * São preferências do dispositivo (não dado de negócio) — evitam flicker e
 * round-trip ao banco a cada navegação.
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
  const moduleKey  = `module_prefs_${userId ?? "anon"}`;
  const featureKey = `feature_prefs_${userId ?? "anon"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(moduleKey);
      setPrefs(raw ? { ...defaultModulePrefs(), ...JSON.parse(raw) } : defaultModulePrefs());
    } catch {
      setPrefs(defaultModulePrefs());
    }
    try {
      const raw = localStorage.getItem(featureKey);
      setFeatures(raw ? JSON.parse(raw) : {});
    } catch {
      setFeatures({});
    }
    setReady(true);
  }, [moduleKey, featureKey]);

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
      try { localStorage.setItem(featureKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [featureKey]);

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
