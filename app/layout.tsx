import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  themeColor: "#06b6d4",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "GG Tech | Controle Financeiro",
  description: "Sistema de controle de comissionamento comercial — GG Tech",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GG Tech",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nunca deixar a verificação de auth crashar o layout inteiro.
  // O ConditionalLayout já reconcilia o user no cliente via onAuthStateChange.
  let user = null;
  try {
    const supabase = await createSupabaseServer();
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch {
    user = null;
  }

  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <ConditionalLayout initialUser={user}>
          {children}
        </ConditionalLayout>
        <Toaster />
      </body>
    </html>
  );
}
