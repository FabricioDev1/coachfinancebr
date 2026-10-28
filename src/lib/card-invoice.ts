import { clampDay, shiftMonthKey } from './dates';
// Fecha 8/vence17: compra 07/10 =>17/10; 08/10=>17/11.
// Fecha25/vence5: compra20/10=>05/11;26/10=>05/12.
// Fecha31/vence10: compra27/02=>10/03;28/02=>10/04 (fevereiro não bissexto).
export function invoiceDueDate(purchase: string, closingDay: number, dueDay: number) {
  const key=purchase.slice(0,7); const [y=0,m=1]=key.split('-').map(Number);
  const closingMonth=shiftMonthKey(key,Number(purchase.slice(8,10))<clampDay(y,m,closingDay)?0:1);
  const dueMonth=shiftMonthKey(closingMonth,dueDay>closingDay?0:1);
  const [dy=0,dm=1]=dueMonth.split('-').map(Number);
  return `${dueMonth}-${String(clampDay(dy,dm,dueDay)).padStart(2,'0')}`;
}
export function invoiceMonthKey(purchase: string,closingDay: number,dueDay: number) { return invoiceDueDate(purchase,closingDay,dueDay).slice(0,7); }
