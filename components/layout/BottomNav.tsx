"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, FileText, BarChart2, Wallet, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/supabase";
import { toast } from "@/lib/use-toast";

const navItems = [
  { href: "/",            label: "Dashboard",   icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos",  icon: FileText },
  { href: "/relatorios",  label: "Relatórios",   icon: BarChart2 },
  { href: "/financas",    label: "Finanças",     icon: Wallet },
];

interface BottomNavProps {
  user: User | null;
}

export function BottomNav({ user }: BottomNavProps) {
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
    <nav className="fixed bottom-0 left-0 right-0 z-20 flex h-16 items-center border-t border-zinc-800/60 bg-[rgba(9,9,11,0.97)] backdrop-blur-xl md:hidden">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              active ? "text-cyan-400" : "text-zinc-600 active:text-zinc-300"
            )}
          >
            {active && (
              <span className="absolute top-0 h-0.5 w-8 rounded-full bg-cyan-400 shadow-[0_0_8px_#06b6d4]" />
            )}
            <Icon className={cn("h-5 w-5", active ? "text-cyan-400" : "text-zinc-600")} />
            <span>{label}</span>
          </Link>
        );
      })}

      {/* Logout */}
      <button
        onClick={handleLogout}
        aria-label="Terminar sessão"
        className="flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-zinc-600 transition-colors active:text-red-400"
      >
        <LogOut className="h-5 w-5" />
        <span>Sair</span>
      </button>
    </nav>
  );
}
