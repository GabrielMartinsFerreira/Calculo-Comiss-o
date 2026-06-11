import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
}

export function formatMonthYear(dateStr: string): string {
  return format(parseISO(dateStr), "MMMM 'de' yyyy", { locale: ptBR });
}

export function formatMonthYearShort(dateStr: string): string {
  return format(parseISO(dateStr), "MMM/yy", { locale: ptBR });
}

export function getCompetencia(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(startOfMonth(d), "yyyy-MM-dd");
}

export function getCurrentCompetencia(): string {
  return format(startOfMonth(new Date()), "yyyy-MM-dd");
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
