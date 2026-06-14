import { supabase } from "./supabase";

// Preferências por conta (sincronizadas entre aparelhos), guardadas em JSONB
// na tabela user_preferences. `features` são as flags de comportamento.

export interface UserPreferences {
  features?: Record<string, boolean>;
}

/** Lê as preferências do utilizador autenticado (RLS garante que só vê as suas). */
export async function getUserPreferences(): Promise<UserPreferences> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("preferences")
    .maybeSingle();
  if (error || !data) return {};
  return (data.preferences ?? {}) as UserPreferences;
}

/** Grava (upsert) as preferências. O trigger set_user_id preenche o user_id. */
export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  const { error } = await supabase
    .from("user_preferences")
    .upsert({ preferences: prefs }, { onConflict: "user_id" });
  if (error) throw error;
}
