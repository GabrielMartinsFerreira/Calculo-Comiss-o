"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/supabase";
import { toast } from "@/lib/use-toast";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await signIn(email.trim(), password, rememberMe);
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Credenciais inválidas";
      toast({ title: "Falha no login", description: msg, variant: "destructive" });
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
            // acesso ao sistema
          </p>
          <p className="text-sm text-zinc-600 mt-0.5">Introduza as suas credenciais</p>
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-zinc-800/60 bg-[rgba(22,27,38,0.8)] backdrop-blur-sm p-8 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
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
                autoComplete="current-password"
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

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold transition-all border-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 rounded-full border-2 border-zinc-950/30 border-t-zinc-950 animate-spin" />
                Verificando...
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
      </div>

      <p className="text-center text-[11px] text-zinc-700 mt-6 font-mono">
        // sistema privado · acesso restrito
      </p>
    </motion.div>
  );
}
