import {createServerFn} from '@tanstack/react-start';
import {z} from 'zod';
import {requireSupabaseAuth} from '@/integrations/supabase/auth-middleware';
import {validateAssistant,type AssistantResult,type RawAssistant} from './assistant-drafts';

export const LIMIT_MESSAGE='Limite diário do assistente atingido; use o Novo lançamento';
const tool={type:'function' as const,function:{name:'responder',description:'Devolve rascunhos de despesa, uma pergunta de esclarecimento, ou type=income se o usuário pediu uma receita.',parameters:{type:'object',properties:{
 type:{type:'string',enum:['drafts','question','income']},
 question:{type:'string'},
 drafts:{type:'array',maxItems:5,items:{type:'object',properties:{description:{type:'string'},amount:{type:'number'},payment_method:{type:'string',enum:['credit','debit','pix','cash']},card_id:{type:'string'},card_name:{type:'string'},category:{type:'string'},issue_date:{type:'string',description:'YYYY-MM-DD'},installment_count:{type:'integer'},recurrence:{type:'string',enum:['none','monthly']},recurrence_months:{type:'integer'}},required:['description','amount','payment_method','category','issue_date']}},
},required:['type']}}};

export const interpretExpense=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator((d)=>z.object({text:z.string().trim().min(2).max(500)}).parse(d))
 .handler(async({data,context}):Promise<AssistantResult|{kind:'limit';message:string}|{kind:'error';message:string}>=>{
  const {supabase,userId}=context;
  const quota=await supabase.rpc('consume_assistant_quota',{p_limit:30});
  if(quota.error)return {kind:'error',message:'Não foi possível usar o assistente agora.'};
  if(!quota.data)return {kind:'limit',message:LIMIT_MESSAGE};
  const [cardsRes,catsRes]=await Promise.all([supabase.from('cards').select('id,name').eq('user_id',userId),supabase.from('categories').select('name,kind').eq('user_id',userId)]);
  if(cardsRes.error||catsRes.error)return {kind:'error',message:'Não foi possível carregar seus dados.'};
  const cards=cardsRes.data??[],cats=(catsRes.data??[]).filter(c=>c.kind==='expense'||c.kind==='both');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
  const system=`Você interpreta frases em português e monta DESPESAS. Hoje é ${today} (America/Sao_Paulo). Cartões do usuário: ${JSON.stringify(cards)}. Categorias: ${JSON.stringify(cats.map(c=>c.name))}.
Regras: data padrão hoje; entenda "ontem", "dia 3" (mês atual) etc. "em 3x" = installment_count 3. "todo mês" = recurrence monthly (recurrence_months 12 se não dito). Categoria: escolha da lista; na dúvida "Outros". payment_method: cartão/crédito=credit, débito=debit, pix=pix, dinheiro=cash. Se a forma de pagamento não for dita, ou o cartão citado não estiver na lista, NÃO chute: type=question com uma pergunta curta. Para credit, informe card_id e card_name da lista. Se for receita (salário, recebi etc.), type=income. Até 5 despesas.`;
  try{
   const {generateChatCompletion}=await import('@lovable.dev/ai-gateway');
   const res=await generateChatCompletion({model:'google/gemini-3.1-flash-lite',messages:[{role:'system',content:system},{role:'user',content:data.text}],tools:[tool],tool_choice:{type:'function',function:{name:'responder'}}});
   const args=res.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
   let raw:RawAssistant={};try{raw=args?JSON.parse(args):{};}catch{raw={};}
   return validateAssistant(raw,cards,catsRes.data??[],today);
  }catch(e){
   const status=(e as {httpStatus?:number}).httpStatus;
   return {kind:'error',message:status===429?'Muitas solicitações; tente em instantes.':status===402?'Créditos de IA esgotados.':'Não foi possível interpretar agora.'};
  }
 });
