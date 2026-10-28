const pad = (n: number) => String(n).padStart(2, "0");
export function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
export function currentMonthKey() { return todayISO().slice(0,7); }
export function daysInMonth(year: number, month: number) { return new Date(year, month, 0).getDate(); }
export function clampDay(year: number, month: number, day: number) { return Math.max(1, Math.min(day, daysInMonth(year, month))); }
export function shiftMonthKey(key: string, n: number) { const [year = 0, month = 1] = key.split('-').map(Number); const total = year*12+month-1+n; return `${Math.floor(total/12)}-${pad(((total%12)+12)%12+1)}`; }
export function addMonthsISO(iso: string, n: number) { const key = shiftMonthKey(iso.slice(0,7),n); const [year=0, month=1] = key.split('-').map(Number); return `${key}-${pad(clampDay(year,month,Number(iso.slice(8,10))))}`; }
export function monthRange(key: string) { const [year=0,month=1] = key.split('-').map(Number); return {start:`${key}-01`,end:`${key}-${pad(daysInMonth(year,month))}`}; }
function labelDate(key: string) { const [year=0,month=1] = key.split('-').map(Number); return new Date(year,month-1,1,12); }
export function monthLabel(key: string) { const text = new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(labelDate(key)).replace(' de ',' '); return text.charAt(0).toUpperCase()+text.slice(1); }
export function monthShortLabel(key: string) { const text=new Intl.DateTimeFormat('pt-BR',{month:'short'}).format(labelDate(key)).replace('.',''); return `${text.charAt(0).toUpperCase()+text.slice(1)}/${key.slice(2,4)}`; }
export function formatDateBR(iso: string) { return iso.slice(0,10).split('-').reverse().join('/'); }
export function isBefore(a: string,b: string) { return a<b; }
export function addDaysISO(iso: string,n: number) { const [y=0,m=1,d=1]=iso.split('-').map(Number); const date=new Date(y,m-1,d+n,12); return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`; }
