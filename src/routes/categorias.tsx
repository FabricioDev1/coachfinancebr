import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightLeft, Pencil, Plus, Search, ShieldCheck, Tags, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/app-shell";
import { useFinance } from "@/components/finance/finance-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cardColors, colorOf } from "@/lib/card-colors";
import {
  CATEGORY_NAME_MAX, categoryErrorMessage, categoryKindLabel, categoryKindOptions,
  categoryNameError, foldName, normalizeCategoryName, systemCategory,
} from "@/lib/categories";
import { monthLabel } from "@/lib/dates";
import type { FinanceCategory } from "@/lib/finance-data";

export const Route = createFileRoute("/categorias")({
  head: () => ({
    meta: [
      { title: "Categorias — Coach Finance BR" },
      { name: "description", content: "Crie, edite, exclua e transfira as categorias dos seus lançamentos." },
      { property: "og:title", content: "Categorias — Coach Finance BR" },
      { property: "og:description", content: "Organize seus lançamentos com categorias personalizadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CategoriesPage,
});

type KindFilter = "all" | "expense" | "income";
type Draft = { name: string; color: string; kind: string };
type Stat = { count: number; monthCents: number };

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring";

function CategoriesPage() {
  const {
    categories, transactions, selectedMonth, money,
    addCategory, updateCategory, transferCategory, removeCategory,
  } = useFinance();

  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceCategory | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<FinanceCategory | null>(null);
  const [pendingDelete, setPendingDelete] = useState<FinanceCategory | null>(null);

  const stats = useMemo(() => {
    const map = new Map<string, Stat>();
    for (const t of transactions) {
      const s = map.get(t.category) ?? { count: 0, monthCents: 0 };
      s.count += 1;
      if (t.transaction_type === "expense" && t.due_date.startsWith(selectedMonth)) {
        s.monthCents += Math.round(t.amount * 100);
      }
      map.set(t.category, s);
    }
    return map;
  }, [transactions, selectedMonth]);
  const statOf = (name: string): Stat => stats.get(name) ?? { count: 0, monthCents: 0 };

  const visible = useMemo(() => {
    const q = foldName(query.trim());
    return categories.filter(
      (c) =>
        (!q || foldName(c.name).includes(q)) &&
        (kindFilter === "all" || c.kind === kindFilter || c.kind === "both"),
    );
  }, [categories, query, kindFilter]);

  const usedCount = categories.filter((c) => statOf(c.name).count > 0).length;

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(c: FinanceCategory) { setEditing(c); setFormOpen(true); }
  function openTransfer(c: FinanceCategory | null) { setTransferFrom(c); setTransferOpen(true); }

  async function save(draft: Draft) {
    if (editing) {
      const renamed = !editing.is_system && normalizeCategoryName(draft.name) !== editing.name;
      await updateCategory(editing.id, draft);
      const count = statOf(editing.name).count;
      toast.success(renamed && count > 0 ? `Categoria atualizada. ${count} lançamento(s) renomeado(s).` : "Categoria atualizada.");
    } else {
      await addCategory(draft);
      toast.success("Categoria criada.");
    }
  }

  async function transfer(fromId: string, toId: string, deleteSource: boolean) {
    const moved = await transferCategory(fromId, toId, deleteSource);
    toast.success(
      `${moved} lançamento(s) transferido(s)${deleteSource ? " e categoria de origem excluída" : ""}.`,
    );
  }

  async function remove(category: FinanceCategory, transferTo?: string) {
    await removeCategory(category.id, transferTo);
    toast.success(transferTo ? "Lançamentos transferidos e categoria excluída." : "Categoria excluída.");
  }

  return (
    <AppShell>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Organização</p>
          <h1 className="mt-1 truncate font-display text-2xl font-semibold sm:text-3xl">Categorias</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {categories.length} categorias · {usedCount} em uso · totais de {monthLabel(selectedMonth)}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="glass" aria-label="Transferir lançamentos" title="Transferir lançamentos" onClick={() => openTransfer(null)} disabled={categories.length < 2}>
            <ArrowRightLeft /><span className="hidden sm:inline">Transferir lançamentos</span>
          </Button>
          <Button onClick={openCreate}>
            <Plus /><span className="hidden sm:inline">Nova categoria</span><span className="sm:hidden">Nova</span>
          </Button>
        </div>
      </div>

      <section className="glass-panel mt-6 grid gap-3 rounded-[24px] p-4 sm:grid-cols-[1fr_220px] sm:rounded-[28px] sm:p-5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar categoria" aria-label="Buscar categoria" />
        </div>
        <select className={selectClass} value={kindFilter} onChange={(e) => setKindFilter(e.target.value as KindFilter)} aria-label="Filtrar por tipo">
          <option className="bg-background" value="all">Todos os tipos</option>
          <option className="bg-background" value="expense">Despesas</option>
          <option className="bg-background" value="income">Receitas</option>
        </select>
      </section>

      <section className="glass-panel mt-4 overflow-hidden rounded-[24px] sm:rounded-[28px]">
        <div className="hidden grid-cols-[1.4fr_.8fr_.8fr_auto] gap-4 border-b border-border px-5 py-3 text-xs text-muted-foreground md:grid">
          <span>Categoria</span><span>Lançamentos</span><span>Gastos no mês</span><span>Ações</span>
        </div>
        <div className="divide-y divide-border">
          {visible.map((c) => {
            const s = statOf(c.name);
            const color = colorOf(c.color);
            return (
              <article key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-4 md:grid-cols-[1.4fr_.8fr_.8fr_auto] md:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${color.soft} ${color.text}`}><Tags className="size-4" /></span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{categoryKindLabel(c.kind)}</span>
                      {c.is_system && <span className="inline-flex items-center gap-1 rounded-full bg-glass px-2 py-0.5"><ShieldCheck className="size-3" />Padrão</span>}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm md:text-left">
                  {s.count > 0 ? (
                    <Link to="/lancamentos" search={{ cartao: "", mes: "", categoria: c.name }} className="underline-offset-4 hover:underline">
                      {s.count} lançamento{s.count === 1 ? "" : "s"}
                    </Link>
                  ) : <span className="text-muted-foreground">Sem lançamentos</span>}
                </div>
                <div className="hidden font-display text-sm md:block">{money(s.monthCents / 100)}</div>
                <div className="col-span-2 flex gap-2 md:col-span-1 md:gap-1">
                  <Button className="min-h-11 min-w-11 md:min-h-9 md:min-w-9" size="icon" variant="glass" onClick={() => openEdit(c)} title="Editar" aria-label={`Editar ${c.name}`}><Pencil /></Button>
                  <Button className="min-h-11 min-w-11 md:min-h-9 md:min-w-9" size="icon" variant="glass" onClick={() => openTransfer(c)} disabled={s.count === 0} title="Transferir lançamentos" aria-label={`Transferir lançamentos de ${c.name}`}><ArrowRightLeft /></Button>
                  <Button className="min-h-11 min-w-11 md:min-h-9 md:min-w-9" size="icon" variant="glass" onClick={() => setPendingDelete(c)} disabled={c.is_system} title={c.is_system ? "Categoria padrão não pode ser excluída" : "Excluir"} aria-label={`Excluir ${c.name}`}><Trash2 /></Button>
                </div>
              </article>
            );
          })}
          {visible.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-muted-foreground">
              {categories.length === 0 ? "Nenhuma categoria ainda." : "Nenhuma categoria encontrada."}
              <div className="mt-3"><Button size="sm" onClick={openCreate}><Plus />Criar categoria</Button></div>
            </div>
          )}
        </div>
      </section>

      {formOpen && <CategoryDialog
        key={editing?.id ?? "new"}
        open={formOpen}
        onOpenChange={(v) => { setFormOpen(v); if (!v) setEditing(null); }}
        category={editing}
        categories={categories}
        usage={editing ? statOf(editing.name).count : 0}
        onSave={save}
      />}

      <TransferDialog
        key={`transfer-${transferFrom?.id ?? "none"}-${transferOpen}`}
        open={transferOpen}
        onOpenChange={(v) => { setTransferOpen(v); if (!v) setTransferFrom(null); }}
        initialFrom={transferFrom}
        categories={categories}
        countOf={(name) => statOf(name).count}
        onConfirm={transfer}
      />

      <DeleteDialog
        key={`delete-${pendingDelete?.id ?? "none"}`}
        category={pendingDelete}
        onClose={() => setPendingDelete(null)}
        categories={categories}
        count={pendingDelete ? statOf(pendingDelete.name).count : 0}
        onConfirm={remove}
      />
    </AppShell>
  );
}

function CategoryDialog({ open, onOpenChange, category, categories, usage, onSave }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: FinanceCategory | null;
  categories: FinanceCategory[];
  usage: number;
  onSave: (draft: Draft) => Promise<void>;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? "brand");
  const [kind, setKind] = useState(category?.kind ?? "expense");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isSystem = Boolean(category?.is_system);
  const clean = normalizeCategoryName(name);
  const renaming = Boolean(category && !isSystem && clean && clean !== category.name);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = isSystem ? "" : categoryNameError(clean, categories, category?.id);
    if (problem) { setError(problem); return; }
    setSaving(true); setError("");
    try {
      await onSave({ name: isSystem && category ? category.name : clean, color, kind });
      onOpenChange(false);
    } catch (err) {
      setError(categoryErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] border-glass-border bg-background/95 text-foreground backdrop-blur-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle>
          <DialogDescription>
            {category ? "Alterações no nome são aplicadas a todos os lançamentos desta categoria." : "Crie uma categoria para organizar seus lançamentos."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input id="category-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={CATEGORY_NAME_MAX} disabled={isSystem} required autoFocus placeholder="Ex.: Pets" />
            {isSystem && <p className="text-xs text-muted-foreground">Categoria padrão: o nome não pode ser alterado.</p>}
            {renaming && usage > 0 && <p className="text-xs text-warning">{usage} lançamento(s) passarão a usar "{clean}".</p>}
          </div>
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Cor da categoria">
              {Object.entries(cardColors).map(([key, c]) => (
                <Button variant="glass" size="icon" key={key} type="button" role="radio" aria-checked={color === key} aria-label={c.label} title={c.label} onClick={() => setColor(key)}
                  className={`grid size-9 place-items-center rounded-full border transition ${color === key ? "border-foreground" : "border-glass-border"}`}>
                  <span className={`size-5 rounded-full ${c.bar}`} />
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category-kind">Usar em</Label>
            <select id="category-kind" className={selectClass} value={kind} onChange={(e) => setKind(e.target.value)} disabled={isSystem}>
              {categoryKindOptions.map((o) => <option key={o.value} className="bg-background" value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button className="w-full" disabled={saving}>{saving ? "Salvando..." : category ? "Salvar alterações" : "Criar categoria"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ open, onOpenChange, initialFrom, categories, countOf, onConfirm }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFrom: FinanceCategory | null;
  categories: FinanceCategory[];
  countOf: (name: string) => number;
  onConfirm: (fromId: string, toId: string, deleteSource: boolean) => Promise<void>;
}) {
  const fallback = systemCategory(categories);
  const [from, setFrom] = useState(initialFrom?.id ?? "");
  const [to, setTo] = useState(fallback && fallback.id !== initialFrom?.id ? fallback.id : "");
  const [deleteSource, setDeleteSource] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fromCat = categories.find((c) => c.id === from);
  const toCat = categories.find((c) => c.id === to);
  const count = fromCat ? countOf(fromCat.name) : 0;

  async function confirm() {
    if (!fromCat || !toCat) { setError("Escolha a origem e o destino."); return; }
    if (fromCat.id === toCat.id) { setError("Escolha um destino diferente da origem."); return; }
    if (count === 0 && !deleteSource) { setError("A categoria de origem não tem lançamentos."); return; }
    setBusy(true); setError("");
    try {
      await onConfirm(fromCat.id, toCat.id, deleteSource && !fromCat.is_system);
      onOpenChange(false);
    } catch (err) {
      setError(categoryErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="w-[calc(100%-1.5rem)] border-glass-border bg-background/95 text-foreground backdrop-blur-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir lançamentos</DialogTitle>
          <DialogDescription>Move todos os lançamentos de uma categoria para outra (inclusive parcelas e recorrências futuras).</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transfer-from">De</Label>
            <select id="transfer-from" className={selectClass} value={from} onChange={(e) => { setFrom(e.target.value); if (e.target.value === to) setTo(""); }}>
              <option className="bg-background" value="">Selecione</option>
              {categories.map((c) => <option key={c.id} className="bg-background" value={c.id}>{c.name} ({countOf(c.name)})</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="transfer-to">Para</Label>
            <select id="transfer-to" className={selectClass} value={to} onChange={(e) => setTo(e.target.value)}>
              <option className="bg-background" value="">Selecione</option>
              {categories.filter((c) => c.id !== from).map((c) => <option key={c.id} className="bg-background" value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className={`flex items-center gap-3 rounded-2xl border border-glass-border bg-glass px-4 py-3 text-sm ${fromCat?.is_system ? "opacity-50" : "cursor-pointer"}`}>
            <input type="checkbox" className="size-4" checked={deleteSource && !fromCat?.is_system} disabled={!fromCat || fromCat.is_system} onChange={(e) => setDeleteSource(e.target.checked)} />
            <span>Excluir a categoria de origem depois de transferir</span>
          </label>
          {fromCat && toCat && (
            <p className="rounded-2xl border border-warning/25 bg-warning/10 p-3 text-sm">
              {count} lançamento(s) de <strong>{fromCat.name}</strong> passarão para <strong>{toCat.name}</strong>
              {deleteSource && !fromCat.is_system ? ` e "${fromCat.name}" será excluída` : ""}.
            </p>
          )}
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button className="w-full" disabled={busy || !fromCat || !toCat} onClick={() => void confirm()}>
            <ArrowRightLeft />{busy ? "Transferindo..." : "Transferir"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ category, onClose, categories, count, onConfirm }: {
  category: FinanceCategory | null;
  onClose: () => void;
  categories: FinanceCategory[];
  count: number;
  onConfirm: (category: FinanceCategory, transferTo?: string) => Promise<void>;
}) {
  const options = categories.filter((c) => c.id !== category?.id);
  const fallback = systemCategory(options) ?? options[0] ?? null;
  const [to, setTo] = useState(fallback?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    if (!category) return;
    if (count > 0 && !to) { setError("Escolha para onde transferir os lançamentos."); return; }
    setBusy(true); setError("");
    try {
      await onConfirm(category, count > 0 ? to : undefined);
      onClose();
    } catch (err) {
      setError(categoryErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={Boolean(category)} onOpenChange={(v) => { if (!v && !busy) onClose(); }}>
      <AlertDialogContent className="border-glass-border bg-background/95 text-foreground backdrop-blur-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir a categoria {category?.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {count > 0
              ? `Esta categoria tem ${count} lançamento(s). Eles serão transferidos para a categoria escolhida abaixo antes da exclusão.`
              : "Ela não tem lançamentos. Esta ação não pode ser desfeita."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {count > 0 && (
          <div className="space-y-2">
            <Label htmlFor="delete-to">Transferir lançamentos para</Label>
            <select id="delete-to" className={selectClass} value={to} onChange={(e) => setTo(e.target.value)}>
              {options.map((c) => <option key={c.id} className="bg-background" value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" disabled={busy || (count > 0 && !to)} onClick={() => void confirm()}>
            {busy ? "Excluindo..." : count > 0 ? "Transferir e excluir" : "Excluir categoria"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
