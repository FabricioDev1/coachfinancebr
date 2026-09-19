import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addMonths, demoCards, demoIncomes, demoTransactions, type FinanceCard, type FinanceIncome, type FinanceTransaction } from "@/lib/finance-data";

type NewTransaction = Omit<FinanceTransaction, "id" | "parent_id" | "installment_number">;
type NewCard = Omit<FinanceCard, "id">;
type NewIncome = Omit<FinanceIncome, "id">;

type FinanceContextValue = {
  cards: FinanceCard[];
  incomes: FinanceIncome[];
  transactions: FinanceTransaction[];
  signedIn: boolean;
  loading: boolean;
  addTransaction: (value: NewTransaction) => Promise<void>;
  updateTransaction: (id: string, value: NewTransaction) => Promise<void>;
  addCard: (value: NewCard) => Promise<void>;
  addIncome: (value: NewIncome) => Promise<void>;
  togglePaid: (id: string) => Promise<void>;
  removeTransaction: (id: string, scope?: "single" | "series") => Promise<void>;
  removeCard: (id: string) => Promise<void>;
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [cards, setCards] = useState<FinanceCard[]>(demoCards);
  const [incomes, setIncomes] = useState<FinanceIncome[]>(demoIncomes);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(demoTransactions);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadVersion = useRef(0);

  const load = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (version !== loadVersion.current) return;
    if (!userData.user) {
      setSignedIn(false);
      setCards(demoCards);
      setIncomes(demoIncomes);
      setTransactions(demoTransactions);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    setCards([]);
    setIncomes([]);
    setTransactions([]);
    const [cardsResult, incomesResult, transactionsResult] = await Promise.all([
      supabase.from("cards").select("id,name,credit_limit,closing_day,due_day,color").eq("user_id", userData.user.id).order("created_at"),
      supabase.from("incomes").select("id,description,amount,reference_month,received_date,status").eq("user_id", userData.user.id).order("reference_month"),
      supabase.from("transactions").select("id,parent_id,card_id,description,amount,transaction_type,issue_date,due_date,payment_method,payment_source,category,status,installment_number,installment_count,recurrence,recurrence_months").eq("user_id", userData.user.id).order("due_date"),
    ]);
    if (version !== loadVersion.current) return;
    if (cardsResult.error) throw cardsResult.error;
    if (incomesResult.error) throw incomesResult.error;
    if (transactionsResult.error) throw transactionsResult.error;
    setCards(cardsResult.data ?? []);
    setIncomes(incomesResult.data ?? []);
    setTransactions(transactionsResult.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void load();
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const addCard = async (value: NewCard) => {
    const { data: userData } = await supabase.auth.getUser();
    const local = { ...value, id: crypto.randomUUID() };
    if (!userData.user) { setCards((current) => [...current, local]); return; }
    const { data, error } = await supabase.from("cards").insert({ ...value, user_id: userData.user.id }).select("id,name,credit_limit,closing_day,due_day,color").single();
    if (error) throw error;
    setCards((current) => [...current, data]);
  };

  const addIncome = async (value: NewIncome) => {
    const { data: userData } = await supabase.auth.getUser();
    const local = { ...value, id: crypto.randomUUID() };
    if (!userData.user) { setIncomes((current) => [...current, local]); return; }
    const { data, error } = await supabase.from("incomes").insert({ ...value, user_id: userData.user.id }).select("id,description,amount,reference_month,received_date,status").single();
    if (error) throw error;
    setIncomes((current) => [...current, data]);
  };

  const addTransaction = async (value: NewTransaction) => {
    const installmentCount = Math.max(1, value.installment_count);
    const count = value.recurrence === "monthly" ? Math.max(2, installmentCount) : installmentCount;
    const perInstallment = Math.round((value.amount / installmentCount) * 100) / 100;
    const seriesId = crypto.randomUUID();
    const isSeries = count > 1 || value.recurrence !== "none";
    const rows = Array.from({ length: count }, (_, index) => ({
      ...value,
      id: index === 0 ? seriesId : crypto.randomUUID(),
      parent_id: isSeries ? seriesId : null,
      amount: perInstallment,
      issue_date: addMonths(value.issue_date, index),
      due_date: addMonths(value.due_date, index),
      status: index === 0 ? value.status : "pending",
      installment_number: installmentCount > 1 ? index + 1 : 1,
    }));
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setTransactions((current) => [...current, ...rows]);
      return;
    }
    const payload = rows.map((row) => ({ ...row, user_id: userData.user?.id ?? "" }));
    const { data, error } = await supabase.from("transactions").insert(payload).select("id,parent_id,card_id,description,amount,transaction_type,issue_date,due_date,payment_method,payment_source,category,status,installment_number,installment_count,recurrence,recurrence_months");
    if (error) throw error;
    setTransactions((current) => [...current, ...(data ?? [])]);
  };

  const updateTransaction = async (id: string, value: NewTransaction) => {
    const current = transactions.find((item) => item.id === id);
    if (!current) return;
    const updated = { ...current, ...value, installment_count: current.installment_count, installment_number: current.installment_number, recurrence: current.recurrence };
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error } = await supabase.from("transactions").update(value).eq("id", id).eq("user_id", userData.user.id);
      if (error) throw error;
    }
    setTransactions((items) => items.map((item) => item.id === id ? updated : item));
  };

  const togglePaid = async (id: string) => {
    const current = transactions.find((item) => item.id === id);
    if (!current) return;
    const status = current.status === "paid" ? "pending" : "paid";
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error } = await supabase.from("transactions").update({ status }).eq("id", id).eq("user_id", userData.user.id);
      if (error) throw error;
    }
    setTransactions((items) => items.map((item) => item.id === id ? { ...item, status } : item));
  };

  const removeTransaction = async (id: string, scope: "single" | "series" = "single") => {
    const current = transactions.find((item) => item.id === id);
    if (!current) return;
    const seriesId = current.parent_id ?? current.id;
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      if (scope === "single" && id === seriesId) {
        const replacement = transactions.find((item) => item.id !== id && item.parent_id === seriesId);
        if (replacement) {
          const { error: regroupError } = await supabase
            .from("transactions")
            .update({ parent_id: replacement.id })
            .eq("parent_id", seriesId)
            .eq("user_id", userData.user.id);
          if (regroupError) throw regroupError;
        }
      }
      const query = supabase.from("transactions").delete().eq("user_id", userData.user.id);
      const { error } = scope === "series"
        ? await query.or(`id.eq.${seriesId},parent_id.eq.${seriesId}`)
        : await query.eq("id", id);
      if (error) throw error;
    }
    setTransactions((items) => {
      if (scope === "series") return items.filter((item) => item.id !== seriesId && item.parent_id !== seriesId);
      if (id !== seriesId) return items.filter((item) => item.id !== id);
      const replacement = items.find((item) => item.id !== id && item.parent_id === seriesId);
      return items
        .filter((item) => item.id !== id)
        .map((item) => replacement && item.parent_id === seriesId ? { ...item, parent_id: replacement.id } : item);
    });
  };

  const removeCard = async (id: string) => {
    if (transactions.some((item) => item.card_id === id)) {
      throw new Error("CARD_HAS_TRANSACTIONS");
    }
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error } = await supabase.from("cards").delete().eq("id", id).eq("user_id", userData.user.id);
      if (error) throw error;
    }
    setCards((items) => items.filter((item) => item.id !== id));
  };

  const value = useMemo(() => ({ cards, incomes, transactions, signedIn, loading, addTransaction, updateTransaction, addCard, addIncome, togglePaid, removeTransaction, removeCard }), [cards, incomes, transactions, signedIn, loading]);
  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const value = useContext(FinanceContext);
  if (!value) throw new Error("useFinance must be used inside FinanceProvider");
  return value;
}