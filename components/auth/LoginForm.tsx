"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, signUp } from "@/lib/supabase";
import { toast } from "@/lib/use-toast";
import { TurnstileWidget, TURNSTILE_ENABLED } from "./TurnstileWidget";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot — humano nunca preenche
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (website) return; // bot preencheu o campo-armadilha — descarta silenciosamente
    if (!email.trim() || !password) return;
    if (isSignup && !fullName.trim()) {
      toast({ title: "Informe o seu nome completo", variant: "destructive" });
      return;
    }
    if (TURNSTILE_ENABLED && !captchaToken) {
      toast({ title: "Complete a verificação anti-bot", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isSignup) {
        const { needsConfirmation } = await signUp(email.trim(), password, fullName.trim(), rememberMe, captchaToken ?? undefined);
        if (needsConfirmation) {
          toast({
            title: "Conta criada!",
            description: "Verifique o seu e-mail para confirmar o cadastro antes de entrar.",
            variant: "success",
          });
          setMode("signin");
          setPassword("");
        } else {
          router.push("/");
          router.refresh();
        }
      } else {
        await signIn(email.trim(), password, rememberMe, captchaToken ?? undefined);
        router.push("/");
        router.refresh();
      }
    } catch (err: unknown) {
      const fallback = isSignup ? "Não foi possível criar a conta" : "Credenciais inválidas";
      const msg = err instanceof Error ? err.message : fallback;
      toast({ title: isSignup ? "Falha no cadastro" : "Falha no login", description: msg, variant: "destructive" });
      // Token do Turnstile é de uso único — remonta o widget para gerar outro.
      setCaptchaToken(null);
      setTurnstileResetKey((k) => k + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-md"
    >
      {/* Logo */}
      <div className="mb-8 flex flex-col items-center gap-4">
        <Image
          src="/logo.png"
          alt="GG Tech - Controle Financeiro"
          width={260}
          height={80}
          className="object-contain"
          priority
        />
        <div className="text-center">
          <p className="text-[11px] font-mono text-cyan-500/70 uppercase tracking-widest">
            // {isSignup ? "criar conta" : "acesso ao sistema"}
          </p>
          <p className="text-sm text-zinc-600 mt-0.5">
            {isSignup ? "Preencha os seus dados" : "Introduza as suas credenciais"}
          </p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-zinc-800/60 bg-[rgba(22,27,38,0.8)] backdrop-blur-sm p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot anti-bot: campo invisível para humanos, atrativo para bots */}
          <input
            type="text"
            name="website"
            value={website}
            onChange={e => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] top-auto h-0 w-0 overflow-hidden opacity-0"
          />

          {/* Nome Completo (apenas no cadastro) */}
          {isSignup && (
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Nome Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Seu nome"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="pl-9 bg-zinc-900/60 border-zinc-700 focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/40"
                />
              </div>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-9 bg-zinc-900/60 border-zinc-700 focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/40"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-400">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600 pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="pl-9 pr-10 bg-zinc-900/60 border-zinc-700 focus-visible:border-cyan-500/70 focus-visible:ring-1 focus-visible:ring-cyan-500/40"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setRememberMe(v => !v)}
              aria-checked={rememberMe}
              role="checkbox"
              className={`relative flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                rememberMe
                  ? "bg-cyan-500 border-cyan-500"
                  : "bg-transparent border-zinc-600 hover:border-zinc-400"
              }`}
            >
              {rememberMe && (
                <svg viewBox="0 0 10 8" className="h-2.5 w-2.5" fill="none">
                  <path
                    d="M1 4l3 3 5-6"
                    stroke="#09090b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <span
              className="text-sm text-zinc-400 cursor-pointer select-none"
              onClick={() => setRememberMe(v => !v)}
            >
              Lembrar-me por 30 dias
            </span>
          </div>

          {/* Verificação anti-bot (Turnstile) — invisível se não configurada */}
          <TurnstileWidget onToken={setCaptchaToken} resetKey={`${mode}-${turnstileResetKey}`} />

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold transition-all border-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-950/30 border-t-zinc-950 animate-spin" />
                {isSignup ? "Criando..." : "Verificando..."}
              </span>
            ) : (
              isSignup ? "Criar conta" : "Entrar"
            )}
          </Button>
        </form>

        {/* Alternar entre login e cadastro */}
        <p className="text-center text-sm text-zinc-500 mt-5">
          {isSignup ? "Já tem conta?" : "Não tem conta?"}{" "}
          <button
            type="button"
            onClick={() => { setMode(isSignup ? "signin" : "signup"); setPassword(""); setCaptchaToken(null); }}
            className="font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            {isSignup ? "Entrar" : "Criar conta"}
          </button>
        </p>
      </div>

      <p className="text-center text-[11px] text-zinc-700 mt-6 font-mono">
        // {isSignup ? "comece o seu teste de 14 dias" : "sistema privado · acesso restrito"}
      </p>
    </motion.div>
  );
}
