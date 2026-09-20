import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Entrar — Manager Finance" }, { name: "description", content: "Entre no Manager Finance para salvar e acompanhar sua vida financeira." }, { property: "og:title", content: "Entrar — Manager Finance" }, { property: "og:description", content: "Acesse seu controle financeiro pessoal." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/", replace: true });
    });
  }, [navigate]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget); const email = String(data.get("email") ?? "").trim(); const password = String(data.get("password") ?? "");
    if (!email.includes("@") || password.length < 8) { setMessage("Use um e-mail válido e uma senha com pelo menos 8 caracteres."); setBusy(false); return; }
    const result = signup
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    if (result.error) setMessage(result.error.message); else if (signup && !result.data.session) setMessage("Confira seu e-mail para confirmar o cadastro."); else await navigate({ to: "/" });
    setBusy(false);
  }
  async function google() { setBusy(true); const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin }); if (result.error) setMessage("Não foi possível entrar com Google."); setBusy(false); }
  return <main className="grid min-h-screen place-items-center px-4"><section className="glass-panel w-full max-w-md rounded-[28px] p-7"><div className="mb-7 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent"><WalletCards /></span><div><h1 className="font-display text-xl font-semibold">Manager Finance</h1><p className="text-sm text-muted-foreground">Seu dinheiro, mais claro.</p></div></div><form onSubmit={submit} className="space-y-4"><div><Label>E-mail</Label><Input className="mt-2" name="email" type="email" maxLength={255} required /></div><div><Label>Senha</Label><Input className="mt-2" name="password" type="password" minLength={8} maxLength={72} required /></div>{message && <p className="text-sm text-warning">{message}</p>}<Button className="w-full" size="lg" disabled={busy}>{signup ? "Criar conta" : "Entrar"}</Button></form><div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>ou<span className="h-px flex-1 bg-border"/></div><Button variant="glass" className="w-full" onClick={google} disabled={busy}>Continuar com Google</Button><button className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "Já tenho uma conta" : "Criar uma conta grátis"}</button></section></main>;
}