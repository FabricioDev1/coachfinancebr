import type {FinanceCard,FinanceTransaction} from './finance-data';
import {addMonthsISO} from './dates';
import {invoiceDueDate} from './card-invoice';
import {splitInCents} from './installments';
export type NewTransaction=Omit<FinanceTransaction,'id'|'parent_id'|'installment_number'>;
export function transactionRows(value:NewTransaction,cards:FinanceCard[]):FinanceTransaction[] {
 const card=cards.find(c=>c.id===value.card_id); if(value.payment_method==='credit'&&!card)throw new Error('Selecione um cartão válido.');
 if(!Number.isFinite(value.amount)||value.amount<=0)throw new Error('Informe um valor maior que zero.');
 if(value.installment_count>1&&value.recurrence!=='none')throw new Error('Parcelas e recorrência não podem ser combinadas.');
 const count=value.recurrence==='indefinite'?12:value.recurrence==='monthly'?(value.recurrence_months??12):value.installment_count;
 if(!Number.isInteger(count)||count<1||count>120)throw new Error('Informe de 1 a 120 meses ou parcelas.');
 const amounts=value.recurrence==='none'?splitInCents(value.amount,count):Array.from({length:count},()=>Math.round(value.amount*100)/100);
 const baseDue=card?invoiceDueDate(value.issue_date,card.closing_day,card.due_day):value.due_date;
 const root=crypto.randomUUID();return amounts.map((amount,i)=>({...value,amount,id:i===0?root:crypto.randomUUID(),parent_id:count>1||value.recurrence!=='none'?root:null,issue_date:addMonthsISO(value.issue_date,i),due_date:addMonthsISO(baseDue,i),status:i===0?value.status:'pending',installment_count:value.recurrence==='none'?count:1,installment_number:value.recurrence==='none'?i+1:1,recurrence_months:value.recurrence==='monthly'?count:value.recurrence_months}));
}
export function extendIndefinite(rows:FinanceTransaction[],today:string):FinanceTransaction[][] {
 const groups=new Map<string,FinanceTransaction[]>();for(const t of rows)if(t.recurrence==='indefinite'&&t.parent_id)groups.set(t.parent_id,[...(groups.get(t.parent_id)??[]),t]);
 const batches:FinanceTransaction[][]=[];
 for(const [root,items] of groups){items.sort((a,b)=>a.due_date.localeCompare(b.due_date));const first=items[0],last=items.at(-1);if(!first||!last||last.due_date>=addMonthsISO(today,6))continue;
 const target=addMonthsISO(today,12);const [fy=0,fm=1]=first.due_date.split('-').map(Number),[ly=0,lm=1]=last.due_date.split('-').map(Number);let offset=(ly-fy)*12+lm-fm+1;const added:FinanceTransaction[]=[];
 while(addMonthsISO(first.due_date,offset)<=target){added.push({...first,id:crypto.randomUUID(),parent_id:root,issue_date:addMonthsISO(first.issue_date,offset),due_date:addMonthsISO(first.due_date,offset),status:'pending'});offset++;if(added.length>120)break;}
 if(added.length)batches.push(added);
 }return batches;
}
