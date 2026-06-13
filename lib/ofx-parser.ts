import type {
  ExpenseEntryInsert, IncomeEntryInsert,
  ExpenseCategory, IncomeCategory,
} from "./finance";

/**
 * Parser de extratos OFX (Open Financial Exchange).
 *
 * O OFX é SGML-like: muitas tags não têm fechamento. Em vez de um parser
 * de árvore, varremos cada bloco <STMTTRN>...</STMTTRN> e extraímos os
 * campos por regex tolerante (aceita tag fechada ou não).
 *
 * Puro e isolado: não importa Supabase nem React — apenas transforma texto.
 */

export type OfxTransactionType = "debit" | "credit";

export interface OfxTransaction {
  fitid: string | null;   // <FITID> — identificador único da transação no banco
  date: string;           // ISO yyyy-MM-dd (<DTPOSTED>)
  competencia: string;    // primeiro dia do mês (yyyy-MM-01)
  amount: number;         // valor com sinal (<TRNAMT>); negativo = saída
  type: OfxTransactionType;
  description: string;     // <MEMO> ou <NAME>
}

export interface OfxParseResult {
  transactions: OfxTransaction[];
  debitCount: number;
  creditCount: number;
  totalDebit: number;   // soma (positiva) das saídas
  totalCredit: number;  // soma das entradas
}

/** Extrai o valor de uma tag SGML (com ou sem fechamento) dentro de um bloco. */
function readTag(block: string, tag: string): string | null {
  // captura tudo até o próximo '<' ou quebra de linha
  const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : null;
}

/** Converte <DTPOSTED> (YYYYMMDD[HHMMSS[.xxx]][tz]) em ISO yyyy-MM-dd. */
export function parseOfxDate(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, "");
  if (digits.length < 8) return null;
  const y = digits.slice(0, 4);
  const m = digits.slice(4, 6);
  const d = digits.slice(6, 8);
  const month = Number(m), day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m}-${d}`;
}

/** Normaliza <TRNAMT> aceitando vírgula decimal e separador de milhar. */
export function parseOfxAmount(raw: string | null): number {
  if (!raw) return 0;
  let s = raw.trim().replace(/\s/g, "");
  // "1.234,56" → "1234.56"  |  "1234.56" mantém  |  "1234,56" → "1234.56"
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = parseFloat(s);
  return Number.isNaN(n) ? 0 : n;
}

/** Faz o parse completo do texto bruto de um arquivo .ofx. */
export function parseOfx(raw: string): OfxParseResult {
  const transactions: OfxTransaction[] = [];
  if (!raw) return { transactions, debitCount: 0, creditCount: 0, totalDebit: 0, totalCredit: 0 };

  // Captura cada bloco <STMTTRN> ... </STMTTRN> (case-insensitive, multilinha).
  const blockRe = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match: RegExpExecArray | null;

  while ((match = blockRe.exec(raw)) !== null) {
    const block = match[1];
    const date = parseOfxDate(readTag(block, "DTPOSTED"));
    if (!date) continue; // sem data válida, descarta

    const amount = parseOfxAmount(readTag(block, "TRNAMT"));
    const memo = readTag(block, "MEMO") ?? readTag(block, "NAME") ?? "Transação";
    const fitid = readTag(block, "FITID");
    const trnType = (readTag(block, "TRNTYPE") ?? "").toUpperCase();

    // Tipo: prioriza o sinal do valor; cai para TRNTYPE quando o valor é 0.
    const type: OfxTransactionType =
      amount < 0 ? "debit" : amount > 0 ? "credit" : (trnType === "CREDIT" ? "credit" : "debit");

    transactions.push({
      fitid,
      date,
      competencia: `${date.slice(0, 7)}-01`,
      amount,
      type,
      description: memo.replace(/\s+/g, " ").trim(),
    });
  }

  const debits  = transactions.filter((t) => t.type === "debit");
  const credits = transactions.filter((t) => t.type === "credit");

  return {
    transactions,
    debitCount: debits.length,
    creditCount: credits.length,
    totalDebit: debits.reduce((s, t) => s + Math.abs(t.amount), 0),
    totalCredit: credits.reduce((s, t) => s + t.amount, 0),
  };
}

// ── Mapeamento para inserts do domínio ───────────────────────

export interface OfxExpenseMapOptions {
  /** Categoria atribuída às despesas importadas (default "Outro"). */
  category?: ExpenseCategory;
  /** Vincula as despesas a um cartão de crédito (opcional). */
  creditCardId?: string | null;
  /** Sobrescreve a competência de todas as linhas (default: a da transação). */
  competencia?: string;
}

export interface OfxIncomeMapOptions {
  category?: IncomeCategory;
  competencia?: string;
}

/** Converte as SAÍDAS (debits) do extrato em despesas prontas para inserir. */
export function ofxToExpenseInserts(
  txns: OfxTransaction[],
  opts: OfxExpenseMapOptions = {}
): ExpenseEntryInsert[] {
  return txns
    .filter((t) => t.type === "debit")
    .map((t) => ({
      competencia: opts.competencia ?? t.competencia,
      description: t.description,
      category: opts.category ?? "Outro",
      type: "Variável",
      amount: Math.abs(t.amount),
      due_day: null,
      is_recurring: false,
      payment_method: opts.creditCardId ? "Cartão de Crédito" : "Débito",
      status: "Pago",
      credit_card_id: opts.creditCardId ?? null,
      external_id: t.fitid,
    }));
}

/** Converte as ENTRADAS (credits) do extrato em receitas prontas para inserir. */
export function ofxToIncomeInserts(
  txns: OfxTransaction[],
  opts: OfxIncomeMapOptions = {}
): IncomeEntryInsert[] {
  return txns
    .filter((t) => t.type === "credit")
    .map((t) => ({
      competencia: opts.competencia ?? t.competencia,
      description: t.description,
      category: opts.category ?? "Outro",
      type: "Variável",
      amount: Math.abs(t.amount),
      due_description: null,
      is_commission: false,
      is_recurring: false,
      status: "Recebido",
      external_id: t.fitid,
    }));
}
