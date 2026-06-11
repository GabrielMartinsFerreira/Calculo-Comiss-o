import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ConditionalLayout } from "@/components/layout/ConditionalLayout";
import { createSupabaseServer } from "@/lib/supabase-server";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Comissão Comercial",
  description: "Sistema de controle de comissionamento comercial",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <ConditionalLayout initialUser={user}>
          {children}
        </ConditionalLayout>
        <Toaster />
      </body>
    </html>
  );
}
