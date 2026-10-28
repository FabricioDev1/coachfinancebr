import { currentMonthKey, shiftMonthKey } from "./dates";
import { invoiceDueDate } from "./card-invoice";
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
  is_reserve: boolean;
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
  { id: "salary-now", description: "Salário", amount: 3500, reference_month: `${currentMonthKey()}-01`, received_date: `${currentMonthKey()}-05`, status: "received", is_reserve: false },
  { id: "salary-next", description: "Salário previsto", amount: 3500, reference_month: `${shiftMonthKey(currentMonthKey(),1)}-01`, received_date: null, status: "expected", is_reserve: false },
  { id: "freelance", description: "Projeto freelance", amount: 480, reference_month: `${currentMonthKey()}-01`, received_date: null, status: "expected", is_reserve: false },
  { id: "investimento", description: "Investimento mensal", amount: 500, reference_month: `${currentMonthKey()}-01`, received_date: `${currentMonthKey()}-05`, status: "received", is_reserve: true },
];

const baseDemoTransactions: FinanceTransaction[] = [
  { id: "faculdade", parent_id: "faculdade", card_id: "inter", description: "Faculdade", amount: 199, transaction_type: "expense", issue_date: `${currentMonthKey()}-01`, due_date: `${currentMonthKey()}-10`, payment_method: "credit", payment_source: "Inter", category: "Educação", status: "pending", installment_number: 1, installment_count: 3, recurrence: "none", recurrence_months: null },
  { id: "internet", parent_id: "internet", card_id: null, description: "Internet", amount: 99.9, transaction_type: "expense", issue_date: `${currentMonthKey()}-01`, due_date: `${currentMonthKey()}-05`, payment_method: "pix", payment_source: "Conta Inter", category: "Moradia", status: "paid", installment_number: 1, installment_count: 1, recurrence: "monthly", recurrence_months: null },
  { id: "restaurante", parent_id: null, card_id: null, description: "Restaurante", amount: 86, transaction_type: "expense", issue_date: `${currentMonthKey()}-08`, due_date: `${currentMonthKey()}-08`, payment_method: "debit", payment_source: "Conta Inter", category: "Alimentação", status: "paid", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "spotify", parent_id: "spotify", card_id: "nubank", description: "Spotify", amount: 12.9, transaction_type: "expense", issue_date: `${currentMonthKey()}-01`, due_date: `${currentMonthKey()}-01`, payment_method: "credit", payment_source: "Nubank", category: "Assinaturas", status: "paid", installment_number: 1, installment_count: 1, recurrence: "indefinite", recurrence_months: null },
  { id: "mercado", parent_id: null, card_id: null, description: "Mercado", amount: 264.1, transaction_type: "expense", issue_date: `${currentMonthKey()}-07`, due_date: `${currentMonthKey()}-07`, payment_method: "pix", payment_source: "Conta Inter", category: "Alimentação", status: "paid", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "inter-fatura", parent_id: null, card_id: "inter", description: "Compras do mês", amount: 588.1, transaction_type: "expense", issue_date: `${currentMonthKey()}-01`, due_date: `${currentMonthKey()}-17`, payment_method: "credit", payment_source: "Inter", category: "Compras", status: "pending", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "nubank-fatura", parent_id: null, card_id: "nubank", description: "Compras Nubank", amount: 1187.1, transaction_type: "expense", issue_date: `${currentMonthKey()}-01`, due_date: `${currentMonthKey()}-25`, payment_method: "credit", payment_source: "Nubank", category: "Compras", status: "pending", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
  { id: "mp-fatura", parent_id: null, card_id: "mercado", description: "Compras Mercado Pago", amount: 450, transaction_type: "expense", issue_date: `${currentMonthKey()}-01`, due_date: `${currentMonthKey()}-28`, payment_method: "credit", payment_source: "Mercado Pago", category: "Compras", status: "pending", installment_number: 1, installment_count: 1, recurrence: "none", recurrence_months: null },
];

export const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const shortBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });


export const demoTransactions: FinanceTransaction[] = baseDemoTransactions.map(t => { const card=demoCards.find(c=>c.id===t.card_id); return card?{...t,due_date:invoiceDueDate(t.issue_date,card.closing_day,card.due_day)}:t; });
