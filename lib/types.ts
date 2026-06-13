export type PaymentMethod = "Pix" | "Boleto" | "Cartão";
export type OrderStatus = "Pendente" | "Pago";

export interface ServiceOrder {
  id: string;
  os_number: string;
  client_name: string;
  order_date: string; // ISO date string
  order_value: number;
  payment_method: PaymentMethod;
  status: OrderStatus;
  competencia: string; // ISO date string (first day of month)
  created_at: string;
  updated_at: string;
}

export type ServiceOrderInsert = Omit<ServiceOrder, "id" | "created_at" | "updated_at">;
export type ServiceOrderUpdate = Partial<ServiceOrderInsert>;

export interface CommissionBracket {
  label: string;
  min: number;
  max: number;
  rate: number;
  color: string;
}

export interface MonthSummary {
  competencia: string;
  total_previsto: number;
  total_pago: number;
  comissao_prevista: number;
  comissao_real: number;
  count_pendente: number;
  count_pago: number;
}

export interface DashboardData {
  current_month: MonthSummary;
  orders: ServiceOrder[];
}

// ── Assinaturas (SaaS Multi-Tenant) ──────────────────────────

export type SubscriptionStatus = "trial" | "active" | "past_due" | "canceled";

export interface Subscription {
  id: string;
  user_id: string;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null; // ISO timestamptz
  created_at: string;
  updated_at: string;
}

/**
 * Snapshot mínimo usado pelo middleware (edge) para decidir o gate de acesso.
 * Mantido enxuto de propósito — apenas o necessário para `isSubscriptionActive`.
 */
export interface SubscriptionGate {
  status: SubscriptionStatus;
  current_period_end: string | null;
}
