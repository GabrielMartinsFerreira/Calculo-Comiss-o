"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, BarChart2, Wallet, LogOut, User as UserIcon } from "lucide-react";
import Image from "next/image";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/supabase";
import { toast } from "@/lib/use-toast";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: FileText },
  { href: "/relatorios", label: "Relatórios", icon: BarChart2 },
  { href: "/financas", label: "Finanças", icon: Wallet },
];

interface SidebarProps {
  user: User | null;
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    try {
      await signOut();
      router.push("/login");
      router.refresh();
    } catch {
      toast({ title: "Erro ao sair", variant: "destructive" });
    }
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-zinc-800/60 bg-[rgba(9,9,11,0.95)] backdrop-blur-xl">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-zinc-800/60 px-4">
        <Image
          src="/logo.png"
          alt="GG Tech"
          width={180}
          height={48}
          className="object-contain h-10 w-auto"
          priority
        />
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 p-3 flex-1">
        <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Menu
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-cyan-400" />
              )}
              <Icon className={cn("h-4 w-4 transition-colors", active ? "text-cyan-400" : "text-zinc-600 group-hover:text-zinc-400")} />
              {label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#06b6d4]" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-zinc-800/60 p-4 space-y-2">
        {user && (
          <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 px-3 py-2.5 flex items-center gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
              <UserIcon className="h-3 w-3 text-cyan-400" />
            </div>
            <p className="text-[11px] text-zinc-500 font-mono truncate flex-1">{user.email}</p>
          </div>
        )}
        <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-3">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981] animate-pulse" />
            <p className="text-[11px] text-zinc-500">Conectado ao Supabase</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-zinc-600 hover:text-red-400 hover:bg-red-500/5 border border-transparent hover:border-red-500/20 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Terminar sessão
        </button>
      </div>
    </aside>
  );
}
