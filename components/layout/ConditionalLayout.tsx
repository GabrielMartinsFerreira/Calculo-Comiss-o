"use client";
import { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Sidebar } from "./Sidebar";

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
      <Sidebar user={user} />
      <main className="flex-1 pl-64 min-h-screen scrollbar-dark">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
