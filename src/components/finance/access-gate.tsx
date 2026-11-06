import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "@tanstack/react-router";
import { Clock3, PartyPopper, ShieldBan, ShieldCheck, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useFinance } from "./finance-provider";

/** As tabelas de acesso ainda não estão nos tipos gerados; usamos um cliente sem tipagem só aqui. */
export const accessDb = supabase as unknown as SupabaseClient;

export type AccessStatus = "pending" | "approved" | "blocked";
export type AccessRow = {
  user_id: string;
  email: string | null;
  name: string | null;
  status: AccessStatus;
  requested_at: string;
  decided_at: string | null;
  approval_seen_at: string | null;
};

export function useAccess() {
  const { userId } = useFinance();
  return useQuery({
    queryKey: ["access", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const [row, admin] = await Promise.all([
        accessDb.from("user_access").select("user_id,email,name,status,requested_at,decided_at,approval_seen_at").eq("user_id", userId!).maybeSingle(),
        accessDb.rpc("is_admin"),
      ]);
      if (row.error) throw row.error;
      if (admin.error) throw admin.error;
      const isAdmin = admin.data === true;
      const access = (row.data as AccessRow | null) ?? null;
      let pendingCount = 0;
      if (isAdmin) {
        const pending = await accessDb.from("user_access").select("user_id", { count: "exact", head: true }).eq("status", "pending");
        pendingCount = pending.count ?? 0;
      }
      return { access, isAdmin, pendingCount };
    },
  });
}

/** Mostra a tela de espera para contas não liberadas e o aviso de liberação na primeira entrada. */
export function AccessGate({ children, onSignOut }: { children: ReactNode; onSignOut: () => void }) {
  const { signedIn } = useFinance();
  const { data, isLoading, isError, refetch } = useAccess();
  const queryClient = useQueryClient();
  if (!signedIn) return <>{children}</>;
  if (isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Verificando seu acesso...</p>;
  if (isError || !data) return <section role="alert" className="glass-panel rounded-2xl p-6"><p>Não foi possível verificar seu acesso.</p><Button className="mt-4" onClick={() => void refetch()}>Tentar novamente</Button></section>;

  const status = data.isAdmin ? "approved" : data.access?.status ?? "pending";
  if (status !== "approved") {
    const blocked = status === "blocked";
    return <section className="glass-panel mx-auto max-w-lg rounded-[28px] p-6 text-center sm:p-8">
      <span className={`mx-auto grid size-14 place-items-center rounded-2xl ${blocked ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning"}`}>{blocked ? <ShieldBan className="size-7" /> : <Clock3 className="size-7" />}</span>
      <h1 className="mt-4 font-display text-xl font-semibold">{blocked ? "Acesso não liberado" : "Cadastro recebido!"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{blocked
        ? "Sua conta não está liberada para usar o Coach Finance BR. Se acha que isso é um engano, fale com o responsável pela plataforma."
        : "Sua conta foi criada e está aguardando liberação. Assim que ela for aprovada, você poderá registrar e salvar seus dados. Volte aqui mais tarde."}</p>
      {data.access?.email && <p className="mt-3 text-xs text-muted-foreground">Conta: {data.access.email}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {!blocked && <Button variant="glass" onClick={() => void refetch()}>Verificar novamente</Button>}
        <Button variant="glass" onClick={onSignOut}>Sair</Button>
      </div>
    </section>;
  }

  const showWelcome = !data.isAdmin && data.access && !data.access.approval_seen_at;
  async function dismissWelcome() {
    await accessDb.rpc("mark_access_approval_seen");
    await queryClient.invalidateQueries({ queryKey: ["access"] });
  }
  return <>
    {showWelcome && <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm">
      <PartyPopper className="mt-0.5 size-5 shrink-0 text-success" />
      <div className="min-w-0 flex-1"><p className="font-semibold">Seu acesso foi liberado!</p><p className="mt-0.5 text-xs text-muted-foreground">Agora você pode cadastrar seus cartões e lançar seus gastos. Bom controle financeiro!</p></div>
      <button type="button" onClick={() => void dismissWelcome()} aria-label="Fechar aviso" className="rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
    </div>}
    {children}
  </>;
}

/** Atalho do administrador para a página de acessos, com o número de pedidos pendentes. */
export function AdminAccessLink() {
  const { data } = useAccess();
  if (!data?.isAdmin) return null;
  const count = data.pendingCount;
  return <Button asChild variant="glass" size="icon" className="relative">
    <Link to="/acessos" aria-label={count ? `Acessos: ${count} pendentes` : "Acessos"} title="Liberar acessos">
      <ShieldCheck />
      {count > 0 && <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">{count}</span>}
    </Link>
  </Button>;
}
