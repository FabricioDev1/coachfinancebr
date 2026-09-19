import { useEffect, useState } from "react";
import { CalendarDays, CreditCard, Repeat2 } from "lucide-react";
import { useFinance } from "./finance-provider";
import { categories, type FinanceTransaction } from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function TransactionDialog({ open, onOpenChange, transaction = null }: { open: boolean; onOpenChange: (open: boolean) => void; transaction?: FinanceTransaction | null }) {
  const { cards, addTransaction, updateTransaction } = useFinance();
  const [type, setType] = useState(transaction?.transaction_type ?? "expense");
  const [method, setMethod] = useState(transaction?.payment_method ?? "pix");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setType(transaction?.transaction_type ?? "expense");
    setMethod(transaction?.payment_method ?? "pix");
    setError("");
  }, [open, transaction]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const description = String(form.get("description") ?? "").trim();
    const amount = Number(form.get("amount"));
    const issueDate = String(form.get("issueDate") ?? "");
    const dueDate = String(form.get("dueDate") ?? "");
    const cardId = method === "credit" ? String(form.get("cardId") ?? "") : null;
    const card = cards.find((item) => item.id === cardId);
    if (!description || description.length > 120 || !Number.isFinite(amount) || amount <= 0 || !issueDate || !dueDate || (method === "credit" && !card)) { setError("Preencha os campos obrigatórios com valores válidos."); return; }
    setSaving(true);
    try {
      const value = { card_id: cardId, description, amount, transaction_type: type, issue_date: issueDate, due_date: dueDate, payment_method: method, payment_source: card?.name ?? String(form.get("source") ?? "Conta principal").slice(0, 80), category: String(form.get("category") ?? "Outros"), status: String(form.get("status") ?? "pending"), installment_count: transaction?.installment_count ?? Math.min(120, Math.max(1, Number(form.get("installments")) || 1)), recurrence: transaction?.recurrence ?? String(form.get("recurrence") ?? "none"), recurrence_months: transaction?.recurrence_months ?? null };
      if (transaction) await updateTransaction(transaction.id, value); else await addTransaction(value);
      onOpenChange(false);
    } catch { setError("Não foi possível salvar agora. Tente novamente."); } finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[92vh] overflow-y-auto border-glass-border bg-background/95 text-foreground backdrop-blur-2xl sm:max-w-2xl">
    <DialogHeader><DialogTitle className="font-display text-2xl">{transaction ? "Editar lançamento" : "Novo lançamento"}</DialogTitle><DialogDescription>{transaction ? "Atualize somente este lançamento da série." : "Registre uma receita ou despesa. Parcelas futuras são distribuídas automaticamente."}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="mt-2 space-y-5">
      <div className="grid grid-cols-2 gap-2"><Button type="button" variant={type === "expense" ? "default" : "glass"} onClick={() => setType("expense")}>Despesa</Button><Button type="button" variant={type === "income" ? "default" : "glass"} onClick={() => setType("income")}>Receita</Button></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Descrição"><Input name="description" maxLength={120} required placeholder="Ex.: Faculdade" defaultValue={transaction?.description} /></Field><Field label="Valor"><Input name="amount" type="number" min="0.01" step="0.01" required placeholder="199,00" defaultValue={transaction?.amount} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><DateField name="issueDate" label="Emissão / competência" initialValue={transaction?.issue_date ?? "2026-09-01"}/><DateField name="dueDate" label="Vencimento / pagamento" initialValue={transaction?.due_date ?? "2026-09-10"}/></div>
      <Field label="Categoria"><NativeSelect name="category" options={[...categories]} {...(transaction ? { defaultValue: transaction.category } : {})} /></Field>
      <div><Label>Forma de pagamento</Label><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["credit","Cartão"],["debit","Débito"],["pix","Pix"],["cash","Dinheiro"]].map(([value = "pix",label]) => <Button key={value} type="button" variant={method === value ? "default" : "glass"} onClick={() => setMethod(value)}>{label}</Button>)}</div></div>
      <div className="grid gap-4 sm:grid-cols-2">{method === "credit" ? <Field label="Cartão"><Select name="cardId" required {...(transaction?.card_id ? { defaultValue: transaction.card_id } : {})}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{cards.map((card) => <SelectItem key={card.id} value={card.id}>{card.name}</SelectItem>)}</SelectContent></Select></Field> : <Field label="Origem do pagamento"><Input name="source" maxLength={80} defaultValue={transaction?.payment_source ?? (method === "cash" ? "Carteira" : "Conta Inter")} /></Field>}<Field label="Status"><NativeSelect name="status" options={["pending|Pendente","paid|Pago"]} {...(transaction ? { defaultValue: transaction.status } : {})} /></Field></div>
      {type === "expense" && !transaction && <div className="grid gap-4 sm:grid-cols-2"><Field label="Parcelas"><div className="relative"><CreditCard className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"/><Input className="pl-9" name="installments" type="number" min="1" max="120" defaultValue="1" /></div></Field><Field label="Recorrência"><div className="relative"><Repeat2 className="pointer-events-none absolute left-3 top-2.5 z-10 size-4 text-muted-foreground"/><NativeSelect className="pl-9" name="recurrence" options={["none|Não repetir","monthly|Mensal","indefinite|Indefinida"]} /></div></Field></div>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
       <Button className="w-full" size="lg" disabled={saving}>{saving ? "Salvando..." : transaction ? "Salvar alterações" : "Salvar lançamento"}</Button>
    </form>
  </DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
function DateField({ name, label, initialValue }: { name: string; label: string; initialValue: string }) { const [date,setDate]=useState<Date|undefined>(()=>new Date(`${initialValue}T12:00:00`)); return <Field label={label}><input type="hidden" name={name} value={date ? format(date,"yyyy-MM-dd") : ""}/><Popover><PopoverTrigger asChild><Button type="button" variant="glass" className={cn("w-full justify-start font-normal",!date&&"text-muted-foreground")}><CalendarDays/>{date ? format(date,"dd/MM/yyyy",{locale:ptBR}) : "Selecionar data"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={date} onSelect={setDate} initialFocus className="pointer-events-auto p-3"/></PopoverContent></Popover></Field> }
function NativeSelect({ name, options, className = "", defaultValue }: { name: string; options: string[]; className?: string; defaultValue?: string }) { return <select name={name} defaultValue={defaultValue} className={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring ${className}`}>{options.map((option) => { const [value,label] = option.includes("|") ? option.split("|") : [option,option]; return <option key={value} value={value} className="bg-background">{label}</option>; })}</select>; }