import { useEffect, useState } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS_KEY = "cfb-install-hint-dismissed";

function isStandalone() {
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

/** Convida a instalar o app na tela inicial (iPhone: instruções; Android: botão nativo). */
export function InstallHint() {
  const [mode, setMode] = useState<"ios" | "android" | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    try {
      if (isStandalone() || localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch { /* armazenamento indisponível: segue mostrando */ }
    const ua = window.navigator.userAgent;
    const ios = /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
    if (ios) { setMode("ios"); return; }
    const onPrompt = (e: Event) => { e.preventDefault(); setPrompt(e as InstallPrompt); setMode("android"); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignora */ }
    setMode(null);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => undefined);
    setPrompt(null);
    dismiss();
  }

  if (!mode) return null;
  return <div role="note" className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm md:hidden">
    <img src="/apple-touch-icon.png" alt="" className="size-10 shrink-0 rounded-xl" />
    <div className="min-w-0 flex-1">
      <p className="font-semibold">Instale o Coach Finance no celular</p>
      {mode === "ios"
        ? <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Toque em <Share className="inline size-3.5 align-[-2px]" /> <strong className="text-foreground">Compartilhar</strong> e depois em <SquarePlus className="inline size-3.5 align-[-2px]" /> <strong className="text-foreground">Adicionar à Tela de Início</strong>. Ele abre em tela cheia, como um aplicativo.</p>
        : <><p className="mt-1 text-xs text-muted-foreground">Abra em tela cheia, direto da tela inicial.</p><Button size="sm" className="mt-2" onClick={() => void install()}><Download />Instalar app</Button></>}
    </div>
    <button type="button" onClick={dismiss} aria-label="Fechar aviso de instalação" className="-mr-1 rounded-md p-1 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
  </div>;
}
