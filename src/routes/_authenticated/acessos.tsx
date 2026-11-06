import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Clock3, Search, ShieldBan, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/finance/app-shell";
import { accessDb, useAccess, type AccessRow, type AccessStatus } from "@/components/finance/access-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/acessos")({
  head: () => ({ meta: [{ title: "Acessos — Coach Finance BR" }, { name: "description", content: "Libere ou bloqueie o acesso de novas contas." }, { name: "robots", content: "noindex" }] }),
  component: AccessPage,
});

const labels: Record<AccessStatus, string> = { pending: "Pendente", approved: "Liberado", blocked: "Bloqueado" };
const tones: Record<AccessStatus, string> = {
  pending: "border-warning/30 bg-warning/10 text-warning",
  approved: "border-success/30 bg-success/10 text-success",
  blocked: "border-danger/30 bg-danger/10 text-danger",
};
const formatDate = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

function AccessPage() {
  const me = useAccess();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<AccessStatus | "all">("pending");
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ["access-list"],
    enabled: me.data?.isAdmin === true,
    queryFn: async () => {
      const r = await accessDb.from("user_access").select("user_id,email,name,status,requested_at,decided_at,approval_seen_at").order("requested_at", { ascending: false });
      if (r.error) throw r.error;
      return (r.data ?? []) as AccessRow[];
    },
  });

  async function change(row: AccessRow, status: AccessStatus) {
    setBusy(row.user_id);
    try {
      const r = await accessDb.rpc("set_user_access", { p_user: row.user_id, p_status: status });
      if (r.error) throw r.error;
      toast.success(status === "approved" ? `Acesso liberado para ${row.email ?? "a conta"}.` : status === "blocked" ? "Conta bloqueada." : "Conta voltou para pendente.");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["access-list"] }), queryClient.invalidateQueries({ queryKey: ["access"] })]);
    } catch {
      toast.error("Não foi possível alterar o acesso.");
    } finally {
      setBusy(null);
    }
  }

  if (me.isLoading) return <AppShell><p className="text-sm text-muted-foreground">Carregando...</p></AppShell>;
  if (!me.data?.isAdmin) return <AppShell><section className="glass-panel rounded-2xl p-6"><h1 className="font-display text-lg font-semibold">Página restrita</h1><p className="mt-2 text-sm text-muted-foreground">Somente o administrador pode gerenciar acessos.</p></section></AppShell>;

  const rows = (list.data ?? []).filter((r) => (filter === "all" || r.status === filter) && (!term || `${r.email ?? ""} ${r.name ?? ""}`.toLowerCase().includes(term.toLowerCase())));
  const counts = (list.data ?? []).reduce((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {} as Record<string, number>);

  return <AppShell>
    <section className="glass-panel rounded-[24px] p-4 sm:rounded-[28px] sm:p-6">
      <h1 className="font-display text-xl font-semibold">Acessos</h1>
      <p className="mt-1 text-sm text-muted-foreground">Novas contas ficam pendentes até você liberar. Contas pendentes ou bloqueadas não conseguem ver nem salvar dados.</p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {(["pending", "approved", "blocked", "all"] as const).map((key) => <Button key={key} size="sm" variant={filter === key ? "default" : "glass"} onClick={() => setFilter(key)}>
          {key === "all" ? "Todas" : labels[key]}{key !== "all" && ` (${counts[key] ?? 0})`}
        </Button>)}
        <div className="relative ml-auto w-full sm:w-64"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por e-mail ou nome" aria-label="Buscar conta" value={term} onChange={(e) => setTerm(e.target.value)} /></div>
      </div>
      {list.isLoading && <p className="mt-6 text-sm text-muted-foreground">Carregando contas...</p>}
      {list.isError && <p className="mt-6 text-sm text-danger">Não foi possível carregar as contas.</p>}
      {!list.isLoading && rows.length === 0 && <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" />Nenhuma conta nesta lista.</p>}
      <ul className="mt-5 space-y-2.5">
        {rows.map((row) => <li key={row.user_id} className="flex flex-col gap-3 rounded-2xl border border-glass-border bg-glass p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><span className="truncate font-medium">{row.email ?? "(sem e-mail)"}</span><span className={`rounded-full border px-2 py-0.5 text-[11px] ${tones[row.status]}`}>{labels[row.status]}</span></div>
            <p className="mt-1 text-xs text-muted-foreground">{row.name ? `${row.name} · ` : ""}Cadastro em {formatDate(row.requested_at)}{row.decided_at ? ` · Decisão em ${formatDate(row.decided_at)}` : ""}</p>
          </div>
          {row.user_id !== me.data?.access?.user_id && <div className="flex shrink-0 flex-wrap gap-2">
            {row.status !== "approved" && <Button size="sm" disabled={busy === row.user_id} onClick={() => void change(row, "approved")}><Check />Liberar</Button>}
            {row.status !== "blocked" && <Button size="sm" variant="glass" disabled={busy === row.user_id} onClick={() => void change(row, "blocked")}><ShieldBan />Bloquear</Button>}
            {row.status === "blocked" && <Button size="sm" variant="glass" disabled={busy === row.user_id} onClick={() => void change(row, "pending")}><Undo2 />Voltar a pendente</Button>}
          </div>}
        </li>)}
      </ul>
    </section>
  </AppShell>;
}
