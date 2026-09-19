export type PaymentMethod = "credit" | "debit" | "pix" | "cash";
export type TransactionStatus = "paid" | "pending";

export type FinanceCard = {
  id: string;
  name: string;
  credit_limit: number;
  closing_day: number;
  due_day: number;
  color: string;
};

export type FinanceIncome = {
  id: string;
  description: string;
  amount: number;
  reference_month: string;
  received_date: string | null;
  status: string;
};

export type FinanceTransaction = {
  id: string;
  parent_id: string | null;
  card_id: string | null;
  description: string;
  amount: number;
  transaction_type: string;
  issue_date: string;
  due_date: string;
  payment_method: string;
  payment_source: string;
  category: string;
  status: string;
  installment_number: number;
  installment_count: number;
  recurrence: string;
  recurrence_months: number | null;
};

export const categories = ["Alimentação", "Moradia", "Transporte", "Educação", "Saúde", "Lazer", "Assinaturas", "Compras", "Contas", "Outros"] as const;

export const demoCards: FinanceCard[] = [
  { id: "inter", name: "Inter", credit_limit: 2000, closing_day: 8, due_day: 17, color: "brand" },
  { id: "nubank", name: "Nubank", credit_limit: 3000, closing_day: 15, due_day: 25, color: "accent" },
  { id: "mercado", name: "Mercado Pago", credit_limit: 1500, closing_day: 20, due_day: 28, color: "warn" },
];

export const demoIncomes: FinanceIncome[] = [
  { id: "salary-now", description: "Salário", amount: 3500, reference_month: "2026-09-01", received_date: "2026-09-05", status: "received" },
  { id: "salary-next", description: "Salário previsto", amount: 3500, reference_month: "2026-10-01", received_date: null, status: "expected" },
  { id: "freelance", description: "Projeto freelance", amount: 480, reference_month: "2026-09-01", received_date: null, status: "expected" },
];

export const demoTransactions: FinanceTransaction[] = [
  { id: "faculdade", parent_id: "faculdade", card_id: "inter", description: "Faculdade", amount: 199, transaction_type: "expense", issue_date: "2026-09-01", due_date: "2026-09-10", payment_method: "credit", payment_source: "Inter", category: "Educação", status: "pending", installment_number: 1, installment_count: 3, recurrence: "none", recurrence_months: null },
  { id: "internet", parent_id: "internet", card_id: null, description: "Internet", amount: 99.9, transaction_type: "expense", issue_date: "2026-09-01", due_date: "2026-09-05", payment_method: "pix", payment_source: "Conta Inter", category: "Moradia", status: "paid", installment_number: 1, installment_count: 1, recurrence: "monthly", recurrence_months: null },
  { id: "restaurante", parent_id: null, card_id: null, description: "Restaurante", amount: 86, transaction_type: "expense", issue_date: "2026-09-08", due_date: "2026-09-08", payment_method: "debit", payment_source: "Conta Inter", category: "Alimentação", status: "paid", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "spotify", parent_id: "spotify", card_id: "nubank", description: "Spotify", amount: 12.9, transaction_type: "expense", issue_date: "2026-09-01", due_date: "2026-09-01", payment_method: "credit", payment_source: "Nubank", category: "Assinaturas", status: "paid", installment_number: 1, installment_count: 1, recurrence: "indefinite", recurrence_months: null },
  { id: "mercado", parent_id: null, card_id: null, description: "Mercado", amount: 264.1, transaction_type: "expense", issue_date: "2026-09-07", due_date: "2026-09-07", payment_method: "pix", payment_source: "Conta Inter", category: "Alimentação", status: "paid", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "inter-fatura", parent_id: null, card_id: "inter", description: "Compras do mês", amount: 588.1, transaction_type: "expense", issue_date: "2026-09-01", due_date: "2026-09-17", payment_method: "credit", payment_source: "Inter", category: "Compras", status: "pending", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "nubank-fatura", parent_id: null, card_id: "nubank", description: "Compras Nubank", amount: 1187.1, transaction_type: "expense", issue_date: "2026-09-01", due_date: "2026-09-25", payment_method: "credit", payment_source: "Nubank", category: "Compras", status: "pending", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "mp-fatura", parent_id: null, card_id: "mercado", description: "Compras Mercado Pago", amount: 450, transaction_type: "expense", issue_date: "2026-09-01", due_date: "2026-09-28", payment_method: "credit", payment_source: "Mercado Pago", category: "Compras", status: "pending", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
];

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const shortBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function addMonths(date: string, offset: number) {
  const parsed = new Date(`${date}T12:00:00`);
  parsed.setMonth(parsed.getMonth() + offset);
  return parsed.toISOString().slice(0, 10);
}