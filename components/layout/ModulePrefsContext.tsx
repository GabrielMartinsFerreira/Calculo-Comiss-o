"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { MODULES, defaultModulePrefs, type ModulePrefs } from "@/lib/modules";

interface ModulePrefsValue {
  prefs: ModulePrefs;
  ready: boolean;
  toggle: (moduleKey: string) => void;
  isEnabled: (moduleKey: string) => boolean;
}

const ModulePrefsContext = createContext<ModulePrefsValue | null>(null);

/**
 * Guarda a preferência de módulos visíveis em localStorage, por utilizador.
 * É uma preferência de UI (não dado de negócio) — fica no dispositivo, o que
 * evita flicker e um round-trip ao banco a cada navegação.
 */
export function ModulePrefsProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const [prefs, setPrefs] = useState<ModulePrefs>(defaultModulePrefs());
  const [ready, setReady] = useState(false);
  const storageKey = `module_prefs_${userId ?? "anon"}`;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setPrefs(raw ? { ...defaultModulePrefs(), ...JSON.parse(raw) } : defaultModulePrefs());
    } catch {
      setPrefs(defaultModulePrefs());
    }
    setReady(true);
  }, [storageKey]);

  const toggle = useCallback((moduleKey: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [moduleKey]: prev[moduleKey] === false }; // inverte
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  }, [storageKey]);

  const isEnabled = useCallback((moduleKey: string) => {
    const mod = MODULES.find((m) => m.key === moduleKey);
    if (mod && !mod.toggleable) return true; // sempre visível
    return prefs[moduleKey] !== false;
  }, [prefs]);

  return (
    <ModulePrefsContext.Provider value={{ prefs, ready, toggle, isEnabled }}>
      {children}
    </ModulePrefsContext.Provider>
  );
}

export function useModulePrefs() {
  const ctx = useContext(ModulePrefsContext);
  if (!ctx) throw new Error("useModulePrefs precisa estar dentro de <ModulePrefsProvider>");
  return ctx;
}
