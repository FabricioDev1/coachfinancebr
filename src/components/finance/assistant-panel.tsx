import {useEffect,useRef,useState} from 'react';
import {Mic,MicOff,Sparkles,Send} from 'lucide-react';
import {useServerFn} from '@tanstack/react-start';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Textarea} from '@/components/ui/textarea';
import {useFinance} from './finance-provider';
import {TransactionDialog} from './transaction-dialog';
import {interpretExpense} from '@/lib/assistant.functions';
import type {AssistantDraft} from '@/lib/assistant-drafts';
import {invoiceDueDate} from '@/lib/card-invoice';
import {formatDateBR} from '@/lib/dates';

const methodLabel:Record<string,string>={credit:'Cartão de crédito',debit:'Débito',pix:'Pix',cash:'Dinheiro'};
type SpeechCtor=new()=>{lang:string;interimResults:boolean;onresult:(e:{results:ArrayLike<ArrayLike<{transcript:string}>>})=>void;onend:()=>void;onerror:()=>void;start:()=>void;stop:()=>void};

export function AssistantButton(){
 const {signedIn}=useFinance();const [open,setOpen]=useState(false);
 return <>
  <Button variant="glass" size="pill" className={signedIn?'hidden md:inline-flex':undefined} disabled={!signedIn} onClick={()=>setOpen(true)} aria-label={signedIn?'Assistente de lançamentos':'Entre para usar o assistente'} title={signedIn?'Assistente de lançamentos':'Entre para usar o assistente'}><Sparkles/><span className="hidden lg:inline">{signedIn?'Assistente':'Entre para usar o assistente'}</span></Button>
  {signedIn&&!open&&<button type="button" onClick={()=>setOpen(true)} aria-label="Abrir assistente de lançamentos" className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-primary to-accent px-5 font-semibold text-primary-foreground shadow-glass ring-1 ring-white/20 transition-transform active:scale-95 md:hidden"><Sparkles className="size-5"/>Assistente</button>}
  {signedIn&&<AssistantPanel open={open} onOpenChange={setOpen}/>}
 </>;
}

/** Acompanha a área visível acima do teclado no celular (iOS/Chrome), para o painel não ficar escondido. */
function useKeyboardViewport(active:boolean){
 const [box,setBox]=useState<{top:number;height:number}|null>(null);
 useEffect(()=>{
  const vv=typeof window!=='undefined'?window.visualViewport:null;
  if(!active||!vv){setBox(null);return;}
  const update=()=>setBox(window.innerWidth<640?{top:vv.offsetTop,height:vv.height}:null);
  update();vv.addEventListener('resize',update);vv.addEventListener('scroll',update);
  return()=>{vv.removeEventListener('resize',update);vv.removeEventListener('scroll',update);};
 },[active]);
 return box;
}

function AssistantPanel({open,onOpenChange}:{open:boolean;onOpenChange:(v:boolean)=>void}){
 const {cards,addTransaction,money}=useFinance();const interpret=useServerFn(interpretExpense);
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[question,setQuestion]=useState(''),[drafts,setDrafts]=useState<AssistantDraft[]>([]),[editing,setEditing]=useState<AssistantDraft|null>(null),[listening,setListening]=useState(false),[speech,setSpeech]=useState<SpeechCtor|null>(null);
 const rec=useRef<InstanceType<SpeechCtor>|null>(null);
 const box=useKeyboardViewport(open);
 const mobileStyle=box?{top:box.top+8,maxHeight:box.height-16}:undefined;
 useEffect(()=>{const w=window as unknown as {SpeechRecognition?:SpeechCtor;webkitSpeechRecognition?:SpeechCtor};setSpeech(()=>w.SpeechRecognition??w.webkitSpeechRecognition??null);},[]);
 function toggleMic(){if(!speech)return;if(listening){rec.current?.stop();return;}const r=new speech();r.lang='pt-BR';r.interimResults=false;r.onresult=e=>{const t=Array.from(e.results).map(x=>x[0]?.transcript??'').join(' ');setText(v=>(v?v+' ':'')+t.trim());};r.onend=()=>setListening(false);r.onerror=()=>setListening(false);rec.current=r;setListening(true);r.start();}
 async function send(){if(busy||text.trim().length<2)return;setBusy(true);setQuestion('');setDrafts([]);try{const r=await interpret({data:{text}});if(r.kind==='drafts')setDrafts(r.drafts);else if(r.kind==='question')setQuestion(r.question);else setQuestion(r.message);}catch{setQuestion('Não foi possível usar o assistente agora.');}finally{setBusy(false);}}
 function toValue(d:AssistantDraft){const card=cards.find(c=>c.id===d.card_id);return {description:d.description,amount:d.amount,transaction_type:'expense',card_id:d.payment_method==='credit'?d.card_id:null,issue_date:d.issue_date,due_date:d.issue_date,payment_method:d.payment_method,payment_source:card?card.name:d.payment_method==='cash'?'Carteira':'Conta principal',category:d.category,status:d.payment_method==='credit'?'pending':'paid',installment_count:d.installment_count,recurrence:d.recurrence,recurrence_months:d.recurrence_months};}
 async function confirm(i:number){const d=drafts[i];if(!d)return;try{await addTransaction(toValue(d));setDrafts(x=>x.filter((_,j)=>j!==i));toast.success('Despesa lançada.');}catch(e){toast.error(e instanceof Error?e.message:'Não foi possível salvar.');}}
 return <>
 <Dialog open={open} onOpenChange={onOpenChange}><DialogContent style={mobileStyle} onOpenAutoFocus={e=>e.preventDefault()} className="max-h-[calc(100dvh-1.5rem)] w-[calc(100%-1.5rem)] gap-3 overflow-y-auto overscroll-contain border-glass-border bg-background/95 p-4 text-foreground backdrop-blur-2xl max-sm:top-2 max-sm:translate-y-0 sm:max-w-xl sm:gap-4 sm:p-6">
  <DialogHeader className="pr-6 text-left"><DialogTitle>Assistente de lançamentos</DialogTitle><DialogDescription>Por enquanto o assistente registra apenas despesas.</DialogDescription><details className="text-xs text-muted-foreground"><summary className="cursor-pointer select-none">Ver exemplos</summary><ul className="mt-1 list-disc space-y-0.5 pl-4"><li>gastei 60 reais no cartão Nubank na barbearia, categoria Outros</li><li>mercado 85,90 no pix ontem</li><li>notebook 3000 em 10x no Inter</li></ul></details></DialogHeader>
  <div className="space-y-2">
   <Textarea aria-label="Mensagem para o assistente" rows={3} className="max-h-40 resize-none" enterKeyHint="send" onFocus={e=>{const el=e.currentTarget;setTimeout(()=>el.scrollIntoView({block:'nearest'}),300);}} value={text} maxLength={500} onChange={e=>setText(e.target.value)} placeholder="Descreva a despesa..." onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send();}}}/>
   <div className="flex items-center gap-2">{speech?<Button type="button" variant="glass" size="icon" onClick={toggleMic} aria-label={listening?'Parar gravação':'Falar'}>{listening?<MicOff/>:<Mic/>}</Button>:<p className="text-xs text-muted-foreground">Seu navegador não suporta voz; digite a mensagem.</p>}<Button className="ml-auto" onClick={()=>void send()} disabled={busy||text.trim().length<2}><Send/>{busy?'Interpretando...':'Enviar'}</Button></div>
  </div>
  {question&&<p role="status" className="glass-panel rounded-xl p-3 text-sm">{question}</p>}
  {drafts.map((d,i)=>{const card=cards.find(c=>c.id===d.card_id);const due=card?invoiceDueDate(d.issue_date,card.closing_day,card.due_day):d.issue_date;return <section key={i} className="glass-panel space-y-2 rounded-xl p-3 text-sm">
   <p className="font-semibold">{d.description} · {money(d.amount)}</p>
   <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-muted-foreground"><dt>Pagamento</dt><dd>{methodLabel[d.payment_method]}{card?` · ${card.name}`:''}</dd><dt>Categoria</dt><dd>{d.category}</dd><dt>Competência</dt><dd>{formatDateBR(d.issue_date)}</dd><dt>Vencimento</dt><dd>{formatDateBR(due)}</dd><dt>Parcelas</dt><dd>{d.installment_count}x</dd><dt>Recorrência</dt><dd>{d.recurrence==='monthly'?`Mensal · ${d.recurrence_months} meses`:'Nenhuma'}</dd></dl>
   <div className="flex flex-wrap gap-2"><Button size="sm" onClick={()=>void confirm(i)}>Confirmar</Button><Button size="sm" variant="glass" onClick={()=>setEditing(d)}>Editar</Button><Button size="sm" variant="glass" onClick={()=>setDrafts(x=>x.filter((_,j)=>j!==i))}>Cancelar</Button></div>
  </section>;})}
 </DialogContent></Dialog>
 <TransactionDialog open={!!editing} draft={editing} onOpenChange={v=>{if(!v){if(editing)setDrafts(x=>x.filter(y=>y!==editing));setEditing(null);}}}/>
 </>;
}
