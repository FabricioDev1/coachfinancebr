import type { FinanceCard,FinanceIncome,FinanceTransaction } from './finance-data';
import { monthRange, clampDay } from './dates';
export const sumMoney = (rows: {amount:number}[]) => rows.reduce((sum,r)=>sum+Math.round(r.amount*100),0)/100;
const rounded=(v:number)=>Math.round(v*100)/100;
export function monthSummary(incomes: FinanceIncome[],transactions: FinanceTransaction[],month: string,today: string) {
 const {end}=monthRange(month); const revenues=incomes.filter(i=>!i.is_reserve&&i.reference_month.startsWith(month)); const incomeTransactions=transactions.filter(t=>t.transaction_type==='income'&&t.due_date.startsWith(month));
 const receivedIncome=rounded(sumMoney(revenues.filter(i=>i.status==='received'))+sumMoney(incomeTransactions.filter(i=>i.status==='paid')));
 const expectedIncome=rounded(sumMoney(revenues.filter(i=>i.status==='expected'))+sumMoney(incomeTransactions.filter(i=>i.status==='pending')));
 const expenseItems=transactions.filter(t=>t.transaction_type==='expense'&&t.due_date.startsWith(month));
 const expenses=sumMoney(expenseItems),paidExpenses=sumMoney(expenseItems.filter(t=>t.status==='paid')),pendingExpenses=sumMoney(expenseItems.filter(t=>t.status==='pending'));
 const overdueItems=transactions.filter(t=>t.transaction_type==='expense'&&t.status==='pending'&&t.due_date<today);
 const grouped=new Map<string,number>(); for(const t of expenseItems)grouped.set(t.category,(grouped.get(t.category)??0)+Math.round(t.amount*100));
 return {receivedIncome,expectedIncome,expenses,paidExpenses,pendingExpenses,creditExpenses:sumMoney(expenseItems.filter(t=>t.payment_method==='credit')),instantExpenses:sumMoney(expenseItems.filter(t=>['pix','debit','cash'].includes(t.payment_method))),overdue:{items:overdueItems,total:sumMoney(overdueItems)},availableNow:rounded(receivedIncome-paidExpenses),canSpend:rounded(receivedIncome+expectedIncome-expenses),futureCommitted:sumMoney(transactions.filter(t=>t.transaction_type==='expense'&&t.status==='pending'&&t.due_date>end)),reserveTotal:sumMoney(incomes.filter(i=>i.is_reserve&&i.status==='received'&&i.reference_month<=end)),byCategory:[...grouped].map(([category,cents])=>({category,value:cents/100})).filter(i=>i.value>0).sort((a,b)=>b.value-a.value)};
}
export function cardSummary(card: FinanceCard,transactions: FinanceTransaction[],month: string) {
 const items=transactions.filter(t=>t.card_id===card.id&&t.transaction_type==='expense'); const invoiceItems=items.filter(t=>t.due_date.startsWith(month)); const usedLimit=sumMoney(items.filter(t=>t.status==='pending')); const [y=0,m=1]=month.split('-').map(Number);
 return {dueDate:`${month}-${String(clampDay(y,m,card.due_day)).padStart(2,'0')}`,invoiceItems,invoiceTotal:sumMoney(invoiceItems),invoicePaid:invoiceItems.length>0&&invoiceItems.every(t=>t.status==='paid'),nextInvoices:sumMoney(items.filter(t=>t.status==='pending'&&t.due_date>monthRange(month).end)),usedLimit,availableLimit:Math.max(0,rounded(card.credit_limit-usedLimit)),usagePercent:card.credit_limit>0?Math.min(100,usedLimit/card.credit_limit*100):0};
}
