import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, CalendarRange, CreditCard, ListFilter, LogIn, LogOut, Menu, Plus, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useFinance } from "@/components/finance/finance-provider";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/", label: "Visão geral", icon: BarChart3 },
  { to: "/lancamentos", label: "Lançamentos", icon: ListFilter },
  { to: "/cartoes", label: "Cartões", icon: CreditCard },
  { to: "/planejamento", label: "Planejamento", icon: CalendarRange },
] as const;

function NavLinks({ mobile = false }: { mobile?: boolean }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return <nav aria-label="Navegação principal" className={mobile ? "grid gap-2" : "hidden items-center gap-1 md:flex"}>{nav.map(({ to, label, icon: Icon }) => {
    const active = pathname === to;
    return <Link key={to} to={to} className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm transition-colors ${active ? "bg-glass-strong text-foreground" : "text-muted-foreground hover:text-foreground"}`}><Icon className="size-4" />{label}</Link>;
  })}</nav>;
}

export function AppShell({ children, onNew }: { children: ReactNode; onNew?: () => void }) {
  const { signedIn, loading } = useFinance();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }
  if (loading) return <main className="grid min-h-screen place-items-center px-4"><p className="text-sm text-muted-foreground">Carregando seus dados...</p></main>;
  return <div className="relative min-h-screen overflow-x-hidden">
    <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-7">
      <header className="flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent font-display text-sm font-bold text-primary-foreground shadow-glass"><WalletCards className="size-5" /></span>
          <span className="leading-tight"><span className="block font-display text-base font-semibold">Fintra</span><span className="block text-[11px] text-muted-foreground">Controle financeiro</span></span>
        </Link>
        <NavLinks />
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-glass-border bg-glass px-3 py-2 text-xs text-muted-foreground backdrop-blur-xl sm:inline">Set • Out • Nov</span>
          {onNew && <Button variant="light" size="pill" onClick={onNew}><Plus /> <span className="hidden sm:inline">Novo lançamento</span></Button>}
          {signedIn ? <Button variant="glass" size="icon" onClick={() => void signOut()} title="Sair" aria-label="Sair da conta"><LogOut /></Button> : <Button asChild variant="glass" size="icon"><Link to="/auth" title="Entrar" aria-label="Entrar"><LogIn /></Link></Button>}
          <Sheet>
            <SheetTrigger asChild><Button className="md:hidden" variant="glass" size="icon" aria-label="Abrir menu"><Menu /></Button></SheetTrigger>
            <SheetContent className="border-glass-border bg-background/95 text-foreground backdrop-blur-2xl"><SheetTitle className="mb-6 font-display">Fintra</SheetTitle><NavLinks mobile /></SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="finance-enter mt-6 pb-24">{children}</main>
    </div>
    <nav aria-label="Navegação inferior" className="fixed inset-x-3 bottom-3 z-40 grid grid-cols-4 rounded-2xl border border-glass-border bg-background/85 p-1.5 shadow-glass backdrop-blur-2xl md:hidden">{nav.map(({ to, label, icon: Icon }) => <Link key={to} to={to} activeProps={{ className: "bg-glass-strong text-foreground" }} inactiveProps={{ className: "text-muted-foreground" }} className="flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px]"><Icon className="size-4" /><span className="truncate">{label}</span></Link>)}</nav>
  </div>;
}