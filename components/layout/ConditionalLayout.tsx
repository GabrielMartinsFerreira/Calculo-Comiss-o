"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";

interface ConditionalLayoutProps {
  children: React.ReactNode;
  initialUser: User | null;
}

export function ConditionalLayout({ children, initialUser }: ConditionalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);
  const isLoginPage = pathname === "/login";

  // "Lembrar-me": se o utilizador não marcou a opção, limpa sessão em nova janela
  const checkRememberMe = useCallback(() => {
    if (isLoginPage || typeof window === "undefined") return;
    const rememberMe = localStorage.getItem("remember_me");
    const sessionActive = sessionStorage.getItem("session_only");

    if (!rememberMe && !sessionActive) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase.auth.signOut().then(() => {
            router.push("/login");
            router.refresh();
          });
        }
      });
    }
  }, [isLoginPage, router]);

  useEffect(() => {
    checkRememberMe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [checkRememberMe]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar: visível apenas em desktop (md+) */}
      <div className="hidden md:flex">
        <Sidebar user={user} />
      </div>
      {/* Conteúdo: sem padding-left em mobile, com padding-left no desktop */}
      <main className="flex-1 pl-0 md:pl-64 min-h-screen pb-20 md:pb-0 scrollbar-dark">
        <div className="p-4 md:p-8">{children}</div>
      </main>
      {/* Bottom nav: visível apenas em mobile */}
      <BottomNav user={user} />
    </div>
  );
}
