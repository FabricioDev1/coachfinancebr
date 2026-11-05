import {foldName} from './categories';

export type AssistantDraft={description:string;amount:number;payment_method:'credit'|'debit'|'pix'|'cash';card_id:string|null;category:string;issue_date:string;installment_count:number;recurrence:'none'|'monthly';recurrence_months:number|null};
export type AssistantResult={kind:'drafts';drafts:AssistantDraft[]}|{kind:'question';question:string};
type RawDraft={description?:unknown;amount?:unknown;payment_method?:unknown;card_id?:unknown;card_name?:unknown;category?:unknown;issue_date?:unknown;installment_count?:unknown;recurrence?:unknown;recurrence_months?:unknown};
export type RawAssistant={type?:unknown;drafts?:unknown;question?:unknown};

export const INCOME_REFUSAL='Por enquanto o assistente aceita apenas despesas. Lance receitas pela tela normal.';
const methods=['credit','debit','pix','cash'];
function validDate(v:unknown):v is string{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split('-').map(Number);const dt=new Date(y!,m!-1,d!);return dt.getFullYear()===y&&dt.getMonth()===m!-1&&dt.getDate()===d;}

/** Valida a saída da IA contra os cartões/categorias do usuário autenticado. Nunca grava nada. */
export function validateAssistant(raw:RawAssistant,cards:{id:string;name:string}[],categories:{name:string;kind:string}[],today:string):AssistantResult{
 if(raw.type==='income')return {kind:'question',question:INCOME_REFUSAL};
 if(raw.type==='question'||!Array.isArray(raw.drafts)||!raw.drafts.length)return {kind:'question',question:typeof raw.question==='string'&&raw.question.trim()?raw.question.trim().slice(0,300):'Não entendi. Pode descrever a despesa com valor e forma de pagamento?'};
 const expenseCats=categories.filter(c=>c.kind==='expense'||c.kind==='both');
 const drafts:AssistantDraft[]=[];
 for(const d of (raw.drafts as RawDraft[]).slice(0,5)){
  const description=typeof d.description==='string'?d.description.trim().slice(0,120):'';
  if(!description)return {kind:'question',question:'Qual é a descrição da despesa?'};
  const amount=Math.round(Number(d.amount)*100)/100;
  if(!Number.isFinite(amount)||amount<=0)return {kind:'question',question:`Qual é o valor de "${description}"?`};
  if(typeof d.payment_method!=='string'||!methods.includes(d.payment_method))return {kind:'question',question:`Qual foi a forma de pagamento de "${description}"? (cartão, débito, Pix ou dinheiro)`};
  const method=d.payment_method as AssistantDraft['payment_method'];
  let card_id:string|null=null;
  if(method==='credit'){
   const byId=cards.find(c=>c.id===d.card_id);const byName=typeof d.card_name==='string'?cards.find(c=>foldName(c.name)===foldName(d.card_name as string)):undefined;
   const card=byId??byName;
   if(!card)return {kind:'question',question:`Em qual cartão foi "${description}"? Seus cartões: ${cards.map(c=>c.name).join(', ')||'nenhum cadastrado'}.`};
   card_id=card.id;
  }
  const cat=expenseCats.find(c=>typeof d.category==='string'&&foldName(c.name)===foldName(d.category))??expenseCats.find(c=>foldName(c.name)==='outros');
  if(!cat)return {kind:'question',question:'Não encontrei a categoria. Qual categoria devo usar?'};
  const issue_date=d.issue_date==null||d.issue_date===''?today:d.issue_date;
  if(!validDate(issue_date))return {kind:'question',question:`Qual é a data de "${description}"?`};
  const recurrence=d.recurrence==='monthly'?'monthly':'none';
  const installment_count=recurrence==='monthly'?1:Number(d.installment_count??1);
  const recurrence_months=recurrence==='monthly'?Number(d.recurrence_months??12):null;
  if(!Number.isInteger(installment_count)||installment_count<1||installment_count>120)return {kind:'question',question:'Informe de 1 a 120 parcelas.'};
  if(recurrence_months!==null&&(!Number.isInteger(recurrence_months)||recurrence_months<1||recurrence_months>120))return {kind:'question',question:'Informe de 1 a 120 meses.'};
  drafts.push({description,amount,payment_method:method,card_id,category:cat.name,issue_date,installment_count,recurrence,recurrence_months});
 }
 return {kind:'drafts',drafts};
}
