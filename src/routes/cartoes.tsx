import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, CreditCard, Plus, ShieldCheck, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/finance/app-shell";
import { useFinance } from "@/components/finance/finance-provider";
import { type FinanceCard } from "@/lib/finance-data";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

import {cardSummary,sumMoney} from "@/lib/finance-calc";
import {monthLabel,formatDateBR} from "@/lib/dates";
import {cardColors,colorOf} from "@/lib/card-colors";

export const Route = createFileRoute("/cartoes")({ head: () => ({ meta: [{ title: "Cartões — Coach Finance BR" }, { name: "description", content: "Consulte a fatura de cada cartão por mês de vencimento, limites e gastos futuros." }, { property: "og:title", content: "Cartões — Coach Finance BR" }, { property: "og:description", content: "Consulte a fatura de cada cartão selecionando o mês de vencimento." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: CardsPage });

function CardsPage() {
  const { cards, transactions, addCard, updateCard, removeCard, markManyPaid, selectedMonth:invoiceMonth, setSelectedMonth:setInvoiceMonth, money, hideValues } = useFinance();
  const [editing,setEditing]=useState<FinanceCard|null>(null); const [saving,setSaving]=useState(false); const [error,setError]=useState(""); const [paying,setPaying]=useState<string|null>(null);
  const [open, setOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FinanceCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const usage=cards.map(card=>({...card,...cardSummary(card,transactions,invoiceMonth)}));
  const linkedCount = pendingDelete ? transactions.filter((item) => item.card_id === pendingDelete.id).length : 0;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value={name:String(form.get("name")??"").trim(),credit_limit:Number(form.get("limit")),closing_day:Number(form.get("closing")),due_day:Number(form.get("due")),color:String(form.get("color")??"brand")};
    if(!value.name||value.name.length>60||!Number.isFinite(value.credit_limit)||value.credit_limit<=0||![value.closing_day,value.due_day].every(v=>Number.isInteger(v)&&v>=1&&v<=31)){setError("Informe nome (1–60 caracteres), limite maior que zero e dias inteiros de 1 a 31.");return;}
    if(saving)return;setSaving(true);setError("");try{if(editing)await updateCard(editing.id,value);else await addCard(value);toast.success("Cartão salvo.");setOpen(false);}catch{setError("Não foi possível salvar o cartão.");toast.error("Não foi possível salvar o cartão.");}finally{setSaving(false);}
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
        <p className="mt-1 text-sm text-muted-foreground">{money(sumMoney(usage.map(c=>({amount:c.usedLimit}))))} comprometidos no limite dos cartões</p>
      </div>
      <Button className="shrink-0" onClick={() => {setEditing(null);setError("");setOpen(true)}}><Plus /><span className="hidden sm:inline">Novo cartão</span><span className="sm:hidden">Novo</span></Button>
    </div>

    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Label htmlFor="invoice-month" className="flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" />Mês de vencimento da fatura</Label>
      <Input id="invoice-month" aria-label="Mês de vencimento da fatura" type="month" value={invoiceMonth} onChange={(event) => { if (event.target.value) setInvoiceMonth(event.target.value); }} className="w-44 border-glass-border bg-glass text-center text-foreground [color-scheme:dark]" />
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      {usage.map((card) => <article key={card.id} className="glass-panel relative overflow-hidden rounded-[24px] p-4 sm:p-5">
        <div className={`absolute inset-x-0 top-0 h-1 ${colorOf(card.color).bar}`} />
        <div className="flex items-center justify-between"><span className={`grid size-11 shrink-0 place-items-center rounded-xl ${colorOf(card.color).soft} ${colorOf(card.color).text}`}><CreditCard /></span><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">fecha dia {card.closing_day}</span><Button className="min-h-11 min-w-11" size="icon" variant="glass" aria-label={`Editar cartão ${card.name}`} title="Editar cartão" onClick={()=>{setEditing(card);setError("");setOpen(true)}}><Pencil/></Button><Button className="min-h-11 min-w-11" size="icon" variant="glass" onClick={() => setPendingDelete(card)} title="Excluir cartão" aria-label={`Excluir cartão ${card.name}`}><Trash2 /></Button></div></div>
        <h2 className="mt-4 font-display text-xl font-semibold sm:mt-5">{card.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground">Vencimento: {formatDateBR(card.dueDate)}</p>
        <div className="mt-4 grid grid-cols-2 gap-3"><div className="min-w-0"><p className="text-xs text-muted-foreground">Fatura do mês</p><strong className="break-words font-display text-sm sm:text-base">{money(card.invoiceTotal)}</strong></div><div className="min-w-0"><p className="text-xs text-muted-foreground">Limite disponível</p><strong className="break-words font-display text-sm sm:text-base">{money(card.availableLimit)}</strong></div></div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-glass"><div className={`h-full ${colorOf(card.color).bar}`} style={{ width: `${card.usagePercent}%` }} /></div>
        <div className="mt-3 flex justify-between gap-3 text-xs text-muted-foreground"><span>Faturas seguintes {money(card.nextInvoices)}</span><span className="shrink-0">vence dia {card.due_day}</span></div>
        <div className="mt-4 flex flex-wrap gap-2"><Button asChild variant="glass" size="sm"><Link to="/lancamentos" search={{cartao:card.id,mes:invoiceMonth,categoria:""}}>Ver lançamentos</Link></Button>{card.invoiceTotal>0&&(card.invoicePaid?<span className="flex items-center gap-1 text-sm text-success"><CheckCircle2 className="size-4"/>Fatura paga ✓</span>:<Button size="sm" variant="glass" disabled={paying===card.id} onClick={async()=>{setPaying(card.id);try{await markManyPaid(card.invoiceItems.map(t=>t.id));toast.success("Fatura marcada como paga.");}catch{toast.error("Não foi possível pagar a fatura.");}finally{setPaying(null);}}}>{paying===card.id?"Salvando...":"Marcar fatura como paga"}</Button>)}</div>
      </article>)}{cards.length===0&&<Button variant="glass" onClick={()=>{setEditing(null);setOpen(true)}}>Cadastre seu primeiro cartão</Button>}
    </div>

    <section className="glass-panel mt-4 rounded-[28px] p-5"><div className="flex items-center gap-3"><ShieldCheck className="text-success" /><div><h2 className="font-display font-semibold">Resumo de faturas</h2><p className="text-sm text-muted-foreground">Faturas com vencimento em {monthLabel(invoiceMonth)}</p></div></div><div className="mt-5 divide-y divide-border">{usage.map((card) => <div className="flex items-center justify-between gap-3 py-3" key={card.id}><span className="flex min-w-0 items-center gap-2"><span className={`size-2.5 shrink-0 rounded-full ${colorOf(card.color).bar}`} /><span className="min-w-0">{card.name}<span className="block text-xs text-muted-foreground">{formatDateBR(card.dueDate)}</span></span></span><strong className="shrink-0 font-display">{money(card.invoiceTotal)}</strong></div>)}</div></section>

    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="border-glass-border bg-background/95"><DialogHeader><DialogTitle>{editing?"Editar cartão":"Novo cartão"}</DialogTitle><DialogDescription>{editing?"Alterar fechamento/vencimento vale para novos lançamentos; os existentes não são recalculados.":"Dados do cartão"}</DialogDescription></DialogHeader><form key={editing?.id??"new"} noValidate onSubmit={submit} className="space-y-4"><Field label="Nome"><Input name="name" defaultValue={editing?.name} maxLength={60} required placeholder="Ex.: Itaú" /></Field><Field label="Limite total"><Input name="limit" defaultValue={editing?.credit_limit} type={hideValues?"password":"number"} inputMode="decimal" min="0" step="0.01" required /></Field><div className="grid grid-cols-2 gap-3"><Field label="Dia de fechamento"><Input name="closing" defaultValue={editing?.closing_day} type="number" min="1" max="31" required /></Field><Field label="Dia de vencimento"><Input name="due" defaultValue={editing?.due_day} type="number" min="1" max="31" required /></Field></div><Field label="Cor"><select name="color" defaultValue={editing?.color??"brand"} aria-label="Cor" className="h-9 w-full rounded-md border border-input bg-transparent px-3">{Object.entries(cardColors).map(([key,c])=><option className="bg-background" key={key} value={key}>{c.label}</option>)}</select></Field>{error&&<p role="alert" className="text-sm text-danger">{error}</p>}<Button className="w-full" disabled={saving}>{saving?"Salvando...":"Salvar cartão"}</Button></form></DialogContent></Dialog>
    <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(next) => { if (!next && !deleting) setPendingDelete(null); }}><AlertDialogContent className="border-glass-border bg-background/95 text-foreground backdrop-blur-2xl"><AlertDialogHeader><AlertDialogTitle>{linkedCount > 0 ? "Este cartão não pode ser excluído" : `Excluir cartão ${pendingDelete?.name}?`}</AlertDialogTitle><AlertDialogDescription>{linkedCount > 0 ? `Existem ${linkedCount} lançamentos vinculados. Exclua ou altere esses lançamentos antes de remover o cartão.` : "Esta ação não pode ser desfeita."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={deleting}>{linkedCount > 0 ? "Entendi" : "Cancelar"}</AlertDialogCancel>{linkedCount>0&&pendingDelete&&<Button asChild variant="glass"><Link to="/lancamentos" search={{cartao:pendingDelete.id,mes:"",categoria:""}}>Ver lançamentos</Link></Button>}{linkedCount === 0 && <AlertDialogAction disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => void confirmDelete()}>Excluir cartão</AlertDialogAction>}</AlertDialogFooter></AlertDialogContent></AlertDialog>
  </AppShell>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-2"><Label>{label}</Label>{children}</div>; }
