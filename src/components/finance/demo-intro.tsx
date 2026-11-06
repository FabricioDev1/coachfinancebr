import { Link } from "@tanstack/react-router";
import { BellRing, CreditCard, Info, PiggyBank, Sparkles, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

const benefits = [
  { icon: CreditCard, title: "Fatura certa de cada cartão", text: "Cada compra cai na fatura correta, conforme o fechamento e o vencimento do cartão." },
  { icon: Sparkles, title: "Lançamento por voz ou texto", text: "Diga \"gastei 60 na barbearia no Nubank\" e o assistente monta a despesa para você confirmar." },
  { icon: PiggyBank, title: "Quanto você ainda pode gastar", text: "Saldo do mês, reserva de emergência separada e parcelas futuras em uma só tela." },
  { icon: BellRing, title: "Contas sob controle", text: "Veja o que vence nos próximos dias e o que já está atrasado." },
] as const;

const steps = [
  "Crie sua conta grátis",
  "Cadastre seus cartões",
  "Lance seus gastos e receitas",
  "Acompanhe saldo e faturas",
] as const;

/** Apresentação exibida na visão geral para quem ainda não entrou na conta. */
export function DemoIntro() {
  return <section aria-labelledby="demo-intro-title" className="glass-panel mb-4 overflow-hidden rounded-[24px] p-5 sm:rounded-[28px] sm:p-7">
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-medium text-warning"><Info className="size-3.5" />Modo demonstração</span>
        <h2 id="demo-intro-title" className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">Seu controle financeiro, simples e na palma da mão</h2>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">Os valores e lançamentos abaixo são <strong className="text-foreground">apenas ilustrativos</strong>, para você conhecer como a ferramenta funciona. Nada do que você fizer aqui fica salvo.</p>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">Para registrar e guardar <strong className="text-foreground">os seus dados</strong>, crie uma conta. É grátis e leva menos de um minuto.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild size="lg"><a href="/auth?cadastro=1"><UserPlus />Criar conta grátis</a></Button>
          <Button asChild size="lg" variant="glass"><Link to="/auth">Já tenho conta</Link></Button>
        </div>
        <ol className="mt-6 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {steps.map((step, index) => <li key={step} className="flex items-center gap-2 rounded-xl border border-glass-border bg-glass p-2.5"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/20 font-semibold text-primary">{index + 1}</span><span className="min-w-0 leading-snug">{step}</span></li>)}
        </ol>
      </div>
      <ul className="grid gap-2.5 sm:grid-cols-2">
        {benefits.map(({ icon: Icon, title, text }) => <li key={title} className="rounded-2xl border border-glass-border bg-glass p-4">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary/30 to-accent/20 text-primary"><Icon className="size-4.5" /></span>
          <h3 className="mt-3 font-display text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
        </li>)}
      </ul>
    </div>
  </section>;
}

/** Selo pequeno que marca um bloco como exemplo enquanto o usuário não entrou. */
export function DemoBadge() {
  return <span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning">Exemplo</span>;
}
