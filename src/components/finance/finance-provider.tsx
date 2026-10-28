import {createContext,useCallback,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {brl,shortBrl,demoCards,demoIncomes,demoTransactions,type FinanceCard,type FinanceIncome,type FinanceTransaction} from '@/lib/finance-data';
import {currentMonthKey,todayISO} from '@/lib/dates';
import {transactionRows,extendIndefinite,type NewTransaction} from '@/lib/transaction-series';
type NewCard=Omit<FinanceCard,'id'>;type NewIncome=Omit<FinanceIncome,'id'>;
type FinanceContextValue={cards:FinanceCard[];incomes:FinanceIncome[];transactions:FinanceTransaction[];signedIn:boolean;loading:boolean;loadError:string|null;reload:()=>Promise<void>;userId:string|null;selectedMonth:string;setSelectedMonth:(key:string)=>void;hideValues:boolean;toggleHideValues:()=>void;money:(value:number,opts?:{short?:boolean})=>string;addTransaction:(value:NewTransaction)=>Promise<void>;updateTransaction:(id:string,value:NewTransaction)=>Promise<void>;addCard:(value:NewCard)=>Promise<void>;updateCard:(id:string,value:NewCard)=>Promise<void>;addIncome:(value:NewIncome)=>Promise<void>;updateIncome:(id:string,value:NewIncome)=>Promise<void>;removeIncome:(id:string)=>Promise<void>;togglePaid:(id:string)=>Promise<void>;markManyPaid:(ids:string[])=>Promise<void>;removeTransaction:(id:string,scope?:'single'|'series')=>Promise<void>;removeCard:(id:string)=>Promise<void>;exportAll:()=>{cards:FinanceCard[];incomes:FinanceIncome[];transactions:FinanceTransaction[]}};
const FinanceContext=createContext<FinanceContextValue|null>(null);
const cloudAvailable=Boolean(import.meta.env['VITE_SUPABASE_URL']&&import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY']);
const cardFields='id,name,credit_limit,closing_day,due_day,color';const incomeFields='id,description,amount,reference_month,received_date,status,is_reserve';const transactionFields='id,parent_id,card_id,description,amount,transaction_type,issue_date,due_date,payment_method,payment_source,category,status,installment_number,installment_count,recurrence,recurrence_months';
export function FinanceProvider({children}:{children:ReactNode}) {
 const [cards,setCards]=useState<FinanceCard[]>(demoCards),[incomes,setIncomes]=useState<FinanceIncome[]>(demoIncomes),[transactions,setTransactions]=useState<FinanceTransaction[]>(demoTransactions);
 const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState<string|null>(null),[userId,setUserId]=useState<string|null>(null),[selectedMonth,setSelectedMonth]=useState(currentMonthKey),[hideValues,setHideValues]=useState(false);
 const activeUserId=useRef<string|null|undefined>(undefined),loadVersion=useRef(0),extending=useRef(false);
 useEffect(()=>{try{setHideValues(localStorage.getItem('cfb-hide-values')==='true');}catch{}},[]);
 const toggleHideValues=()=>setHideValues(v=>{try{localStorage.setItem('cfb-hide-values',String(!v));}catch{}return !v;});
 const money=(v:number,opts?:{short?:boolean})=>hideValues?'R$ •••••':(opts?.short?shortBrl:brl).format(v);
 const load=useCallback(async()=>{
  const version=++loadVersion.current;setLoading(true);setLoadError(null);
  try{
   let id:string|null=null;
   if(cloudAvailable){const {data,error}=await supabase.auth.getUser();if(error&&error.name!=='AuthSessionMissingError')throw error;id=data.user?.id??null;}
   if(version!==loadVersion.current)return;
   const changed=activeUserId.current!==id;activeUserId.current=id;setUserId(id);
   if(!id){if(changed){setCards(demoCards);setIncomes(demoIncomes);setTransactions(demoTransactions);}return;}
   if(changed){setCards([]);setIncomes([]);setTransactions([]);}
   const [c,i,t]=await Promise.all([supabase.from('cards').select(cardFields).eq('user_id',id).order('created_at'),supabase.from('incomes').select(incomeFields).eq('user_id',id).order('reference_month'),supabase.from('transactions').select(transactionFields).eq('user_id',id).order('due_date')]);
   if(c.error)throw c.error;if(i.error)throw i.error;if(t.error)throw t.error;
   if(version!==loadVersion.current)return;
   let loaded:FinanceTransaction[]=t.data??[];
   if(!extending.current){extending.current=true;try{for(const batch of extendIndefinite(loaded,todayISO())){if(version!==loadVersion.current)break;const result=await supabase.from('transactions').insert(batch.map(row=>({...row,user_id:id}))).select(transactionFields).eq('user_id',id);if(result.error){if(result.error.code==='23505'){const fresh=await supabase.from('transactions').select(transactionFields).eq('user_id',id).order('due_date');if(fresh.error)throw fresh.error;loaded=fresh.data??[];}else throw result.error;}else loaded=[...loaded,...(result.data??[])];}}finally{extending.current=false;}}
   if(version!==loadVersion.current)return;setCards(c.data??[]);setIncomes(i.data??[]);setTransactions(loaded);
  }catch{if(version===loadVersion.current)setLoadError('Não foi possível carregar seus dados.');}finally{if(version===loadVersion.current)setLoading(false);}
 },[]);
 useEffect(()=>{void load();if(!cloudAvailable)return;let timer:ReturnType<typeof setTimeout>|undefined;const {data}=supabase.auth.onAuthStateChange((event,session)=>{if(event!=='SIGNED_IN'&&event!=='SIGNED_OUT')return;const next=session?.user.id??null;if(next===activeUserId.current)return;clearTimeout(timer);timer=setTimeout(()=>void load(),0);});return()=>{clearTimeout(timer);++loadVersion.current;data.subscription.unsubscribe();};},[load]);
 function identity(){if(activeUserId.current===undefined||loading||loadError)throw new Error('Aguarde o carregamento dos dados.');return activeUserId.current;}
 function same(id:string|null){return activeUserId.current===id;}
 async function addCard(value:NewCard){const id=identity();let row={...value,id:crypto.randomUUID()};if(id){const r=await supabase.from('cards').insert({...row,user_id:id}).select(cardFields).eq('user_id',id).single();if(r.error)throw r.error;row=r.data;}if(same(id))setCards(c=>[...c,row]);}
 async function updateCard(id:string,value:NewCard){const owner=identity();if(owner){const r=await supabase.from('cards').update(value).eq('id',id).eq('user_id',owner).select('id').single();if(r.error)throw r.error;}if(same(owner))setCards(c=>c.map(t=>t.id===id?{...t,...value}:t));}
 async function addIncome(value:NewIncome){const id=identity();let row={...value,id:crypto.randomUUID()};if(id){const r=await supabase.from('incomes').insert({...row,user_id:id}).select(incomeFields).eq('user_id',id).single();if(r.error)throw r.error;row=r.data;}if(same(id))setIncomes(c=>[...c,row]);}
 async function updateIncome(id:string,value:NewIncome){const owner=identity();if(owner){const r=await supabase.from('incomes').update(value).eq('id',id).eq('user_id',owner).select('id').single();if(r.error)throw r.error;}if(same(owner))setIncomes(c=>c.map(t=>t.id===id?{...t,...value}:t));}
 async function removeIncome(id:string){const owner=identity();if(owner){const r=await supabase.from('incomes').delete().eq('id',id).eq('user_id',owner).select('id').single();if(r.error)throw r.error;}if(same(owner))setIncomes(c=>c.filter(t=>t.id!==id));}
 async function addTransaction(value:NewTransaction){const id=identity();let rows=transactionRows(value,cards);if(id){const r=await supabase.from('transactions').insert(rows.map(t=>({...t,user_id:id}))).select(transactionFields).eq('user_id',id);if(r.error)throw r.error;rows=r.data??[];}if(same(id))setTransactions(c=>[...c,...rows]);}
 async function updateTransaction(id:string,value:NewTransaction){const owner=identity(),current=transactions.find(t=>t.id===id);if(!current)return;const updated={...value,installment_count:current.installment_count,installment_number:current.installment_number,recurrence:current.recurrence,recurrence_months:current.recurrence_months};if(owner){const r=await supabase.from('transactions').update(updated).eq('id',id).eq('user_id',owner).select('id').single();if(r.error)throw r.error;}if(same(owner))setTransactions(c=>c.map(t=>t.id===id?{...t,...updated}:t));}
 async function togglePaid(id:string){const owner=identity(),current=transactions.find(t=>t.id===id);if(!current)return;const status=current.status==='paid'?'pending':'paid';if(owner){const r=await supabase.from('transactions').update({status}).eq('id',id).eq('user_id',owner).select('id').single();if(r.error)throw r.error;}if(same(owner))setTransactions(c=>c.map(t=>t.id===id?{...t,status}:t));}
 async function markManyPaid(ids:string[]){const owner=identity();if(!ids.length)return;if(owner){const r=await supabase.from('transactions').update({status:'paid'}).in('id',ids).eq('user_id',owner).select('id');if(r.error)throw r.error;if(r.data.length!==new Set(ids).size)throw new Error('Fatura não encontrada.');}if(same(owner))setTransactions(c=>c.map(t=>ids.includes(t.id)?{...t,status:'paid'}:t));}
 async function removeTransaction(id:string,scope:'single'|'series'='single'){
  const owner=identity(),current=transactions.find(t=>t.id===id);if(!current)return;const root=current.parent_id??id;const replacement=transactions.find(t=>t.id!==id&&t.parent_id===root);
  if(owner){if(scope==='single'&&id===root&&replacement){const r=await supabase.from('transactions').update({parent_id:replacement.id}).eq('parent_id',root).eq('user_id',owner);if(r.error)throw r.error;}const q=supabase.from('transactions').delete().eq('user_id',owner);const r=scope==='series'?await q.or(`id.eq.${root},parent_id.eq.${root}`):await q.eq('id',id);if(r.error){void load();throw r.error;}}
  if(same(owner))setTransactions(c=>scope==='series'?c.filter(t=>t.id!==root&&t.parent_id!==root):c.filter(t=>t.id!==id).map(t=>id===root&&replacement&&t.parent_id===root?{...t,parent_id:replacement.id}:t));
 }
 async function removeCard(id:string){const owner=identity();if(transactions.some(t=>t.card_id===id))throw new Error('CARD_HAS_TRANSACTIONS');if(owner){const r=await supabase.from('cards').delete().eq('id',id).eq('user_id',owner).select('id').single();if(r.error)throw r.error;}if(same(owner))setCards(c=>c.filter(t=>t.id!==id));}
 return <FinanceContext.Provider value={{cards,incomes,transactions,signedIn:!!userId,userId,loading,loadError,reload:load,selectedMonth,setSelectedMonth,hideValues,toggleHideValues,money,addCard,updateCard,addIncome,updateIncome,removeIncome,addTransaction,updateTransaction,togglePaid,markManyPaid,removeTransaction,removeCard,exportAll:()=>({cards,incomes,transactions})}}>{children}</FinanceContext.Provider>;
}
export function useFinance(){const context=useContext(FinanceContext);if(!context)throw new Error('useFinance must be used inside FinanceProvider');return context;}
