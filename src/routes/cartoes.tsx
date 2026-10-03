import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, CreditCard, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/finance/app-shell";
import { useFinance } from "@/components/finance/finance-provider";
import { brl, type FinanceCard } from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/cartoes")({ head: () => ({ meta: [{ title: "Cartões — Manager Finance" }, { name: "description", content: "Consulte a próxima fatura, limites e gastos futuros de cada cartão." }, { property: "og:title", content: "Cartões — Manager Finance" }, { property: "og:description", content: "Consulte a próxima fatura de cada cartão a partir de uma data." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: CardsPage });

function localToday() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function invoiceDate(from: string, dueDay: number) {
  const parts = from.split("-").map(Number);
  const year = parts[0];
  const month = parts[1];
  if (year === undefined || month === undefined || month < 1 || month > 12) return from;
  const dateForMonth = (y: number, m: number) => {
    const day = Math.min(dueDay, new Date(y, m, 0).getDate());
    return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  const current = dateForMonth(year, month);
  const next = new Date(year, month, 1);
  return current >= from ? current : dateForMonth(next.getFullYear(), next.getMonth() + 1);
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function CardsPage() {
  const { cards, transactions, addCard, removeCard } = useFinance();
  const [fromDate, setFromDate] = useState(localToday);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FinanceCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const usage = cards.map((card) => {
    const dueDate = invoiceDate(fromDate, card.due_day);
    const month = dueDate.slice(0, 7);
    const cardTransactions = transactions.filter((item) => item.card_id === card.id);
    const used = cardTransactions.filter((item) => item.due_date.startsWith(month)).reduce((sum, item) => sum + item.amount, 0);
    const future = cardTransactions.filter((item) => item.due_date.slice(0, 7) > month).reduce((sum, item) => sum + item.amount, 0);
    return { ...card, dueDate, used, future };
  });
  const linkedCount = pendingDelete ? transactions.filter((item) => item.card_id === pendingDelete.id).length : 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await addCard({ name: String(form.get("name") ?? "").trim().slice(0, 60), credit_limit: Number(form.get("limit")), closing_day: Number(form.get("closing")), due_day: Number(form.get("due")), color: String(form.get("color") ?? "brand") });
    setOpen(false);
  }

  async function confirmDelete() {
    if (!pendingDelete || deleting) return;
    setDeleting(true);
    try {
      await removeCard(pendingDelete.id);
      toast.success("Cartão excluído.");
      setPendingDelete(null);
    } catch (error) {
      toast.error(error instanceof Error && error.message === "CARD_HAS_TRANSACTIONS" ? "O cartão possui lançamentos vinculados." : "Não foi possível excluir o cartão.");
    } finally {
      setDeleting(false);
    }
  }

  return <AppShell>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Crédito</p>
        <h1 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">Meus cartões</h1>
        <p className="mt-1 text-sm text-muted-foreground">{brl.format(usage.reduce((sum, card) => sum + card.used + card.future, 0))} comprometidos a partir das próximas faturas</p>
      </div>
      <Button className="shrink-0" onClick={() => setOpen(true)}><Plus /><span className="hidden sm:inline">Novo cartão</span><span className="sm:hidden">Novo</span></Button>
    </div>

    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Label htmlFor="invoice-from" className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />Consultar a partir de</Label>
      <Input id="invoice-from" aria-label="Consultar faturas a partir de" type="date" value={fromDate} onChange={(event) => { if (event.target.value) setFromDate(event.target.value); }} className="w-44 border-glass-border bg-glass text-foreground [color-scheme:dark]" />
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {usage.map((card) => <article key={card.id} className="glass-panel relative overflow-hidden rounded-[24px] p-4 sm:p-5">
        <div className={`absolute inset-x-0 top-0 h-1 bg-${card.color}`} />
        <div className="flex items-center justify-between"><span className={`grid size-11 shrink-0 place-items-center rounded-xl bg-${card.color}/15 text-${card.color}`}><CreditCard /></span><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">fecha dia {card.closing_day}</span><Button className="min-h-11 min-w-11" size="icon" variant="glass" onClick={() => setPendingDelete(card)} title="Excluir cartão" aria-label={`Excluir cartão ${card.name}`}><Trash2 /></Button></div></div>
        <h2 className="mt-4 font-display text-xl font-semibold sm:mt-5">{card.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">Próximo vencimento: {formatDate(card.dueDate)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">Próxima fatura</p><strong className="break-words font-display text-sm sm:text-base">{brl.format(card.used)}</strong></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Limite disponível</p><strong className="break-words font-display text-sm sm:text-base">{brl.format(Math.max(0, card.credit_limit - card.used))}</strong></div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-glass"><div className={`h-full bg-${card.color}`} style={{ width: `${card.credit_limit > 0 ? Math.min(100, card.used / card.credit_limit * 100) : 0}%` }} /></div>
        <div className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground"><span>Faturas seguintes {brl.format(card.future)}</span><span className="shrink-0">vence dia {card.due_day}</span></div>
      </article>)}
    </div>

    <section className="glass-panel mt-4 rounded-[28px] p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-success" /><div><h2 className="font-display font-semibold">Resumo de faturas</h2><p className="text-sm text-muted-foreground">Próxima fatura de cada cartão a partir de {formatDate(fromDate)}</p></div></div><div className="mt-5 divide-y divide-border">{usage.map((card) => <div className="flex items-center justify-between gap-3 py-3" key={card.id}><span className="flex min-w-0 items-center gap-2"><span className={`size-2.5 shrink-0 rounded-full bg-${card.color}`} /><span className="min-w-0">{card.name}<span className="block text-xs text-muted-foreground">{formatDate(card.dueDate)}</span></span></span><strong className="shrink-0 font-display">{brl.format(card.used)}</strong></div>)}</div></section>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-glass-border bg-background/95"><DialogHeader><DialogTitle>Novo cartão</DialogTitle><DialogDescription>Informe os dados usados para calcular faturas e limites.</DialogDescription></DialogHeader><form onSubmit={submit} className="space-y-4"><Field label="Nome"><Input name="name" maxLength={60} required placeholder="Ex.: Itaú" /></Field><Field label="Limite total"><Input name="limit" type="number" min="0" step="0.01" required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Dia de fechamento"><Input name="closing" type="number" min="1" max="31" required /></Field><Field label="Dia de vencimento"><Input name="due" type="number" min="1" max="31" required /></Field></div><Field label="Cor"><select name="color" className="h-9 w-full rounded-md border border-input bg-transparent px-3"><option className="bg-background" value="brand">Azul</option><option className="bg-background" value="accent">Verde</option><option className="bg-background" value="warn">Amarelo</option><option className="bg-background" value="danger">Rosa</option></select></Field><Button className="w-full">Salvar cartão</Button></form></DialogContent></Dialog>
    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(next) => { if (!next && !deleting) setPendingDelete(null); }}><AlertDialogContent className="border-glass-border bg-background/95 text-foreground backdrop-blur-2xl"><AlertDialogHeader><AlertDialogTitle>{linkedCount > 0 ? "Este cartão não pode ser excluído" : `Excluir cartão ${pendingDelete?.name}?`}</AlertDialogTitle><AlertDialogDescription>{linkedCount > 0 ? `Existem ${linkedCount} lançamentos vinculados. Exclua ou altere esses lançamentos antes de remover o cartão.` : "Esta ação não pode ser desfeita."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>{linkedCount > 0 ? "Entendi" : "Cancelar"}</AlertDialogCancel>{linkedCount === 0 && <AlertDialogAction disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmDelete()}>Excluir cartão</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
