import {describe,expect,it} from 'vitest';
import {validateAssistant,INCOME_REFUSAL} from './assistant-drafts';
const cards=[{id:'c1',name:'Nubank'}];const cats=[{name:'Outros',kind:'both'},{name:'Mercado',kind:'expense'}];
const base={description:'Mercado',amount:85.9,payment_method:'pix',category:'Mercado',issue_date:'2026-11-04',installment_count:1};
const run=(d:object)=>validateAssistant({type:'drafts',drafts:[{...base,...d}]},cards,cats,'2026-11-05');
describe('assistente',()=>{
 it('recusa cartão de outro usuário',()=>{expect(run({payment_method:'credit',card_id:'outro'}).kind).toBe('question');});
 it('categoria inexistente vira Outros',()=>{const r=run({category:'Inexistente'});expect(r.kind==='drafts'&&r.drafts[0]!.category).toBe('Outros');});
 it('recusa valor zero',()=>{expect(run({amount:0}).kind).toBe('question');});
 it('recusa mais de 120 parcelas',()=>{expect(run({installment_count:121}).kind).toBe('question');});
 it('recusa receita',()=>{const r=validateAssistant({type:'income'},cards,cats,'2026-11-05');expect(r.kind==='question'&&r.question).toBe(INCOME_REFUSAL);});
 it('aceita cartão pelo nome sem acento/caixa',()=>{const r=run({payment_method:'credit',card_name:'NUBANK'});expect(r.kind==='drafts'&&r.drafts[0]!.card_id).toBe('c1');});
});
